import { NextRequest, NextResponse } from "next/server";
import { verifyMfaOtp } from "@/services/mfa.service";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/jwt";

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();

    // VALIDATE INPUT
    if (!email || !code) {
      return NextResponse.json(
        { error: "Email and code required" },
        { status: 400 }
      );
    }

    // VERIFY OTP
    const valid = await verifyMfaOtp(email, code);

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid or expired OTP" },
        { status: 400 }
      );
    }

    // GET REAL USER
    const user = await prisma.user.findUnique({
      where: { email },
      include: { 
        organization: {
          include: { membership: true }
        }
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // CREATE JWT
    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      orgId: user.organizationId as string,
    });

    // RESPONSE
    const response = NextResponse.json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        membership: user.organization?.membership,
      },
    });

    // SET COOKIE
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;

  } catch (error) {
    console.error("MFA verify error:", error);

    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}