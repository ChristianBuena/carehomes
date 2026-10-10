import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword } from "@/lib/auth-utils";
import { createMfaOtp, getOtpResendCooldown } from "@/services/mfa.service";
import { getClientIp } from "@/lib/client-ip";
import {
  clearLoginFailures,
  getLoginLock,
  recordLoginFailure,
  throttleKey,
} from "@/services/login-throttle.service";
import {
  MFA_PENDING_COOKIE,
  MFA_PENDING_MAX_AGE_SECONDS,
  signMfaPendingToken,
} from "@/lib/jwt";

function lockedResponse(lockedUntil: Date) {
  const retryAfterSeconds = Math.max(1, Math.ceil((lockedUntil.getTime() - Date.now()) / 1000));
  return NextResponse.json(
    {
      error: `Too many failed login attempts. Try again in ${Math.ceil(retryAfterSeconds / 60)} minute(s).`,
    },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    // Failures are counted per (email, client IP) — see login-throttle.service.
    const key = throttleKey(email, getClientIp(request));

    // A locked pair is refused before the password is even compared, so a lock
    // cannot be bypassed by eventually guessing right. This runs before the
    // user lookup so the answer is the same whether or not the account exists.
    const activeLock = await getLoginLock(key);
    if (activeLock) {
      return lockedResponse(activeLock);
    }

    const user =
      typeof email === "string"
        ? await prisma.user.findUnique({ where: { email } })
        : null;

    const isValidPassword =
      !!user && typeof password === "string" && (await comparePassword(password, user.password));

    if (!user || !isValidPassword) {
      // Unknown emails are counted exactly like wrong passwords, so the
      // 401 -> 429 sequence does not reveal whether an account exists.
      const lockedUntil = await recordLoginFailure(key);
      if (lockedUntil) {
        return lockedResponse(lockedUntil);
      }

      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Correct password — clear the failure history for this email + address.
    await clearLoginFailures(key);

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