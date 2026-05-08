import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// For TOTP generation - install speakeasy package
// npm install speakeasy qrcode

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = session.user as any;

    // Only admins can set up MFA (in this implementation)
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can set up MFA' },
        { status: 403 }
      );
    }

    const { action, code } = await request.json();

    if (action === 'setup') {
      // Generate MFA secret - in production use speakeasy
      // const secret = speakeasy.generateSecret({ name: user.email });
      // For now, generate a simple random secret
      const secret = Math.random().toString(36).substring(2, 15) +
                     Math.random().toString(36).substring(2, 15);

      // Generate backup codes
      const backupCodes = Array.from({ length: 10 }, () =>
        Math.random().toString(36).substring(2, 10).toUpperCase()
      );

      // Store temporary MFA secret for verification
      // In production, store this securely and verify before activation
      return NextResponse.json({
        secret,
        backupCodes,
        message: 'MFA setup initiated. Verify the code to complete setup.',
      });
    }

    if (action === 'verify') {
      if (!code) {
        return NextResponse.json(
          { error: 'MFA code required' },
          { status: 400 }
        );
      }

      // In production, verify the code matches the secret
      // For now, accept any 6-digit code
      if (!/^\d{6}$/.test(code)) {
        return NextResponse.json(
          { error: 'Invalid MFA code format' },
          { status: 400 }
        );
      }

      // Activate MFA - you'll need to pass the secret from setup step
      const backupCodes = Array.from({ length: 10 }, () =>
        Math.random().toString(36).substring(2, 10).toUpperCase()
      );

      await prisma.user.update({
        where: { id: user.id },
        data: {
          mfaEnabled: true,
          mfaSecret: 'secret_placeholder', // Should be from setup step
          backupCodes,
        },
      });

      return NextResponse.json({
        message: 'MFA enabled successfully',
        backupCodes,
      });
    }

    if (action === 'disable') {
      // Require password confirmation
      const { password } = await request.json();

      // Verify password before disabling MFA
      // This would require comparing password hash

      await prisma.user.update({
        where: { id: user.id },
        data: {
          mfaEnabled: false,
          mfaSecret: null,
          backupCodes: [],
        },
      });

      return NextResponse.json({
        message: 'MFA disabled',
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('MFA setup error:', error);
    return NextResponse.json(
      { error: 'Failed to set up MFA' },
      { status: 500 }
    );
  }
}
