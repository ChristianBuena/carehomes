"use server";

import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { canClaimFacility } from "@/lib/permissions";

export async function claimFacility(facilityId: string) {
  try {
    const user = await getUserFromRequest();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const membership = await prisma.membership.findUnique({
      where: { organizationId: user.orgId },
    });

    if (!membership || membership.status !== "ACTIVE") {
      return { success: false, error: "You must have an active membership to claim a facility." };
    }

    // Check quota (against org, not user)
    const currentCount = await prisma.facility.count({
      where: { organizationId: user.orgId },
    });

    if (!canClaimFacility(membership.plan, currentCount)) {
      return { success: false, error: "Facility limit reached — upgrade your plan to claim more facilities." };
    }

    // Check facility existence and ownership
    const facility = await prisma.facility.findUnique({
      where: { id: facilityId },
    });

    if (!facility) {
      return { success: false, error: "Facility not found." };
    }

    if (facility.createdById) {
      if (facility.createdById === user.userId) {
        return { success: false, error: "You have already claimed this facility." };
      }
      return { success: false, error: "This facility has already been claimed by another user." };
    }

    // Claim the facility
    await prisma.facility.update({
      where: { id: facilityId },
      data: { createdById: user.userId, organizationId: user.orgId },
    });

    // Revalidate relevant pages
    revalidatePath(`/facilities/${facility.slug}`);
    revalidatePath(`/dashboard/facilities`);

    return { success: true };
  } catch (err: any) {
    console.error("Claim facility error:", err);
    return { success: false, error: "An unexpected error occurred while claiming the facility." };
  }
}
