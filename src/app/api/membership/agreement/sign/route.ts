import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    // 1. Verify authenticated user
    const user = await getUserFromRequest();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Get signature name from request
    const { signedName } = await request.json();

    if (!signedName || !signedName.trim()) {
      return NextResponse.json(
        { error: "Signature name is required" },
        { status: 400 }
      );
    }

    // 3. Get the currently active agreement
    const agreement = await prisma.membershipAgreement.findFirst({
      where: {
        isActive: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!agreement) {
      return NextResponse.json(
        { error: "No active membership agreement found" },
        { status: 404 }
      );
    }

    // 4. Get request metadata
    const forwardedFor = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");

    const ipAddress =
      forwardedFor?.split(",")[0]?.trim() ||
      realIp ||
      null;

    const userAgent = request.headers.get("user-agent");

    // 5. Save the consent record
    const consent = await prisma.consentLog.create({
      data: {
        userId: user.userId,
        agreementVersion: agreement.version,
        signedName: signedName.trim(),
        email: user.email,
        ipAddress,
        userAgent,
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