import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/auth/constants';
import { canAccessAdminWeb } from '@/lib/auth/webAccess';
import { isAdminProtectedPath } from '@/lib/navigation/adminNav';

function parseSessionCookie(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = parseSessionCookie(sessionCookie);
  const isAuthenticated = Boolean(session);

  if (isAdminProtectedPath(pathname)) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (!canAccessAdminWeb(session)) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete(SESSION_COOKIE_NAME);
      return response;
    }
  }

  if (pathname === '/login' && isAuthenticated && canAccessAdminWeb(session)) {
    return NextResponse.redirect(new URL('/accueil', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/login',
    '/accueil',
    '/tableau-de-bord',
    '/chantiers',
    '/clients',
    '/ouvrages/:path*',
    '/articles/:path*',
    '/parametres',
    '/profil',
  ],
};
