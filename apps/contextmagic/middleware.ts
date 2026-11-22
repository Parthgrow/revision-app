import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@revision-app/core/auth'

const PUBLIC_PATHS = ['/login', '/register']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isAuthPage = PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  // The landing page is public; app/page.tsx sends signed-in visitors on to /context.
  const isPublic = isAuthPage || pathname === '/'

  const token = req.cookies.get('session')?.value
  const session = token ? await verifyToken(token) : null

  if (!session && !isPublic) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (session && isAuthPage) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
