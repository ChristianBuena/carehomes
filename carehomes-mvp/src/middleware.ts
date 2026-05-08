import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

// Define route protection rules
const ADMIN_ROUTES = ['/api/admin', '/dashboard'];
const PROTECTED_ROUTES = ['/dashboard', '/api'];

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = request.nextUrl;

  // Protected routes check
  if (PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
    if (!token) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Admin routes check
  if (ADMIN_ROUTES.some(route => pathname.startsWith(route))) {
    if (!token) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (token.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // MFA check for admin routes
    const user = token as any;
    if (user.mfaEnabled && !user.mfaVerified) {
      return NextResponse.json(
        { error: 'MFA verification required' },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*', '/dashboard/:path*'],
};
