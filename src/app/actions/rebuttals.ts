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
