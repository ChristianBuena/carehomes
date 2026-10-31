"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Retry button for an approved rebuttal whose "PUBLIC REDACTED VERSION" copy failed. */
export function ApprovedCopyRetry({ rebuttalId }: { rebuttalId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const retry = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/rebuttal/${rebuttalId}/approved-copy`, { method: "POST" });
      if (res.ok) {
        router.refresh();
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string; approvedCopy?: { error?: string } };
      setMessage(data.error ?? `Still failing (${data.approvedCopy?.error ?? "unknown error"}).`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={retry}
        disabled={busy}
        className="min-h-11 rounded-md border border-[var(--color-border)] px-4 text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-bg)] disabled:opacity-60"
      >
        {busy ? "Retrying…" : "Retry approved copy"}
      </button>
      {message && (
        <p role="status" className="text-xs text-[var(--color-danger)]">
          {message}
        </p>
      )}
    </div>
  );
}
