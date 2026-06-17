import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center text-[var(--color-muted)]">
      <Loader2 className="h-8 w-8 animate-spin mb-4 text-[var(--color-primary)]" />
      <p className="text-sm font-medium animate-pulse">Loading...</p>
    </div>
  );
}
