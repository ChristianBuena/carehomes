import { UserPlus, FileUp, CheckCircle, Globe } from "lucide-react";

export default function HowItWorksSection() {
  const steps = [
    {
      id: 1,
      title: "Join as a Member",
      description:
        "Sign up and verify your credentials as a licensed care facility operator.",
      icon: UserPlus,
    },
    {
      id: 2,
      title: "Submit Your Rebuttal",
      description:
        "Use our secure form to draft your response to specific CCLD citations.",
      icon: FileUp,
    },
    {
      id: 3,
      title: "Moderation Review",
      description:
        "Our team reviews your submission for compliance and privacy standards.",
      icon: CheckCircle,
    },
    {
      id: 4,
      title: "Published to Facility Page",
      description:
        "Your approved rebuttal is published directly on your facility's public profile.",
      icon: Globe,
    },
  ];

  return (
    <section className="py-24 bg-[var(--color-surface)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[var(--color-primary)]">
            How It Works
          </h2>
          <p className="mt-4 text-lg text-[var(--color-muted)]">
            A simple, compliant process to ensure your voice is heard.
          </p>
        </div>

        <div className="relative">
          {/* Horizontal line for desktop connecting steps */}
          <div
            className="hidden md:block absolute top-8 left-[10%] right-[10%] h-[2px] bg-[var(--color-border)] z-0"
            aria-hidden="true"
          />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.id}
                  className="relative z-10 flex flex-col items-center text-center group"
                >
                  {/* Vertical line for mobile connecting steps (except last) */}
                  {step.id !== 4 && (
                    <div
                      className="md:hidden absolute top-[4rem] left-1/2 w-[2px] h-full bg-[var(--color-border)] -translate-x-1/2 -z-10"
                      aria-hidden="true"
                    />
                  )}

                  <div className="w-16 h-16 rounded-full bg-[var(--color-bg)] border-2 border-[var(--color-primary)] flex items-center justify-center mb-6 shadow-sm group-hover:scale-105 group-hover:bg-[var(--color-primary)] transition-all duration-300">
                    <Icon className="h-6 w-6 text-[var(--color-primary)] group-hover:text-white transition-colors" />
                  </div>

                  <div className="bg-[var(--color-accent)] text-[var(--color-blue-50)] text-xs font-bold px-2.5 py-0.5 rounded-full mb-3 shadow-sm">
                    Step {step.id}
                  </div>

                  <h3 className="text-lg font-bold text-[var(--color-text)] mb-2">
                    {step.title}
                  </h3>

                  <p className="text-sm text-[var(--color-muted)] max-w-[250px]">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
