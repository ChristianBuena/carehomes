import { describeMailError } from "@/lib/log-safe";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export type SendEmailParams = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export const sendEmail = async ({
  to,
  subject,
  text,
  html,
}: SendEmailParams) => {
  try {
    await transporter.sendMail({
      from: `CareHomesSupportDocs.org <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });

    // No recipient address in logs (SOW 11.3 "limit PII").
  } catch (error) {
    console.error("[mail] Send failed:", describeMailError(error));
    throw error;
  }
};
