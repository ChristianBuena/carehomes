import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/roleGuard';

export async function POST() {
  const result = await requireRole(['ADMIN', 'MODERATOR']);

  if (result.error) return result.error;

  const user = result.user;

  return NextResponse.json({
    message: 'Moderation action allowed',
    user,
  });
}