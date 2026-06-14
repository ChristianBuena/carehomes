import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const publishedRebuttals = await prisma.rebuttal.findMany({
      where: {
        status: "APPROVED", // ✅ this is your "published" state
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(publishedRebuttals);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch published rebuttals" },
      { status: 500 }
    );
  }
}