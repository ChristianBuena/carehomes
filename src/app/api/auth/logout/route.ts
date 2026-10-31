import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { auditContextFromRequest, recordAudit } from '@/services/audit.service';

export async function POST(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (token) {
    try {
      const session = await verifyToken(token);
      await recordAudit({
        action: 'AUTH_LOGOUT',
        actorId: session.userId,
        actorRole: session.role,
        ...auditContextFromRequest(request),
      });
    } catch {
      // Invalid or expired token: nothing to attribute; still clear the cookie.
    }
  }

  const response = NextResponse.json(
    { success: true, message: 'Logged out successfully' },
    { status: 200 }
  );

  response.cookies.set('auth-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  return response;
}
