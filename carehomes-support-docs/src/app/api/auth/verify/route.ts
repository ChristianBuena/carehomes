import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/jwt";

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();

    // 1. Validate input
    if (!email || !otp) {
      return NextResponse.json(
        { error: "Email and OTP required" },
        { status: 400 }
      );
    }

    // 2. Find OTP record
    const record = await prisma.mfaOtp.findFirst({
      where: {
        email,
        code: otp,
        used: false,
      },
    });

    if (!record) {
      return NextResponse.json(
        { error: "Invalid OTP" },
        { status: 401 }
      );
    }

    // 3. Check expiry
    if (record.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "OTP expired" },
        { status: 401 }
      );
    }

    // 4. Mark OTP as used
    await prisma.mfaOtp.update({
      where: { id: record.id },
      data: { used: true },
    });

    // 5. Get user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // 6. Generate JWT
    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // 7. Create response + set cookie
    const res = NextResponse.json({
      success: true,
      message: "OTP verified successfully",
    });

    res.cookies.set("auth-token", token, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: false, // set true in production (HTTPS)
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return res;
  } catch (error) {
    console.error("OTP verify error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}