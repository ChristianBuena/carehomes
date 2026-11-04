import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/roleGuard";
import { getTemplateById, deleteTemplate } from "@/services/template.service";
import { auditContextFromRequest, recordAudit } from "@/services/audit.service";

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/templates/[id] — Soft-delete a template (admin only)
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
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
  await recordAudit({
    action: "TEMPLATE_DELETED",
    actorId: guard.user?.userId ?? null,
    actorRole: guard.user?.role ?? null,
    targetType: "Template",
    targetId: id,
    ...auditContextFromRequest(req),
  });

  return NextResponse.json({ success: true, message: "Template removed" });
}
