import { NextRequest, NextResponse } from 'next/server'
import { saveInstagramAccount, syncInstagramAccount } from '@/lib/api/instagram'
import { getServiceClient } from '@/lib/db/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const projectId = searchParams.get('state') // passed via state param

  if (error || !code) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=instagram_auth_failed`
    )
  }

  try {
    const account = await saveInstagramAccount(projectId || '', code)
    // Kick off initial sync in background
    syncInstagramAccount(account).catch(console.error)

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=instagram_connected&account=${account.username}`
    )
  } catch (e) {
    console.error('Instagram callback error:', e)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=instagram_save_failed`
    )
  }
}
