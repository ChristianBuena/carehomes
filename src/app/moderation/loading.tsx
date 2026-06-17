import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto flex flex-col items-center justify-center min-h-[50vh] text-[var(--color-muted)]">
        <Loader2 className="h-10 w-10 animate-spin mb-4 text-[var(--color-primary)]" />
        <p className="text-lg font-medium animate-pulse">Loading moderation queue...</p>
      </div>
    </div>
  );
}
