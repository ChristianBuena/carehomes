import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  console.log("🔥 SIGNUP API HIT");

  try {
    const { name, email, password, confirmPassword } = await request.json();

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already in use' },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);

    // 1. Create Organization first (one per account at signup)
    const organization = await prisma.organization.create({
      data: {
        name: name || email,
        // 2. Create Membership scoped to the org (not the user)
        membership: {
          create: {
            plan: 'NONE',
            status: 'INACTIVE',
          },
        },
      },
    });

    // 3. Create User linked to the Organization
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        organizationId: organization.id,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'User created successfully',
        userId: user.id,
        requiresAgreement: true, // Indicate that the user needs to agree to terms
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}