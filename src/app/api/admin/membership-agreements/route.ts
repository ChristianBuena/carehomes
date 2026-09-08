import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/roleGuard";

export async function GET() {
  try {
    const auth = await requirePermission("manage_memberships");

    if (auth.error) {
      return auth.error;
    }

    const members = await prisma.user.findMany({
      where: {
        role: "MEMBER",
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        consentLogs: {
          orderBy: {
            signedAt: "desc",
          },
          take: 1,
          select: {
            id: true,
            agreementVersion: true,
            signedName: true,
            email: true,
            ipAddress: true,
            signedAt: true,
            documentPublicId: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      members,
    });
  } catch (error) {
    console.error("Admin membership agreements error:", error);

    return NextResponse.json(
      { error: "Failed to retrieve membership agreements" },
      { status: 500 }
    );
  }
}