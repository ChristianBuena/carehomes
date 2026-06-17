import { redirect } from "next/navigation";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

  // Fetch ALL facilities so the member can submit a rebuttal for any of them
  const facilities = await prisma.facility.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="py-6">
      <NewRebuttalForm facilities={facilities} />
    </div>
  );
}
