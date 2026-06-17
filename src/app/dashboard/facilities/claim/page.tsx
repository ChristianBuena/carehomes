import { redirect } from "next/navigation";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export default async function ClaimFacilityPage() {
  const user = await getUserFromRequest();
  
  if (!user) {
    redirect("/login");
  }

  if (!hasPermission(user.role, "claim_facility") || user.role === "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="py-6">
      <h1 className="text-2xl font-bold text-[var(--color-primary)]">Claim Facility</h1>
      <p className="mt-2 text-[var(--color-muted)]">
        Placeholder for claiming a new facility. Use the "Browse Facility Directory" button to find a facility.
      </p>
    </div>
  );
}
