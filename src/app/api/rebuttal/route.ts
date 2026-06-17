import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createRebuttal } from "@/services/rebuttal.service";

export async function POST(req: NextRequest) {
  try {
    // ── 1. Auth ────────────────────────────────────────────────────────────
    const token = req.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifyToken(token);

    // ── 2. Permission — only MEMBERs may submit rebuttals ──────────────────
    if (!hasPermission(user.role, "submit_rebuttal")) {
      return NextResponse.json(
        { error: "Admins and moderators cannot submit rebuttals" },
        { status: 403 }
      );
    }

    // ── 3. Parse body ──────────────────────────────────────────────────────
    const body = await req.json();
    const { title, content, facilityId } = body as {
      title?: string;
      content?: string;
      facilityId?: string;
    };

    if (!title || !content || !facilityId) {
      return NextResponse.json(
        { error: "title, content, and facilityId are required" },
        { status: 400 }
      );
    }

    // ── 4. Facility ownership — must own the facility ──────────────────────
    const facility = await prisma.facility.findUnique({
      where: { id: facilityId },
    });

    if (!facility) {
      return NextResponse.json({ error: "Facility not found" }, { status: 404 });
    }

    if (facility.createdById !== user.userId) {
      return NextResponse.json(
        { error: "You can only submit rebuttals for facilities you own" },
        { status: 403 }
      );
    }

    // ── 5. Create rebuttal ─────────────────────────────────────────────────
    const rebuttal = await createRebuttal({
      title,
      content,
      userId: user.userId,
    });

    return NextResponse.json(rebuttal);
  } catch {
    return NextResponse.json(
      { error: "Failed to create rebuttal" },
      { status: 500 }
    );
  }
}