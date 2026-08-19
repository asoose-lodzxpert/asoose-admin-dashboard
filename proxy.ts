import { NextResponse, type NextRequest } from 'next/server'
import { canAccessDashboardPath, isPortalRole } from '@/app/lib/admin-access'

export function proxy(request: NextRequest) {
  const loginUrl = new URL('/login', request.url)
  const unauthorizedUrl = new URL('/unauthorized', request.url)
  const accessToken = request.cookies.get('access_token')?.value
  const rawUser = request.cookies.get('user')?.value

  if (!accessToken || !rawUser) return NextResponse.redirect(loginUrl)

  try {
    const user = JSON.parse(rawUser) as { role?: unknown }

    if (!isPortalRole(user.role)) return NextResponse.redirect(unauthorizedUrl)
    if (!canAccessDashboardPath(user.role, request.nextUrl.pathname)) {
      return NextResponse.redirect(unauthorizedUrl)
    }
  } catch {
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
