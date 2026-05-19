import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Only protect dashboard and profile
  const isProtectedRoute = path === '/dashboard' || path === '/profile';
  
  // Check for auth token
  const token = request.cookies.get('auth_token')?.value;
  
  // Protect dashboard and profile
  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // NEVER auto-redirect from login to dashboard
  // User must manually login each time
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/profile/:path*'],
};