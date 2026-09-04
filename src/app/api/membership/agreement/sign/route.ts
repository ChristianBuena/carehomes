import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { generateMembershipAgreementPdf } from "@/lib/membership-agreement-pdf";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { signedName } = await request.json();

    if (!signedName || !signedName.trim()) {
      return NextResponse.json(
        { error: "Signature name is required" },
        { status: 400 }
      );
    }

    const agreement = await prisma.membershipAgreement.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });

    if (!agreement) {
      return NextResponse.json(
        { error: "No active membership agreement found" },
        { status: 404 }
      );
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      console.error("Cloudinary configuration is missing.");
      return NextResponse.json(
        { error: "Document storage is not configured" },
        { status: 500 }
      );
    }

    const forwardedFor = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");

    const ipAddress =
      forwardedFor?.split(",")[0]?.trim() ||
      realIp ||
      null;

    const userAgent = request.headers.get("user-agent");
    const signedAt = new Date();

    // Generate the finalized agreement PDF.
    const pdfBytes = await generateMembershipAgreementPdf({
      title: agreement.title,
      version: agreement.version,
      content: agreement.content,
      signedName: signedName.trim(),
      email: user.email,
      signedAt,
      ipAddress,
    });

    const publicId = `agreement-${user.userId}-${agreement.version}-${Date.now()}`;

    // Upload the PDF to Cloudinary as a raw document.
    const uploadResult = await new Promise<{
      secure_url: string;
      public_id: string;
    }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "carehomes_agreements",
          public_id: publicId,
          resource_type: "raw",
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (!result) {
            reject(new Error("Cloudinary returned no upload result"));
          } else {
            resolve({
              secure_url: result.secure_url,
              public_id: result.public_id,
            });
          }
        }
      );

      uploadStream.end(Buffer.from(pdfBytes));
    });

    // Store the signed agreement and its Cloudinary reference.
    const consent = await prisma.consentLog.create({
  data: {
    userId: user.userId,
    agreementVersion: agreement.version,
    signedName: signedName.trim(),
    email: user.email,
    ipAddress,
    userAgent,
    documentUrl: uploadResult.secure_url,
    documentPublicId: uploadResult.public_id,
    signedAt,
  },
});

    return NextResponse.json({
      success: true,
      message: "Membership agreement signed successfully",
      consentId: consent.id,
      agreementVersion: consent.agreementVersion,
    });
  } catch (error) {
    console.error("Agreement signing error:", error);

    return NextResponse.json(
      { error: "Failed to sign membership agreement" },
      { status: 500 }
    );
  }
}