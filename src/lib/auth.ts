import { cookies } from 'next/headers';
import { verifyToken, AuthTokenPayload } from '@/lib/jwt';

export async function getUserFromRequest(): Promise<AuthTokenPayload | null> {
  try {
    const cookieStore = await cookies();

    const token = cookieStore.get('auth-token')?.value;

    if (!token) return null;

    const decoded = await verifyToken(token);

    return decoded as AuthTokenPayload;
  } catch (err) {
    return null;
  }
}