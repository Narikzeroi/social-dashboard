import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/db/supabase'
import { getInstagramAuthUrl } from '@/lib/api/instagram'
import { getTikTokAuthUrl } from '@/lib/api/tiktok'

// GET /api/accounts — list all accounts with project info
export async function GET(req: NextRequest) {
  const db = getServiceClient()
  const { searchParams } = new URL(req.url)
  const project_id = searchParams.get('project_id')

  let query = db
    .from('accounts')
    .select('*, project:projects(id, name, color)')
    .order('created_at', { ascending: false })

  if (project_id) query = query.eq('project_id', project_id)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/accounts — initiate OAuth connect
export async function POST(req: NextRequest) {
  const { platform, project_id } = await req.json()

  if (!platform || !project_id) {
    return NextResponse.json({ error: 'Missing platform or project_id' }, { status: 400 })
  }

  let authUrl: string
  if (platform === 'instagram') {
    // Pass project_id via state param
    const url = new URL(getInstagramAuthUrl())
    url.searchParams.set('state', project_id)
    authUrl = url.toString()
  } else if (platform === 'tiktok') {
    authUrl = getTikTokAuthUrl(project_id)
  } else {
    return NextResponse.json({ error: 'Unknown platform' }, { status: 400 })
  }

  return NextResponse.json({ auth_url: authUrl })
}

// DELETE /api/accounts — remove account
export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  const db = getServiceClient()
  const { error } = await db.from('accounts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
