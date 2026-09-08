import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/roleGuard";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

type RouteContext = {
  params: Promise<{
    consentId: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const auth = await requirePermission("manage_memberships");

    if (auth.error) {
      return auth.error;
    }

    const { consentId } = await context.params;

    const consent = await prisma.consentLog.findUnique({
      where: {
        id: consentId,
      },
      select: {
        id: true,
        documentPublicId: true,
        signedName: true,
        email: true,
        agreementVersion: true,
        signedAt: true,
        ipAddress: true,
      },
    });

    if (!consent) {
      return NextResponse.json(
        { error: "Signed agreement not found" },
        { status: 404 }
      );
    }

    if (!consent.documentPublicId) {
      return NextResponse.json(
        { error: "Signed agreement document is unavailable" },
        { status: 404 }
      );
    }

    const signedUrl = cloudinary.url(consent.documentPublicId, {
      resource_type: "raw",
      type: "upload",
      secure: true,
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + 60,
    });

    return NextResponse.json({
      success: true,
      document: {
        id: consent.id,
        signedName: consent.signedName,
        email: consent.email,
        agreementVersion: consent.agreementVersion,
        signedAt: consent.signedAt,
        url: signedUrl,
      },
    });
  } catch (error) {
    console.error("Admin agreement document error:", error);

    return NextResponse.json(
      { error: "Failed to retrieve signed agreement" },
      { status: 500 }
    );
  }
}