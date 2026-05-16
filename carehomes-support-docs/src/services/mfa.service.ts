import { prisma } from "@/lib/prisma";

/**
 * Generate a 6-digit OTP
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Create OTP for MFA login
 */
export async function createMfaOtp(email: string) {
  // delete old OTPs first (important)
  await prisma.mfaOtp.deleteMany({
    where: { email },
  });

  const otp = generateOTP();

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  await prisma.mfaOtp.create({
    data: {
      email,
      code: otp,
      expiresAt,
      attempts: 0,
      used: false,
    },
  });

  return otp;
}

/**
 * Verify OTP
 */
export async function verifyMfaOtp(email: string, code: string) {
  const record = await prisma.mfaOtp.findFirst({
    where: {
      email,
      code,
      used: false,
    },
  });

  // no record found
  if (!record) {
    // increase attempt count for security tracking
    await prisma.mfaOtp.updateMany({
      where: { email },
      data: {
        attempts: { increment: 1 },
      },
    });

    return false;
  }

  // expired OTP
  if (record.expiresAt < new Date()) {
    return false;
  }

  // too many attempts
  if (record.attempts >= 3) {
    return false;
  }

  // mark OTP as used
  await prisma.mfaOtp.update({
    where: { id: record.id },
    data: { used: true },
  });

  return true;
}

/**
 * Optional: cleanup expired OTPs (you can call this later in cron)
 */
export async function cleanupExpiredOtps() {
  await prisma.mfaOtp.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
}