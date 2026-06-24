import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/db/supabase'

export async function GET() {
  const db = getServiceClient()
  const { data, error } = await db
    .from('projects')
    .select(`
      *,
      accounts(id, platform, username, avatar_url, followers_count, last_synced_at)
    `)
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const { name, color } = await req.json()
  const db = getServiceClient()
  const { data, error } = await db.from('projects').insert({ name, color }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const { id, name, color } = await req.json()
  const db = getServiceClient()
  const { data, error } = await db.from('projects').update({ name, color }).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  const db = getServiceClient()
  const { error } = await db.from('projects').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
