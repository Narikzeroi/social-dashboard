import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/db/supabase'
import { syncInstagramAccount } from '@/lib/api/instagram'
import { syncTikTokAccount } from '@/lib/api/tiktok'
import type { Account } from '@/types'

// POST /api/sync — sync all accounts or a specific one
export async function POST(req: NextRequest) {
  // Protect cron endpoint
  const authHeader = req.headers.get('authorization')
  const isFromCron = authHeader === `Bearer ${process.env.CRON_SECRET}`
  // Allow direct calls too (from UI)
  const body = await req.json().catch(() => ({}))
  const { account_id } = body

  const db = getServiceClient()

  let query = db.from('accounts').select('*')
  if (account_id) query = query.eq('id', account_id)

  const { data: accounts, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results = await Promise.allSettled(
    (accounts as Account[]).map(account => {
      if (account.platform === 'instagram') return syncInstagramAccount(account)
      if (account.platform === 'tiktok') return syncTikTokAccount(account)
      return Promise.resolve(null)
    })
  )

  const summary = results.map((r, i) => ({
    account: accounts[i]?.username,
    status: r.status,
    result: r.status === 'fulfilled' ? r.value : String((r as PromiseRejectedResult).reason),
  }))

  return NextResponse.json({ synced: summary.length, results: summary })
}

// GET /api/sync — used by Vercel Cron (configure in vercel.json)
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // Reuse POST logic
  return POST(new NextRequest(req.url, {
    method: 'POST',
    body: JSON.stringify({}),
    headers: { 'Content-Type': 'application/json', authorization: authHeader || '' },
  }))
}
