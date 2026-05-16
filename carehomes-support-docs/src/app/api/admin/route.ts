import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/roleGuard';

export async function GET() {
  const result = await requireRole(['ADMIN']);

  if (result.error) return result.error;

  const user = result.user;

  return NextResponse.json({
    message: 'Welcome Admin',
    user,
  });
}