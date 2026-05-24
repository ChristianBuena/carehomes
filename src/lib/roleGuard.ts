import { NextResponse } from 'next/server';
import { getUserFromRequest } from './auth';

export async function requireRole(allowedRoles: string[]) {
  const user = await getUserFromRequest();

  // ❌ Not logged in
  if (!user) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      ),
      user: null,
    };
  }

  // ❌ Wrong role
  if (!allowedRoles.includes(user.role)) {
    return {
      error: NextResponse.json(
        { error: 'Forbidden - insufficient permissions' },
        { status: 403 }
      ),
      user: null,
    };
  }

  // ✅ Authorized
  return {
    error: null,
    user,
  };
}