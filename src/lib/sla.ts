import { TakedownStatus } from "@/types/takedown.types";

export type SlaUrgency = "HEALTHY" | "WARNING" | "CRITICAL" | "OVERDUE" | "RESOLVED";

export function calculateSla(submittedAt: Date, slaDeadline: Date, status: TakedownStatus) {
  if (status === "RESOLVED" || status === "REJECTED") {
    return {
      slaUrgency: "RESOLVED" as SlaUrgency,
      remainingHours: 0,
      remainingMinutes: 0,
      isOverdue: false,
    };
  }

  const now = new Date().getTime();
  const deadline = new Date(slaDeadline).getTime();
  const diffMs = deadline - now;
  const remainingHours = Math.floor(diffMs / (1000 * 60 * 60));
  const remainingMinutes = Math.max(0, Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)));
  const isOverdue = diffMs <= 0;

  let slaUrgency: SlaUrgency = "HEALTHY";
  if (isOverdue) {
    slaUrgency = "OVERDUE";
  } else if (remainingHours < 24) {
    slaUrgency = "CRITICAL";
  } else if (remainingHours < 48) {
    slaUrgency = "WARNING";
  }

  return {
    slaUrgency,
    remainingHours,
    remainingMinutes,
    isOverdue,
  };
}
