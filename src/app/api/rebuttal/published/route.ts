import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PUBLIC, unauthenticated. Approved rebuttal TEXT only: no document URLs
// (original or watermarked) and no author identity. Documents stay private
// until a working redaction pipeline exists.
// See tests/integration/public-exposure.test.ts.
export async function GET() {
  try {
    const publishedRebuttals = await prisma.rebuttal.findMany({
      where: {
        status: "APPROVED", // the "published" state
        deletedAt: null,    // exclude soft-deleted rebuttals
      },
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        facility: { select: { name: true, slug: true } },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(publishedRebuttals);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch published rebuttals" },
      { status: 500 }
    );
  }
}
