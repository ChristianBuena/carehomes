import { NextRequest, NextResponse } from "next/server";
import { createMfaOtp } from "@/services/mfa.service";

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const otp = await createMfaOtp(email);

  // TEMP: return OTP (later email this)
  return NextResponse.json({
    message: "OTP sent",
    otp,
  });
}