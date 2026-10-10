import { redirect } from "next/navigation";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import RebuttalPrintForm from "./RebuttalPrintForm";

export const metadata = {
  title: "Rebuttal Response Form — CareHomesSupportDocs",
  description: "Fillable web form for Rebuttal Responses.",
};

export default async function RebuttalFormPage() {
  const user = await getUserFromRequest();
  
  if (!user) {
    redirect("/login");
  }

  if (!hasPermission(user.role, "submit_rebuttal")) {
    redirect("/dashboard");
  }

  // Fetch the org's active facilities for the dropdown (excluding soft-deleted)
  const facilities = await prisma.facility.findMany({
    where: { organizationId: user.orgId, deletedAt: null },
    select: { id: true, name: true, facilityNumber: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="py-6 min-h-screen">
      <RebuttalPrintForm facilities={facilities} />
    </div>
  );
}
