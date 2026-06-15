import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/mailer";

function getOtpEmailTemplate(otp: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Your Verification Code</title>
</head>
<body style="margin:0;padding:0;background-color:#F0F4FF;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- HEADER -->
          <tr>
            <td style="background-color:#1B3A6B;padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:13px;color:#93C5FD;letter-spacing:1px;text-transform:uppercase;">CareHomesSupportDocs.org</p>
              <h1 style="margin:8px 0 0;font-size:22px;color:#ffffff;font-weight:700;">Verification Code</h1>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:40px 40px 24px;">
              <p style="margin:0 0 16px;font-size:15px;color:#3B5080;line-height:1.6;">
                Hello,
              </p>
              <p style="margin:0 0 28px;font-size:15px;color:#3B5080;line-height:1.6;">
                Use the code below to complete your login. This code expires in <strong>5 minutes</strong> and can only be used once.
              </p>

              <!-- OTP BOX -->
              <div style="background:#F0F4FF;border:2px dashed #C7D4F0;border-radius:10px;padding:28px;text-align:center;margin-bottom:28px;">
                <p style="margin:0 0 8px;font-size:12px;color:#6B7FA3;letter-spacing:1px;text-transform:uppercase;">Your one-time code</p>
                <p style="margin:0;font-size:42px;font-weight:700;color:#1B3A6B;letter-spacing:10px;">${otp}</p>
              </div>

              <p style="margin:0 0 8px;font-size:13px;color:#6B7FA3;line-height:1.6;">
                If you did not request this code, you can safely ignore this email. Do not share this code with anyone.
              </p>
            </td>
          </tr>

          <!-- DIVIDER -->
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none;border-top:1px solid #E8EFFE;margin:0;" />
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:24px 40px 32px;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:#6B7FA3;">
                CareHomesSupportDocs.org — Nonprofit Platform
              </p>
              <p style="margin:0;font-size:11px;color:#9DB0CC;">
                This is not a government website. We are not affiliated with CCLD or any regulatory body.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

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
      subject: "Your CareHomesSupportDocs.org Verification Code",
      text: `Your OTP is: ${otp}. It expires in 5 minutes.`,
      html: getOtpEmailTemplate(otp),
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

/**
 * Verify OTP code
 */
export async function verifyMfaOtp(
  email: string,
  code: string,
): Promise<boolean> {
  const record = await prisma.mfaOtp.findFirst({
    where: {
      email,
      code,
      used: false,
      expiresAt: { gt: new Date() },
    },
  });

  if (!record) return false;

  // Check max attempts
  if (record.attempts >= 5) return false;

  // Increment attempts
  await prisma.mfaOtp.update({
    where: { id: record.id },
    data: { attempts: record.attempts + 1 },
  });

  // Mark as used
  await prisma.mfaOtp.update({
    where: { id: record.id },
    data: { used: true },
  });

  return true;
}
