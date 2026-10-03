import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  signToken,
  verifyMfaPendingToken,
  MFA_PENDING_COOKIE,
} from "@/lib/jwt";
import { verifyMfaOtp } from "@/services/mfa.service";

/**
 * POST /api/auth/verify — step 2 of login (OTP check). Single source of truth;
 * /api/mfa/verify re-exports this handler.
 *
 * Security:
 * - Requires the `mfa-pending` cookie from a successful password check.
 *   The email is taken from that signed cookie, not the request body.
 * - Wrong guesses are counted; the OTP is invalidated after 5 failures.
 */
export async function POST(req: NextRequest) {
  try {
    const pending = req.cookies.get(MFA_PENDING_COOKIE)?.value;
    const email = pending ? await verifyMfaPendingToken(pending) : null;

    if (!email) {
      return NextResponse.json(
        { error: "Your login session expired. Please sign in again." },
        { status: 401 }
      );
    }

    const body = (await req.json()) as { otp?: unknown; code?: unknown };
    const otp = body.otp ?? body.code;

    if (typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { error: "Enter the 6-digit code" },
        { status: 400 }
      );
    }

    const valid = await verifyMfaOtp(email, otp);

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid or expired OTP" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        role: true,
        organizationId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.organizationId) {
      return NextResponse.json(
        { error: "User has no organization — contact support" },
        { status: 500 }
      );
    }

    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      orgId: user.organizationId,
    });

    const res = NextResponse.json({
      success: true,
      message: "OTP verified successfully",
    });

    res.cookies.set("auth-token", token, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    // MFA step complete — clear the pending cookie
    res.cookies.set(MFA_PENDING_COOKIE, "", {
      httpOnly: true,
      path: "/api",
      maxAge: 0,
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