import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/db/supabase'

export async function POST(req: NextRequest) {
  const { url, project_id, tags } = await req.json()
  if (!url) return NextResponse.json({ error: 'Missing URL' }, { status: 400 })

  const fullMatch = url.match(/tiktok\.com\/@([^/]+)\/video\/(\d+)/)
  if (!fullMatch) return NextResponse.json({ error: 'Используй полную ссылку: https://www.tiktok.com/@username/video/123456' }, { status: 400 })

  const username = fullMatch[1]
  const videoId = fullMatch[2]

  let oembedData: any = null
  try {
    const oembedRes = await fetch(
      `https://www.tiktok.com/oembed?url=https://www.tiktok.com/@${username}/video/${videoId}`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (oembedRes.ok) oembedData = await oembedRes.json()
  } catch (e) {}

  const db = getServiceClient()

  const { data: existingAccount } = await db.from('accounts').select('*').eq('platform', 'tiktok').eq('username', username).single()
  let account = existingAccount

  if (!account) {
    const { data: newAccount } = await db.from('accounts').insert({
      project_id: project_id || null,
      platform: 'tiktok',
      platform_user_id: username,
      username,
      access_token: 'manual',
      followers_count: 0,
    }).select().single()
    account = newAccount
  }

  if (project_id && account.project_id !== project_id) {
    await db.from('accounts').update({ project_id }).eq('id', account.id)
  }

  const postData = {
    account_id: account.id,
    platform_post_id: videoId,
    platform: 'tiktok' as const,
    post_type: 'tiktok_video' as const,
    caption: oembedData?.title || null,
    thumbnail_url: oembedData?.thumbnail_url || null,
    permalink: `https://www.tiktok.com/@${username}/video/${videoId}`,
    views_count: 0, likes_count: 0, comments_count: 0,
    shares_count: 0, saves_count: 0, reach_count: 0, impressions_count: 0,
    tags: tags || [],
    last_synced_at: new Date().toISOString(),
  }

  const { data: existing } = await db.from('posts').select('id').eq('platform', 'tiktok').eq('platform_post_id', videoId).single()

  if (existing) {
    await db.from('posts').update(postData).eq('id', existing.id)
  } else {
    await db.from('posts').insert(postData)
  }

  const { data: post } = await db.from('posts').select('*, account:accounts(*, project:projects(*))').eq('platform_post_id', videoId).single()

  return NextResponse.json({ post })
}
