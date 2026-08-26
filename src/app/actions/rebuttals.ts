"use server";

import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function submitRebuttal(formData: FormData) {
  const user = await getUserFromRequest();
  if (!user) throw new Error("Unauthorized");

  const title = formData.get("title") as string;
  const facilityId = formData.get("facilityId") as string;
  const content = formData.get("content") as string;
  const redactionChecked = formData.get("redactionAcknowledged") === "on";
  const file = formData.get("document") as File | null;

  if (!title || !facilityId || !content) {
    throw new Error("Missing required fields.");
  }

  if (!redactionChecked) {
    throw new Error("You must acknowledge the redaction policy.");
  }

  let documentUrl: string | null = null;

  if (file && file.size > 0) {
    if (!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) {
      throw new Error("Cloudinary configuration is missing in the environment variables.");
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    try {
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

      documentUrl = (uploadResult as any).secure_url;
    } catch (err: any) {
      console.error("Cloudinary upload error:", err);
      throw new Error("Failed to upload the document. " + (err.message || ""));
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
}

export async function updateRebuttal(rebuttalId: string, formData: FormData) {
  const user = await getUserFromRequest();
  if (!user) throw new Error("Unauthorized");

  // Verify ownership and that the rebuttal is in REQUEST_FIX state
  const existing = await prisma.rebuttal.findFirst({
    where: { id: rebuttalId, deletedAt: null },
  });

  if (!existing) throw new Error("Rebuttal not found.");
  if (existing.userId !== user.userId) throw new Error("Forbidden.");
  if (existing.status !== "REQUEST_FIX") {
    throw new Error("Only rebuttals with \"Fix Required\" status can be edited.");
  }

  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const redactionChecked = formData.get("redactionAcknowledged") === "on";
  const file = formData.get("document") as File | null;

  if (!title || !content) throw new Error("Missing required fields.");
  if (!redactionChecked) throw new Error("You must acknowledge the redaction policy.");

  // Use existing documentUrl by default; only upload if a new file is provided
  let documentUrl: string | null = existing.documentUrl;

  if (file && file.size > 0) {
    if (!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) {
      throw new Error("Cloudinary configuration is missing in the environment variables.");
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    try {
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

      documentUrl = (uploadResult as { secure_url: string }).secure_url;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      throw new Error("Failed to upload the document. " + message);
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
}
