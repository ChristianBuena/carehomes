"use client";

import { useEffect, useState } from "react";
import { Clock, AlertTriangle, AlertOctagon, CheckCircle2 } from "lucide-react";
import { SlaUrgency, calculateSla } from "@/services/takedown.service";
import { TakedownStatus } from "@/types/takedown.types";

interface SlaCountdownBadgeProps {
  submittedAt: string | Date;
  slaDeadline: string | Date;
  status: TakedownStatus;
}

export function SlaCountdownBadge({
  submittedAt,
  slaDeadline,
  status,
}: SlaCountdownBadgeProps) {
  const [sla, setSla] = useState(() =>
    calculateSla(new Date(submittedAt), new Date(slaDeadline), status)
  );

  // Update countdown every minute
  useEffect(() => {
    if (status === "RESOLVED" || status === "REJECTED") return;

    const interval = setInterval(() => {
      setSla(calculateSla(new Date(submittedAt), new Date(slaDeadline), status));
    }, 60000);

    return () => clearInterval(interval);
  }, [submittedAt, slaDeadline, status]);

  if (status === "RESOLVED") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/20">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Resolved
      </span>
    );
  }

  if (status === "REJECTED") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--color-muted)]/15 text-[var(--color-muted)] border border-[var(--color-border)]">
        Rejected
      </span>
    );
  }

  if (sla.isOverdue) {
    const overdueHours = Math.abs(sla.remainingHours);
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--color-danger)]/15 text-[var(--color-danger)] border border-[var(--color-danger)]/30 animate-pulse">
        <AlertOctagon className="h-3.5 w-3.5" />
        OVERDUE ({overdueHours}h)
      </span>
    );
  }

  if (sla.slaUrgency === "CRITICAL") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--color-danger)]/15 text-[var(--color-danger)] border border-[var(--color-danger)]/30">
        <AlertTriangle className="h-3.5 w-3.5" />
        {sla.remainingHours}h {sla.remainingMinutes}m left (&lt;24h)
      </span>
    );
  }

  if (sla.slaUrgency === "WARNING") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--color-warning)]/15 text-[var(--color-warning)] border border-[var(--color-warning)]/30">
        <Clock className="h-3.5 w-3.5" />
        {sla.remainingHours}h {sla.remainingMinutes}m left
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/20">
      <Clock className="h-3.5 w-3.5" />
      {sla.remainingHours}h {sla.remainingMinutes}m left
    </span>
  );
}
