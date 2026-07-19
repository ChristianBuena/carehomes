"use server";

import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function linkSeatToOrg(
  targetUserId: string,
  orgId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getUserFromRequest();
    
    // Only admins can manually link seats for now
    if (!user || user.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return { success: false, error: "Target user not found" };
    }

    if (targetUser.organizationId === orgId) {
      return { success: false, error: "User is already in this organization" };
    }

    // Link the user to the new org
    await prisma.user.update({
      where: { id: targetUserId },
      data: { organizationId: orgId },
    });

    revalidatePath("/dashboard/users");
    return { success: true };
  } catch (err: any) {
    console.error("Link seat error:", err);
    return { success: false, error: "Failed to link seat to organization" };
  }
}
