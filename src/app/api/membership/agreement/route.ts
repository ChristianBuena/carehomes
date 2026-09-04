import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getUserFromRequest();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

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

    const latestConsent = await prisma.consentLog.findFirst({
      where: {
        userId: user.userId,
      },
      orderBy: {
        signedAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      agreement: {
        id: agreement.id,
        version: agreement.version,
        title: agreement.title,
        content: agreement.content,
      },
      consent: latestConsent
        ? {
            id: latestConsent.id,
            agreementVersion: latestConsent.agreementVersion,
            signedName: latestConsent.signedName,
            signedAt: latestConsent.signedAt,
          }
        : null,
      requiresSignature:
        !latestConsent ||
        latestConsent.agreementVersion !== agreement.version,
    });
  } catch (error) {
    console.error("Agreement fetch error:", error);

    return NextResponse.json(
      { error: "Failed to load membership agreement" },
      { status: 500 }
    );
  }
}