import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword } from "@/lib/auth-utils";
import { createMfaOtp, getOtpResendCooldown } from "@/services/mfa.service";
import {
  MFA_PENDING_COOKIE,
  MFA_PENDING_MAX_AGE_SECONDS,
  signMfaPendingToken,
} from "@/lib/jwt";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const isValidPassword = await comparePassword(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }


    const cooldown = await getOtpResendCooldown(user.email);
    if (cooldown === 0) {
      await createMfaOtp(user.email);
    }

    const res = NextResponse.json({
      success: true,
      mfaRequired: true,
      email: user.email,
      message: "OTP sent to email",
    });

    // Bind the OTP step to this successful password check
    res.cookies.set(MFA_PENDING_COOKIE, await signMfaPendingToken(user.email), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api",
      maxAge: MFA_PENDING_MAX_AGE_SECONDS,
    });

    return res;

  } catch (error) {
    console.error("Login error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}