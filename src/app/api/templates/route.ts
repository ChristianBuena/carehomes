import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/roleGuard";
import { getAllTemplates, createTemplate, checkLibraryAccess } from "@/services/template.service";
import { getUserFromRequest } from "@/lib/auth";
import type { TemplateCategory, TemplateFileFormat } from "@/generated/prisma/enums";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/templates — Fetch all active templates (gated: active member+)
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hasAccess = await checkLibraryAccess(user.userId, user.role);
  if (!hasAccess) {
    return NextResponse.json(
      { error: "Active membership required" },
      { status: 403 }
    );
  }

  const { searchParams } = req.nextUrl;
  const rawCategory = searchParams.get("category");

  const validCategories: TemplateCategory[] = ["REBUTTAL", "CHECKLIST", "GUIDE"];
  const category =
    rawCategory && validCategories.includes(rawCategory as TemplateCategory)
      ? (rawCategory as TemplateCategory)
      : undefined;

  const templates = await getAllTemplates(category);

  return NextResponse.json({ templates });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/templates — Create a template (admin only)
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const guard = await requirePermission("manage_templates");
  if (guard.error) return guard.error;

  const user = guard.user!;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { title, description, category, fileFormat, fileUrl, notionUrl } =
    body as {
      title?: string;
      description?: string;
      category?: string;
      fileFormat?: string;
      fileUrl?: string;
      notionUrl?: string;
    };

  if (!title || !description || !category || !fileFormat || !fileUrl) {
    return NextResponse.json(
      { error: "title, description, category, fileFormat, and fileUrl are required" },
      { status: 400 }
    );
  }

  const validCategories: TemplateCategory[] = ["REBUTTAL", "CHECKLIST", "GUIDE"];
  const validFormats: TemplateFileFormat[] = ["PDF", "DOCX"];

  if (!validCategories.includes(category as TemplateCategory)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  if (!validFormats.includes(fileFormat as TemplateFileFormat)) {
    return NextResponse.json({ error: "Invalid fileFormat" }, { status: 400 });
  }

  const template = await createTemplate({
    title,
    description,
    category: category as TemplateCategory,
    fileFormat: fileFormat as TemplateFileFormat,
    fileUrl,
    notionUrl: notionUrl ?? undefined,
    uploadedById: user.userId,
  });

  return NextResponse.json({ template }, { status: 201 });
}
