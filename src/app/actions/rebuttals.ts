"use server";

import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { v2 as cloudinary } from "cloudinary";
import type { ActionResult } from "@/types/action-result";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Errors the user needs to read are RETURNED, never thrown — see ActionResult.
function fail(error: string): ActionResult {
  return { success: false, error };
}

const UNEXPECTED_ERROR = "Something went wrong. Please try again.";

/** Uploads a rebuttal document to Cloudinary and returns its URL. */
async function uploadDocument(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const uploadResult = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "carehomes_rebuttals", resource_type: "auto" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(buffer);
  });

  return (uploadResult as { secure_url: string }).secure_url;
}

export async function submitRebuttal(formData: FormData): Promise<ActionResult> {
  try {
    const user = await getUserFromRequest();
    if (!user) return fail("Unauthorized");

    const title = formData.get("title") as string;
    const facilityId = formData.get("facilityId") as string;
    const content = formData.get("content") as string;
    const redactionChecked = formData.get("redactionAcknowledged") === "on";
    const file = formData.get("document") as File | null;

    if (!title || !facilityId || !content) {
      return fail("Missing required fields.");
    }

    if (!redactionChecked) {
      return fail("You must acknowledge the redaction policy.");
    }

    // Permission + facility ownership — mirrors POST /api/rebuttal. Checked before
    // any upload so a rejected submission never stores a document.
    if (!hasPermission(user.role, "submit_rebuttal")) {
      return fail("Forbidden: your role cannot submit rebuttals.");
    }

    const facility = await prisma.facility.findFirst({
      where: { id: facilityId, deletedAt: null },
      select: { organizationId: true },
    });

    if (!facility) {
      return fail("Facility not found.");
    }

    if (!facility.organizationId) {
      return fail(
        "This facility has not been claimed. Claim it before submitting a rebuttal."
      );
    }

    if (!user.orgId || facility.organizationId !== user.orgId) {
      return fail(
        "Forbidden: you can only submit rebuttals for facilities your organization owns."
      );
    }

    let documentUrl: string | null = null;

    if (file && file.size > 0) {
      if (!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) {
        return fail("Cloudinary configuration is missing in the environment variables.");
      }

      try {
        documentUrl = await uploadDocument(file);
      } catch (err: unknown) {
        console.error("Cloudinary upload error:", err);
        const message = err instanceof Error ? err.message : "";
        return fail("Failed to upload the document. " + message);
      }
    }

    await prisma.rebuttal.create({
      data: {
        title,
        content,
        facilityId,
        documentUrl,
        userId: user.userId,
        status: "PENDING",
      },
    });

    revalidatePath("/dashboard/rebuttals");
    revalidatePath("/moderation");

    return { success: true };
  } catch (err: unknown) {
    // Anything unexpected (database down, etc.) — log it, show a safe message.
    console.error("submitRebuttal error:", err);
    return fail(UNEXPECTED_ERROR);
  }
}

export async function updateRebuttal(rebuttalId: string, formData: FormData): Promise<ActionResult> {
  try {
    const user = await getUserFromRequest();
    if (!user) return fail("Unauthorized");

    // Verify ownership and that the rebuttal is in REQUEST_FIX state
    const existing = await prisma.rebuttal.findFirst({
      where: { id: rebuttalId, deletedAt: null },
    });

    if (!existing) return fail("Rebuttal not found.");
    if (existing.userId !== user.userId) return fail("Forbidden.");
    if (existing.status !== "REQUEST_FIX") {
      return fail("Only rebuttals with \"Fix Required\" status can be edited.");
    }

    const title = formData.get("title") as string;
    const content = formData.get("content") as string;
    const redactionChecked = formData.get("redactionAcknowledged") === "on";
    const file = formData.get("document") as File | null;

    if (!title || !content) return fail("Missing required fields.");
    if (!redactionChecked) return fail("You must acknowledge the redaction policy.");

    // Use existing documentUrl by default; only upload if a new file is provided
    let documentUrl: string | null = existing.documentUrl;

    if (file && file.size > 0) {
      if (!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) {
        return fail("Cloudinary configuration is missing in the environment variables.");
      }

      try {
        documentUrl = await uploadDocument(file);
      } catch (err: unknown) {
        console.error("Cloudinary upload error:", err);
        const message = err instanceof Error ? err.message : "Upload failed";
        return fail("Failed to upload the document. " + message);
      }
    }

    await prisma.rebuttal.update({
      where: { id: rebuttalId },
      data: {
        title,
        content,
        documentUrl,
        status: "PENDING",        // Re-enter moderation queue
        moderatedById: null,      // Clear previous reviewer
      },
    });

    revalidatePath("/dashboard/rebuttals");
    revalidatePath("/moderation");

    return { success: true };
  } catch (err: unknown) {
    // Anything unexpected (database down, etc.) — log it, show a safe message.
    console.error("updateRebuttal error:", err);
    return fail(UNEXPECTED_ERROR);
  }
}
