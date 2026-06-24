import { getServiceClient } from '../db/supabase'
import type { Account, Post, TikTokVideo, SyncResult } from '@/types'

const TIKTOK_AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize'
const TIKTOK_TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/'
const TIKTOK_API_URL = 'https://open.tiktokapis.com/v2'

// Step 1: Generate OAuth URL
export function getTikTokAuthUrl(projectId: string): string {
  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY!,
    scope: 'user.info.basic,video.list',
    response_type: 'code',
    redirect_uri: process.env.TIKTOK_REDIRECT_URI!,
    state: projectId, // Pass project ID through state
  })
  return `${TIKTOK_AUTH_URL}?${params}`
}

// Step 2: Exchange code for token
export async function exchangeTikTokCode(code: string): Promise<{
  access_token: string
  refresh_token: string
  open_id: string
  expires_in: number
  refresh_expires_in: number
}> {
  const res = await fetch(TIKTOK_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.TIKTOK_REDIRECT_URI!,
    }),
  })
  if (!res.ok) throw new Error(`TikTok token exchange failed: ${await res.text()}`)
  const data = await res.json()
  return data.data
}

// Refresh TikTok token
export async function refreshTikTokToken(refreshToken: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
}> {
  const res = await fetch(TIKTOK_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })
  if (!res.ok) throw new Error(`TikTok token refresh failed`)
  const data = await res.json()
  return data.data
}

// Get TikTok user info
async function getTikTokUser(token: string): Promise<{
  open_id: string
  union_id: string
  avatar_url: string
  display_name: string
  follower_count: number
}> {
  const res = await fetch(`${TIKTOK_API_URL}/user/info/?fields=open_id,union_id,avatar_url,display_name,follower_count`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Failed to get TikTok user`)
  const data = await res.json()
  return data.data.user
}

// Get TikTok videos
async function getTikTokVideos(token: string): Promise<TikTokVideo[]> {
  const fields = [
    'id', 'title', 'video_description', 'cover_image_url',
    'share_url', 'create_time', 'duration',
    'like_count', 'comment_count', 'share_count', 'view_count',
  ].join(',')

  const results: TikTokVideo[] = []
  let cursor: number | undefined

  for (let page = 0; page < 4; page++) {
    const body: Record<string, unknown> = {
      max_count: 20,
      fields: fields.split(','),
    }
    if (cursor) body.cursor = cursor

    const res = await fetch(`${TIKTOK_API_URL}/video/list/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) break
    const data = await res.json()
    results.push(...(data.data?.videos || []))

    if (!data.data?.has_more) break
    cursor = data.data.cursor
  }

  return results
}

// Main sync function
export async function syncTikTokAccount(account: Account): Promise<SyncResult> {
  const db = getServiceClient()
  const result: SyncResult = {
    account_id: account.id,
    username: account.username,
    platform: 'tiktok',
    posts_synced: 0,
    errors: [],
  }

  try {
    let token = account.access_token

    // Check token expiry
    if (account.token_expires_at && account.refresh_token) {
      const expiresAt = new Date(account.token_expires_at)
      if (expiresAt.getTime() - Date.now() < 60 * 60 * 1000) {
        try {
          const refreshed = await refreshTikTokToken(account.refresh_token)
          token = refreshed.access_token
          await db.from('accounts').update({
            access_token: token,
            refresh_token: refreshed.refresh_token,
            token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
          }).eq('id', account.id)
        } catch (e) {
          result.errors.push('Token refresh failed')
        }
      }
    }

    const videos = await getTikTokVideos(token)

    for (const video of videos) {
      try {
        const postData = {
          account_id: account.id,
          platform_post_id: video.id,
          platform: 'tiktok' as const,
          post_type: 'tiktok_video' as const,
          caption: video.video_description || video.title || null,
          thumbnail_url: video.cover_image_url || null,
          permalink: video.share_url,
          published_at: new Date(video.create_time * 1000).toISOString(),
          views_count: video.view_count || 0,
          likes_count: video.like_count || 0,
          comments_count: video.comment_count || 0,
          shares_count: video.share_count || 0,
          saves_count: 0,
          reach_count: 0,
          impressions_count: 0,
          last_synced_at: new Date().toISOString(),
        }

        const { data: existingPost } = await db
          .from('posts')
          .select('id, views_count, likes_count, comments_count, shares_count')
          .eq('platform', 'tiktok')
          .eq('platform_post_id', video.id)
          .single()

        if (existingPost) {
          await db.from('metrics_snapshots').insert({
            post_id: existingPost.id,
            views_count: existingPost.views_count,
            likes_count: existingPost.likes_count,
            comments_count: existingPost.comments_count,
            shares_count: existingPost.shares_count,
            saves_count: 0,
            reach_count: 0,
          })
          await db.from('posts').update(postData).eq('id', existingPost.id)
        } else {
          await db.from('posts').insert(postData)
        }

        result.posts_synced++
      } catch (e) {
        result.errors.push(`Failed to sync video ${video.id}: ${e}`)
      }
    }

    await db.from('accounts').update({
      last_synced_at: new Date().toISOString(),
    }).eq('id', account.id)

  } catch (e) {
    result.errors.push(`Account sync failed: ${e}`)
  }

  return result
}

// Save new account after OAuth
export async function saveTikTokAccount(
  projectId: string,
  code: string
): Promise<Account> {
  const db = getServiceClient()

  const tokens = await exchangeTikTokCode(code)
  const user = await getTikTokUser(tokens.access_token)

  const accountData = {
    project_id: projectId,
    platform: 'tiktok' as const,
    platform_user_id: user.open_id,
    username: user.display_name,
    avatar_url: user.avatar_url || null,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    followers_count: user.follower_count || 0,
  }

  const { data, error } = await db
    .from('accounts')
    .upsert(accountData, { onConflict: 'platform,platform_user_id' })
    .select()
    .single()

  if (error) throw error
  return data
}
