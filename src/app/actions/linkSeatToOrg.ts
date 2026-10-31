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

    // A seat belongs to one organization. Moving a user who is already in a
    // different org is blocked: it would silently strand the facilities they
    // claimed (those stay with the old org) — they must be removed from their
    // current organization first.
    if (targetUser.organizationId) {
      return { success: false, error: "User already belongs to another organization" };
    }

    // Validate the target org up front so the caller gets a clear message
    // instead of a foreign-key violation surfacing as a generic failure.
    const targetOrg = orgId
      ? await prisma.organization.findUnique({
          where: { id: orgId },
          select: { id: true },
        })
      : null;

    if (!targetOrg) {
      return { success: false, error: "Organization not found" };
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
