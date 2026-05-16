import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword } from '@/lib/auth-utils';
import { createMfaOtp } from '@/services/mfa.service';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // 1. Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    // 2. Find user in database
    const user = await prisma.user.findUnique({
      where: { email },
      include: { membership: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // 3. Compare password (bcrypt)
    const isValidPassword = await comparePassword(
      password,
      user.password
    );

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // 🔐 4. MFA STEP (NEW LOGIC)
    const otp = await createMfaOtp(user.email);

    // ⚠️ DO NOT ISSUE TOKEN YET

    return NextResponse.json(
      {
        success: true,
        mfaRequired: true,
        message: 'OTP sent to email',
        email: user.email,

        // ⚠️ TEMP ONLY (remove later after email integration)
        otp,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Login error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}