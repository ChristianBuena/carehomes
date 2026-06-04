import { Shield, FileText, Lock } from "lucide-react";

export default function ValuePropositionSection() {
  const cards = [
    {
      title: "Compliance-First",
      description: "Every rebuttal goes through moderation before publication",
      icon: Shield,
    },
    {
      title: "Official Records",
      description: "Direct deep links to CCLD sources for every facility",
      icon: FileText,
    },
    {
      title: "Privacy Protected",
      description: "Strict redaction standards. No resident data ever published.",
      icon: Lock,
    },
  ];

  return (
    <section className="py-24 bg-[var(--color-bg)] w-full">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Inject keyframes for fadeUp entrance animation */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(24px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-up {
            animation: fadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            opacity: 0;
          }
        `}} />
        
        <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-up">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--color-primary)]">
            Our Core Principles
          </h2>
          <p className="mt-4 text-lg text-[var(--color-muted)]">
            We built CareHomesSupportDocs.org on a foundation of trust, compliance, and privacy.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {cards.map((card, index) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="animate-fade-up flex flex-col items-start p-8 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm hover:shadow-md transition-shadow duration-300"
                style={{ animationDelay: `${(index + 1) * 150}ms` }}
              >
                <div className="rounded-lg bg-[var(--color-primary)]/10 p-3 mb-6">
                  <Icon className="h-8 w-8 text-[var(--color-primary)]" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-bold text-[var(--color-text)] mb-3">
                  {card.title}
                </h3>
                <p className="text-[var(--color-muted)] leading-relaxed">
                  {card.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
