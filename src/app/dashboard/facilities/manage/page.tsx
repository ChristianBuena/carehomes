import { redirect } from "next/navigation";
import { getUserFromRequest } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export default async function ManageFacilitiesPage() {
  const user = await getUserFromRequest();
  
  if (!user) {
    redirect("/login");
  }

  if (!hasPermission(user.role, "manage_facilities")) {
    redirect("/dashboard");
  }

  return (
    <div className="py-6">
      <h1 className="text-2xl font-bold text-[var(--color-primary)]">Manage Facilities</h1>
      <p className="mt-2 text-[var(--color-muted)]">
        Placeholder for global facility management interface (ADMIN only).
      </p>
    </div>
  );
}
