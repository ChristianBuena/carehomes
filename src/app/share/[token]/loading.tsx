export default function ShareLoading() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      {/* Slim header skeleton */}
      <header className="bg-[var(--color-primary)] py-4 px-6 flex items-center justify-between shadow-md">
        <div className="h-5 w-44 bg-white/20 rounded animate-pulse" />
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10">
        {/* Header card skeleton */}
        <div className="bg-white border border-[var(--color-border)] rounded-2xl p-6 mb-6 shadow-sm animate-pulse">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-2">
              <div className="h-3 w-24 bg-gray-200 rounded" />
              <div className="h-7 w-56 bg-gray-200 rounded" />
              <div className="h-3 w-32 bg-gray-200 rounded" />
            </div>
            <div className="h-9 w-32 bg-gray-200 rounded-lg" />
          </div>
        </div>

        {/* Disclaimer skeleton */}
        <div className="h-12 bg-amber-100 rounded-lg mb-6 animate-pulse" />

        {/* File rows skeleton */}
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white border border-[var(--color-border)] rounded-xl p-4 flex items-center justify-between gap-4 animate-pulse"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="w-6 h-6 bg-gray-200 rounded" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/4" />
                </div>
              </div>
              <div className="h-5 w-20 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
