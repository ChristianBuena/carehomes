import { redirect } from "next/navigation";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import RedactionPrintForm from "./RedactionPrintForm";

export const metadata = {
  title: "Redaction Attestation Form — CareHomesSupportDocs",
  description: "Fillable web form for Redaction Attestations.",
};

export default async function RedactionFormPage() {
  const user = await getUserFromRequest();

  if (!user) {
    redirect("/login");
  }

  if (!hasPermission(user.role, "access_library") && user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const facilities = await prisma.facility.findMany({
    where: user.role === "MEMBER"
      ? { createdById: user.userId, deletedAt: null }
      : { deletedAt: null },
    select: { id: true, name: true, facilityNumber: true },
    orderBy: { name: "asc" },
  });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.userId },
    select: { name: true, email: true },
  });

  const userName = dbUser?.name || dbUser?.email || "Member";

  return (
    <div className="py-6 min-h-screen">
      <RedactionPrintForm facilities={facilities} userName={userName} />
    </div>
  );
}
