import { getServiceClient } from '../db/supabase'
import type { Account, Post, IGMedia, SyncResult } from '@/types'

const IG_GRAPH_URL = 'https://graph.instagram.com/v19.0'
const META_AUTH_URL = 'https://api.instagram.com/oauth/authorize'
const META_TOKEN_URL = 'https://api.instagram.com/oauth/access_token'
const META_LONG_LIVED_URL = 'https://graph.instagram.com/access_token'

// Step 1: Generate OAuth URL
export function getInstagramAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!,
    redirect_uri: process.env.INSTAGRAM_REDIRECT_URI!,
    scope: [
      'instagram_basic',
      'instagram_content_publish',
      'instagram_manage_insights',
      'pages_show_list',
      'pages_read_engagement',
    ].join(','),
    response_type: 'code',
  })
  return `${META_AUTH_URL}?${params}`
}

// Step 2: Exchange code for token
export async function exchangeInstagramCode(code: string): Promise<{
  access_token: string
  user_id: string
}> {
  const res = await fetch(META_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.INSTAGRAM_APP_ID!,
      client_secret: process.env.INSTAGRAM_APP_SECRET!,
      grant_type: 'authorization_code',
      redirect_uri: process.env.INSTAGRAM_REDIRECT_URI!,
      code,
    }),
  })
  if (!res.ok) throw new Error(`Instagram token exchange failed: ${await res.text()}`)
  return res.json()
}

// Step 3: Get long-lived token (60 days)
export async function getLongLivedToken(shortToken: string): Promise<{
  access_token: string
  token_type: string
  expires_in: number
}> {
  const params = new URLSearchParams({
    grant_type: 'ig_exchange_token',
    client_secret: process.env.INSTAGRAM_APP_SECRET!,
    access_token: shortToken,
  })
  const res = await fetch(`${META_LONG_LIVED_URL}?${params}`)
  if (!res.ok) throw new Error(`Long-lived token failed: ${await res.text()}`)
  return res.json()
}

// Refresh long-lived token
export async function refreshInstagramToken(token: string): Promise<string> {
  const params = new URLSearchParams({
    grant_type: 'ig_refresh_token',
    access_token: token,
  })
  const res = await fetch(`${META_LONG_LIVED_URL}?${params}`)
  if (!res.ok) throw new Error(`Token refresh failed`)
  const data = await res.json()
  return data.access_token
}

// Get Instagram user info
async function getIGUser(token: string): Promise<{
  id: string
  username: string
  profile_picture_url?: string
  followers_count?: number
}> {
  const params = new URLSearchParams({
    fields: 'id,username,profile_picture_url,followers_count',
    access_token: token,
  })
  const res = await fetch(`${IG_GRAPH_URL}/me?${params}`)
  if (!res.ok) throw new Error(`Failed to get IG user`)
  return res.json()
}

// Get media list
async function getIGMedia(userId: string, token: string): Promise<IGMedia[]> {
  const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count'
  const params = new URLSearchParams({
    fields,
    limit: '50',
    access_token: token,
  })

  const results: IGMedia[] = []
  let url = `${IG_GRAPH_URL}/${userId}/media?${params}`

  // Paginate — fetch up to 200 posts
  for (let page = 0; page < 4; page++) {
    const res = await fetch(url)
    if (!res.ok) break
    const data = await res.json()
    results.push(...(data.data || []))
    if (!data.paging?.next) break
    url = data.paging.next
  }

  return results
}

// Get insights for a single media
async function getIGMediaInsights(
  mediaId: string,
  mediaType: string,
  token: string
): Promise<Record<string, number>> {
  let metrics: string[]

  if (mediaType === 'VIDEO' || mediaType === 'REEL') {
    metrics = ['plays', 'likes', 'comments', 'shares', 'saved', 'reach', 'impressions']
  } else {
    metrics = ['likes', 'comments', 'shares', 'saved', 'reach', 'impressions']
  }

  const params = new URLSearchParams({
    metric: metrics.join(','),
    access_token: token,
  })

  const res = await fetch(`${IG_GRAPH_URL}/${mediaId}/insights?${params}`)
  if (!res.ok) return {}

  const data = await res.json()
  const result: Record<string, number> = {}

  for (const item of data.data || []) {
    result[item.name] = item.values?.[0]?.value ?? item.value ?? 0
  }

  return result
}

// Map IG media_type to our post_type
function mapIGMediaType(mediaType: string): Post['post_type'] {
  switch (mediaType) {
    case 'REEL': return 'reel'
    case 'CAROUSEL_ALBUM': return 'carousel'
    case 'VIDEO': return 'reel'
    default: return 'image'
  }
}

// Main sync function
export async function syncInstagramAccount(account: Account): Promise<SyncResult> {
  const db = getServiceClient()
  const result: SyncResult = {
    account_id: account.id,
    username: account.username,
    platform: 'instagram',
    posts_synced: 0,
    errors: [],
  }

  try {
    // Check and refresh token if needed
    let token = account.access_token
    if (account.token_expires_at) {
      const expiresAt = new Date(account.token_expires_at)
      const daysLeft = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      if (daysLeft < 7) {
        try {
          token = await refreshInstagramToken(token)
          await db.from('accounts').update({
            access_token: token,
            token_expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          }).eq('id', account.id)
        } catch (e) {
          result.errors.push('Token refresh failed, using existing token')
        }
      }
    }

    // Get media
    const media = await getIGMedia(account.platform_user_id, token)

    for (const item of media) {
      try {
        const insights = await getIGMediaInsights(item.id, item.media_type, token)

        const postData = {
          account_id: account.id,
          platform_post_id: item.id,
          platform: 'instagram' as const,
          post_type: mapIGMediaType(item.media_type),
          caption: item.caption || null,
          thumbnail_url: item.thumbnail_url || item.media_url || null,
          permalink: item.permalink,
          published_at: item.timestamp,
          views_count: insights['plays'] || insights['video_views'] || 0,
          likes_count: item.like_count || insights['likes'] || 0,
          comments_count: item.comments_count || insights['comments'] || 0,
          shares_count: insights['shares'] || 0,
          saves_count: insights['saved'] || 0,
          reach_count: insights['reach'] || 0,
          impressions_count: insights['impressions'] || 0,
          last_synced_at: new Date().toISOString(),
        }

        const { data: existingPost } = await db
          .from('posts')
          .select('id, views_count')
          .eq('platform', 'instagram')
          .eq('platform_post_id', item.id)
          .single()

        if (existingPost) {
          // Save snapshot before updating
          await db.from('metrics_snapshots').insert({
            post_id: existingPost.id,
            views_count: existingPost.views_count,
            likes_count: postData.likes_count,
            comments_count: postData.comments_count,
            shares_count: postData.shares_count,
            saves_count: postData.saves_count,
            reach_count: postData.reach_count,
          })
          await db.from('posts').update(postData).eq('id', existingPost.id)
        } else {
          await db.from('posts').insert(postData)
        }

        result.posts_synced++
      } catch (e) {
        result.errors.push(`Failed to sync post ${item.id}: ${e}`)
      }
    }

    // Update account last sync
    await db.from('accounts').update({
      last_synced_at: new Date().toISOString(),
    }).eq('id', account.id)

  } catch (e) {
    result.errors.push(`Account sync failed: ${e}`)
  }

  return result
}

// Save new account after OAuth
export async function saveInstagramAccount(
  projectId: string,
  code: string
): Promise<Account> {
  const db = getServiceClient()

  const { access_token: shortToken } = await exchangeInstagramCode(code)
  const { access_token: longToken, expires_in } = await getLongLivedToken(shortToken)
  const user = await getIGUser(longToken)

  const accountData = {
    project_id: projectId,
    platform: 'instagram' as const,
    platform_user_id: user.id,
    username: user.username,
    avatar_url: user.profile_picture_url || null,
    access_token: longToken,
    token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
    followers_count: user.followers_count || 0,
  }

  const { data, error } = await db
    .from('accounts')
    .upsert(accountData, { onConflict: 'platform,platform_user_id' })
    .select()
    .single()

  if (error) throw error
  return data
}
