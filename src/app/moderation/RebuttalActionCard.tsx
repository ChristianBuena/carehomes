"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RebuttalWithRelations {
  id: string;
  title: string;
  content: string;
  status: string;
  createdAt: Date | string;
  user: {
    name: string | null;
    email: string;
  };
  facility: {
    name: string;
    slug: string;
    facilityNumber: string | null;
  } | null;
}

interface RebuttalActionCardProps {
  rebuttal: RebuttalWithRelations;
}

export function RebuttalActionCard({ rebuttal }: RebuttalActionCardProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (action: "approve" | "reject" | "request_fix") => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rebuttal.id, action }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Action failed");
      }

      router.refresh(); // Refresh the page to remove the item from the pending list
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 shadow-sm">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Content Section */}
        <div className="flex-1 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-[var(--color-text)] leading-snug">
              {rebuttal.title}
            </h3>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-[var(--color-muted)]">
              <span>By: {rebuttal.user.name || rebuttal.user.email}</span>
              {rebuttal.facility && (
                <span>
                  Facility: {rebuttal.facility.name} (License:{" "}
                  {rebuttal.facility.facilityNumber || "N/A"})
                </span>
              )}
              <span>
                Submitted:{" "}
                {new Date(rebuttal.createdAt).toLocaleDateString("en-US")}
              </span>
            </div>
          </div>

          <div className="bg-[var(--color-bg)] rounded-lg p-4 text-sm text-[var(--color-text)] whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
            {rebuttal.content}
          </div>
          
          {error && (
            <p className="text-sm text-[var(--color-danger)] font-medium">
              {error}
            </p>
          )}
        </div>

        {/* Actions Section */}
        <div className="flex flex-row lg:flex-col gap-3 shrink-0 lg:w-48">
          <Button
            onClick={() => handleAction("approve")}
            disabled={isSubmitting}
            className="flex-1 lg:flex-none bg-[var(--color-success)] hover:bg-[var(--color-success)]/90 text-white"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" /> Approve
              </>
            )}
          </Button>
          <Button
            onClick={() => handleAction("request_fix")}
            disabled={isSubmitting}
            variant="outline"
            className="flex-1 lg:flex-none border-[var(--color-warning)] text-[var(--color-warning)] hover:bg-[var(--color-warning)]/10"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <AlertTriangle className="mr-2 h-4 w-4" /> Request Fix
              </>
            )}
          </Button>
          <Button
            onClick={() => handleAction("reject")}
            disabled={isSubmitting}
            variant="outline"
            className="flex-1 lg:flex-none border-[var(--color-danger)] text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <X className="mr-2 h-4 w-4" /> Reject
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
