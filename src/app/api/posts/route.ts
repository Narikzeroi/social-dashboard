import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/db/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const project_id = searchParams.get('project_id')
  const platform = searchParams.get('platform')
  const post_type = searchParams.get('post_type')
  const keyword = searchParams.get('keyword')
  const tag = searchParams.get('tag')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const sort = searchParams.get('sort') || 'published_at'
  const order = searchParams.get('order') || 'desc'
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  const db = getServiceClient()

  let query = db
    .from('posts')
    .select(`
      *,
      account:accounts(
        id, username, platform, avatar_url, project_id,
        project:projects(id, name, color)
      )
    `, { count: 'exact' })

  if (project_id) {
    query = query.eq('account.project_id', project_id)
  }
  if (platform) {
    query = query.eq('platform', platform)
  }
  if (post_type) {
    query = query.eq('post_type', post_type)
  }
  if (keyword) {
    query = query.ilike('caption', `%${keyword}%`)
  }
  if (tag) {
    query = query.contains('tags', [tag])
  }
  if (from) {
    query = query.gte('published_at', from)
  }
  if (to) {
    query = query.lte('published_at', to)
  }

  query = query
    .order(sort, { ascending: order === 'asc' })
    .range(offset, offset + limit - 1)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ posts: data, total: count })
}

// PATCH /api/posts — update tags/notes on a post
export async function PATCH(req: NextRequest) {
  const { id, tags, notes } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const db = getServiceClient()
  const { data, error } = await db
    .from('posts')
    .update({ tags, notes })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
