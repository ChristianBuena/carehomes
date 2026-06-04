import { ResponsiveContainer } from "@/components/ui/ResponsiveContainer";

const STATS = [
  { value: "10+", label: "Facilities Listed", description: "Licensed CA care facilities" },
  { value: "100%", label: "Moderated Content", description: "Every rebuttal reviewed before publish" },
  { value: "72hr", label: "Takedown Response", description: "Target response for privacy requests" },
  { value: "501(c)(3)", label: "Nonprofit Operated", description: "No referral fees, ever" },
];

export function StatsSection() {
  return (
    <section
      aria-label="Platform statistics"
      className="bg-gradient-to-r from-[var(--color-primary)] via-[#1e4a80] to-[var(--color-secondary)] py-12 md:py-16 lg:py-24"
    >
      <ResponsiveContainer>
        <dl className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center text-center gap-1"
            >
              <dt className="text-sm font-medium text-white/70 uppercase tracking-widest order-2">
                {stat.label}
              </dt>
              <dd className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight order-1">
                {stat.value}
              </dd>
              <p className="text-xs text-white/50 order-3 mt-0.5">{stat.description}</p>
            </div>
          ))}
        </dl>
      </ResponsiveContainer>
    </section>
  );
}
