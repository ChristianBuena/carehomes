"use server";

import { getUserFromRequest } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { withOrgFacilityQuota } from "@/services/facility.service";

export async function claimFacility(facilityId: string) {
  try {
    const user = await getUserFromRequest();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Membership + quota check (against org, not user) and the claim itself run
    // atomically under a lock on the Organization row — see withOrgFacilityQuota.
    const result = await withOrgFacilityQuota(user.orgId, async (tx) => {
      // Check facility existence (soft-deleted = gone) and ownership
      const facility = await tx.facility.findFirst({
        where: { id: facilityId, deletedAt: null },
      });

      if (!facility) {
        return { claimed: false as const, error: "Facility not found." };
      }

      if (facility.createdById || facility.organizationId) {
        if (facility.createdById === user.userId) {
          return { claimed: false as const, error: "You have already claimed this facility." };
        }
        return { claimed: false as const, error: "This facility has already been claimed by another user." };
      }

      // Claim the facility — conditional on it STILL being unclaimed, so two
      // different orgs racing for the same facility cannot both win (the org
      // lock above only serializes claims within one org).
      const { count } = await tx.facility.updateMany({
        where: { id: facilityId, deletedAt: null, createdById: null, organizationId: null },
        data: { createdById: user.userId, organizationId: user.orgId },
      });

      if (count === 0) {
        return { claimed: false as const, error: "This facility has already been claimed by another user." };
      }

      return { claimed: true as const, slug: facility.slug };
    });

    if (!result.ok) {
      return {
        success: false,
        error:
          result.reason === "LIMIT_REACHED"
            ? "Facility limit reached — upgrade your plan to claim more facilities."
            : "You must have an active membership to claim a facility.",
      };
    }

    if (!result.value.claimed) {
      return { success: false, error: result.value.error };
    }

    // Revalidate relevant pages
    revalidatePath(`/facilities/${result.value.slug}`);
    revalidatePath(`/dashboard/facilities`);

    return { success: true };
  } catch (err: any) {
    console.error("Claim facility error:", err);
    return { success: false, error: "An unexpected error occurred while claiming the facility." };
  }
}
