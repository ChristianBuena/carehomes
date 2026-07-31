export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto py-8 space-y-6">
      <div className="h-8 w-64 bg-[var(--color-border)] rounded animate-pulse" />
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-8 space-y-6">
        <div className="h-6 w-48 bg-[var(--color-border)] rounded animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-10 bg-[var(--color-border)] rounded animate-pulse" />
          <div className="h-10 bg-[var(--color-border)] rounded animate-pulse" />
        </div>
        <div className="h-40 bg-[var(--color-border)] rounded animate-pulse" />
        <div className="h-10 w-32 bg-[var(--color-border)] rounded animate-pulse" />
      </div>
    </div>
  );
}
