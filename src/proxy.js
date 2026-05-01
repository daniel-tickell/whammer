import { NextResponse } from 'next/server';

export function proxy(request) {
  const { pathname } = request.nextUrl;
  
  // Allow login page, API routes, and static files
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get('auth-session');

  if (!sessionCookie || sessionCookie.value !== 'authenticated') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
