import { notFound, redirect } from "next/navigation";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import EditRebuttalForm from "./EditRebuttalForm";

export const metadata = {
  title: "Edit Rebuttal — Dashboard",
  description: "Edit and resubmit your rebuttal for moderation review.",
};

interface EditRebuttalPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditRebuttalPage({ params }: EditRebuttalPageProps) {
  const { id } = await params;
  const user = await getUserFromRequest();

  if (!user) {
    redirect("/login");
  }

  const rebuttal = await prisma.rebuttal.findUnique({
    where: { id },
    include: {
      facility: { select: { id: true, name: true } },
    },
  });

  // Must exist, belong to this user, and be in REQUEST_FIX state
  if (!rebuttal || rebuttal.userId !== user.userId) {
    notFound();
  }

  if (rebuttal.status !== "REQUEST_FIX") {
    // Redirect back to rebuttals list — can only edit when fix is required
    redirect("/dashboard/rebuttals");
  }

  return (
    <div className="py-6">
      <EditRebuttalForm
        rebuttal={{
          id: rebuttal.id,
          title: rebuttal.title,
          content: rebuttal.content,
          documentUrl: rebuttal.documentUrl,
          facility: rebuttal.facility,
        }}
      />
    </div>
  );
}
