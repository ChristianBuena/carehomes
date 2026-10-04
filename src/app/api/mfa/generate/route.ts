import { NextRequest, NextResponse } from "next/server";
import { createMfaOtp, getOtpResendCooldown } from "@/services/mfa.service";
import { MFA_PENDING_COOKIE, verifyMfaPendingToken } from "@/lib/jwt";

/**
 * POST /api/mfa/generate — RESEND an OTP during login.
 *
 * Security:
 * - Requires the short-lived `mfa-pending` cookie issued by /api/auth/login
 *   after a correct password. The email comes from that signed cookie,
 *   NEVER from the request body.
 * - The OTP is only ever delivered by email — it is never returned here.
 * - Enforces a resend cooldown to prevent email bombing.
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

    const cooldown = await getOtpResendCooldown(email);
    if (cooldown > 0) {
      return NextResponse.json(
        { error: `Please wait ${cooldown}s before requesting a new code.` },
        { status: 429, headers: { "Retry-After": String(cooldown) } }
      );
    }

    await createMfaOtp(email);

    return NextResponse.json({ success: true, message: "OTP sent" });
  } catch (error) {
    console.error("MFA resend error:", error);
    return NextResponse.json(
      { error: "Failed to send OTP" },
      { status: 500 }
    );
  }
}