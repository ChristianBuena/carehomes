import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/roleGuard";
import { getTemplateById, deleteTemplate } from "@/services/template.service";

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/templates/[id] — Soft-delete a template (admin only)
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requirePermission("manage_templates");
  if (guard.error) return guard.error;

  const { id } = await params;

  const existing = await getTemplateById(id);
  if (!existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  await deleteTemplate(id);

  return NextResponse.json({ success: true, message: "Template removed" });
}
