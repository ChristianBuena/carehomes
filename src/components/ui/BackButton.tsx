"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors py-2"
      aria-label="Go back to directory"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Back to Directory
    </button>
  );
}
