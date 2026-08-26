import { redirect } from "next/navigation";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import NewRebuttalForm from "./NewRebuttalForm";

export const metadata = {
  title: "Submit New Rebuttal — Dashboard",
  description: "Submit a new rebuttal with supporting documents.",
};

export default async function NewRebuttalPage() {
  const user = await getUserFromRequest();
  
  if (!user) {
    redirect("/login");
  }

  if (!hasPermission(user.role, "submit_rebuttal") || user.role === "ADMIN") {
    redirect("/dashboard");
  }

  // Fetch only active facilities owned by the member
  const facilities = await prisma.facility.findMany({
    where: { createdById: user.userId, deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="py-6">
      <NewRebuttalForm facilities={facilities} />
    </div>
  );
}
