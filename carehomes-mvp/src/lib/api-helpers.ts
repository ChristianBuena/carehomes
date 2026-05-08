import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth';

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  return session.user as any;
}

export async function requireRole(requiredRole: string) {
  const user = await requireAuth();
  if (user.role !== requiredRole) {
    throw new Error('Forbidden - Required role: ' + requiredRole);
  }
  return user;
}

export async function requireAdmin() {
  return requireRole('ADMIN');
}

export function createErrorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), { status });
}

export function createSuccessResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), { status });
}
