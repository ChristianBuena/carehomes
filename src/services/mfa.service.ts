import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/mailer";

/**
 * Generate 6-digit OTP
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * CREATE OTP + SEND EMAIL
 */
export async function createMfaOtp(email: string) {
  await prisma.mfaOtp.deleteMany({
    where: { email },
  });

  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await prisma.mfaOtp.create({
    data: {
      email,
      code: otp,
      expiresAt,
      attempts: 0,
      used: false,
    },
  });

  try {
    await sendEmail({
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP is: ${otp}`,
    });

    console.log("📧 OTP email sent successfully to:", email);
  } catch (error) {
    console.error("❌ Failed to send OTP email:", error);

    await prisma.mfaOtp.deleteMany({
      where: { email },
    });

    throw new Error("Failed to send OTP email");
  }

  return true;
}

/**
 * VERIFY OTP (THIS FIXES YOUR BUILD ERROR)
 */
export async function verifyMfaOtp(email: string, code: string) {
  const otp = await prisma.mfaOtp.findFirst({
    where: {
      email,
      code,
      used: false,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  if (!otp) return null;

  await prisma.mfaOtp.update({
    where: { id: otp.id },
    data: {
      used: true,
    },
  });

  return otp;
}