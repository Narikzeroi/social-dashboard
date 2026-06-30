import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const params = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!,
    redirect_uri: process.env.INSTAGRAM_REDIRECT_URI!,
    scope: 'instagram_business_basic,instagram_business_manage_comments,instagram_business_manage_messages',
    response_type: 'code',
  })
  return NextResponse.redirect(`https://www.instagram.com/oauth/authorize?${params}`)
}
