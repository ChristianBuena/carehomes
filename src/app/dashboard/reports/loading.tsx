export default function ReportsLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-4 py-6" aria-busy="true" aria-label="Loading reports">
      <div className="h-8 w-40 animate-pulse rounded bg-[var(--color-border)] motion-reduce:animate-none" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-[var(--color-border)] motion-reduce:animate-none" />
        ))}
      </div>
    </div>
  );
}
