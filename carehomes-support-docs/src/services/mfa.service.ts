import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/mailer";

/**
 * Generate 6-digit OTP
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Create OTP + send via email
 */
export async function createMfaOtp(email: string) {
  // 1. Delete old OTPs
  await prisma.mfaOtp.deleteMany({
    where: { email },
  });

  // 2. Generate OTP
  const otp = generateOTP();

  // 3. Expiry
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  // 4. Save OTP first
  await prisma.mfaOtp.create({
    data: {
      email,
      code: otp,
      expiresAt,
      attempts: 0,
      used: false,
    },
  });

  // 5. SEND EMAIL (NOW WITH PROPER ERROR HANDLING)
  try {
    await sendEmail({
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP is: ${otp}`,
    });

    console.log("📧 OTP email sent successfully to:", email);
  } catch (error) {
    console.error("❌ Failed to send OTP email:", error);

    // OPTIONAL BUT RECOMMENDED:
    // rollback OTP if email fails
    await prisma.mfaOtp.deleteMany({
      where: { email },
    });

    throw new Error("Failed to send OTP email");
  }

  return true;
}