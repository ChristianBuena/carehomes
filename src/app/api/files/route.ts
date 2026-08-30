import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { UTApi } from "uploadthing/server";

const utapi = new UTApi();

// ── GET — list files for logged-in member (or any member if ADMIN) ─────────
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("auth-token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await verifyToken(token);

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("userId");

    // ADMIN can view any member's files
    let userId = user.userId;
    if (targetUserId && hasPermission(user.role, "manage_users")) {
      userId = targetUserId;
    }

    const files = await prisma.memberFile.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      orderBy: { uploadedAt: "desc" },
      select: {
        id: true,
        filename: true,
        fileUrl: true,
        fileSize: true,
        fileType: true,
        mimeType: true,
        label: true,
        isQsfDoc: true,
        uploadedAt: true,
      },
    });

    return NextResponse.json(files);
  } catch {
    return NextResponse.json({ error: "Failed to fetch files" }, { status: 500 });
  }
}

// ── DELETE — soft delete a file (member deletes own, admin deletes any) ──────
export async function DELETE(req: NextRequest) {
  try {
    const token = req.cookies.get("auth-token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await verifyToken(token);

    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get("id");

    if (!fileId) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const file = await prisma.memberFile.findUnique({ where: { id: fileId } });

    if (!file || file.deletedAt) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Only owner or ADMIN can delete
    const isOwner = file.userId === user.userId;
    const isAdmin = hasPermission(user.role, "manage_users");

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Soft delete in DB
    await prisma.memberFile.update({
      where: { id: fileId },
      data: { deletedAt: new Date() },
    });

    // Also delete from UploadThing storage
    try {
      await utapi.deleteFiles(file.fileKey);
    } catch (err) {
      console.error("UploadThing delete failed:", err);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
  }
}

// ── PATCH — update file label or isQsfDoc flag ────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const token = req.cookies.get("auth-token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await verifyToken(token);

    const body = await req.json();
    const { id, label, isQsfDoc } = body as {
      id: string;
      label?: string;
      isQsfDoc?: boolean;
    };

    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const file = await prisma.memberFile.findUnique({ where: { id } });

    if (!file || file.deletedAt) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    if (file.userId !== user.userId && !hasPermission(user.role, "manage_users")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.memberFile.update({
      where: { id },
      data: {
        ...(label !== undefined && { label }),
        ...(isQsfDoc !== undefined && { isQsfDoc }),
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update file" }, { status: 500 });
  }
}
