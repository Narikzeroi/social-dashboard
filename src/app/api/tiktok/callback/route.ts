import { NextRequest, NextResponse } from 'next/server'
import { saveTikTokAccount, syncTikTokAccount } from '@/lib/api/tiktok'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state') // projectId
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=tiktok_auth_failed`
    )
  }

  try {
    const account = await saveTikTokAccount(state || '', code)
    syncTikTokAccount(account).catch(console.error)

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=tiktok_connected&account=${account.username}`
    )
  } catch (e) {
    console.error('TikTok callback error:', e)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=tiktok_save_failed`
    )
  }
}
