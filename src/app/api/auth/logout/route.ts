import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, revokeUserSessions } from '@/lib/auth';
import { auditContextFromRequest, recordAudit } from '@/services/audit.service';

/**
 * POST /api/auth/logout
 *
 * Clears the cookie AND revokes the session server-side (SOW 11.1a): the
 * user's token version is bumped, so a copied or stolen cookie stops working
 * immediately. This signs the user out on every device.
 */
export async function POST(request: NextRequest) {
  const session = await getSessionUser(request.cookies.get('auth-token')?.value);
  if (session) {
    await revokeUserSessions(session.userId);
    await recordAudit({
      action: 'AUTH_LOGOUT',
      actorId: session.userId,
      actorRole: session.role,
      ...auditContextFromRequest(request),
    });
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
