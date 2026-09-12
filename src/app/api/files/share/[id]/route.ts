import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

// ── DELETE — revoke a share link ─────────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = req.cookies.get("auth-token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await verifyToken(token);
    if (!hasPermission(user.role, "manage_file_shares")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const link = await prisma.fileShareLink.findUnique({ where: { id } });

    if (!link) {
      return NextResponse.json({ error: "Share link not found" }, { status: 404 });
    }

    // Only owner (or admin) can revoke
    const isOwner = link.userId === user.userId;
    const isAdmin = hasPermission(user.role, "manage_users");

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (link.revokedAt) {
      return NextResponse.json({ error: "Link already revoked" }, { status: 409 });
    }

    await prisma.fileShareLink.update({
      where: { id },
      data: { revokedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to revoke share link" }, { status: 500 });
  }
}
