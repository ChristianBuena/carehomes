import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword } from '@/lib/auth-utils';
import { signToken } from '@/lib/jwt';

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

    // 4. CREATE JWT TOKEN (UPDATED - ROLE ADDED HERE)
    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role, // ✅ ADDED THIS
    });

    // 5. Response with cookie
    const response = NextResponse.json(
      {
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role, // ✅ OPTIONAL BUT USEFUL FOR FRONTEND
          membership: user.membership,
        },
      },
      { status: 200 }
    );

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}