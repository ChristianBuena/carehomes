import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import {
  getTemplateById,
  trackDownload,
  checkLibraryAccess,
} from "@/services/template.service";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/templates/[id]/download
// Verifies access, increments download count, returns the fileUrl for redirect.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Gate: active membership required for MEMBER role
  const hasAccess = await checkLibraryAccess(user.userId, user.role);
  if (!hasAccess) {
    return NextResponse.json(
      { error: "Active membership required to download templates" },
      { status: 403 }
    );
  }

  const { id } = await params;

  const template = await getTemplateById(id);
  if (!template || !template.isActive) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  // Track download and increment count atomically
  await trackDownload(id, user.userId);

  // Return the file URL — the client will navigate to it to trigger the download
  return NextResponse.json({ fileUrl: template.fileUrl });
}
