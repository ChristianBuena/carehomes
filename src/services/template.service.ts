import { prisma } from "@/lib/prisma";
import type { TemplateCategory, TemplateFileFormat } from "@/generated/prisma/enums";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type CreateTemplateInput = {
  title: string;
  description: string;
  category: TemplateCategory;
  fileFormat: TemplateFileFormat;
  fileUrl: string;
  notionUrl?: string;
  uploadedById?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// QUERIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch all active templates, optionally filtered by category.
 */
export async function getAllTemplates(category?: TemplateCategory) {
  return prisma.template.findMany({
    where: {
      isActive: true,
      ...(category ? { category } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      fileFormat: true,
      fileUrl: true,
      notionUrl: true,
      downloadCount: true,
      createdAt: true,
      uploadedBy: { select: { name: true } },
    },
  });
}

/**
 * Fetch a single template by ID (active or not — for admin views).
 */
export async function getTemplateById(id: string) {
  return prisma.template.findUnique({ where: { id } });
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN MUTATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new template entry (admin only).
 */
export async function createTemplate(data: CreateTemplateInput) {
  return prisma.template.create({ data });
}

/**
 * Soft-delete a template by setting isActive = false (admin only).
 * We soft-delete to preserve TemplateDownload analytics history.
 */
export async function deleteTemplate(id: string) {
  return prisma.template.update({
    where: { id },
    data: { isActive: false },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// DOWNLOAD TRACKING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Atomically increment download count and record the download event.
 * Returns the updated template so the caller can serve the fileUrl.
 */
export async function trackDownload(templateId: string, userId: string) {
  const [updatedTemplate] = await prisma.$transaction([
    prisma.template.update({
      where: { id: templateId },
      data: { downloadCount: { increment: 1 } },
    }),
    prisma.templateDownload.create({
      data: { templateId, userId },
    }),
  ]);

  return updatedTemplate;
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCESS CONTROL HELPER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true when the user is allowed to access the library.
 * - ADMIN and MODERATOR always have access.
 * - MEMBER must have an ACTIVE membership.
 */
export async function checkLibraryAccess(
  userId: string,
  role: string
): Promise<boolean> {
  if (role === "ADMIN" || role === "MODERATOR") return true;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      organization: {
        select: {
          membership: {
            select: { status: true }
          }
        }
      }
    }
  });

  return user?.organization?.membership?.status === "ACTIVE";
}
