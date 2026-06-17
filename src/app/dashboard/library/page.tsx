import { redirect } from "next/navigation";
import { getUserFromRequest } from "@/lib/auth";
import { BookOpen, FileText, Scale, ClipboardList, ShieldCheck, Download, Lock } from "lucide-react";

export const metadata = {
  title: "Member Library — Dashboard",
  description: "Access rebuttal templates, regulatory guides, and compliance resources for California care facility operators.",
};

type ResourceItem = {
  title: string;
  description: string;
  tag: "Template" | "Guide" | "Checklist";
  icon: React.ElementType;
  memberOnly?: boolean;
};

const CATEGORIES: { heading: string; items: ResourceItem[] }[] = [
  {
    heading: "Rebuttal Templates",
    items: [
      { title: "Staffing Ratio Rebuttal Template", description: "Pre-structured response for §87411 staffing citations. Includes documentation checklist and corrective action memo outline.", tag: "Template", icon: FileText, memberOnly: true },
      { title: "Medication Administration Rebuttal Template", description: "Covers §87465 medication log citations with supporting evidence framework and third-party pharmacy audit request letter.", tag: "Template", icon: FileText, memberOnly: true },
      { title: "Resident Rights Rebuttal Template", description: "Contesting §87572 citations with cognitive-impairment accommodations and ISP evidence documentation guide.", tag: "Template", icon: FileText, memberOnly: true },
      { title: "Emergency Preparedness Rebuttal Template", description: "Step-by-step response for emergency binder and drill documentation citations with timeline documentation.", tag: "Template", icon: FileText, memberOnly: true },
    ],
  },
  {
    heading: "Regulatory Guides",
    items: [
      { title: "Title 22 RCFE Quick Reference Guide", description: "Plain-language summary of the most-cited Title 22 California Code of Regulations sections for Residential Care Facilities for the Elderly.", tag: "Guide", icon: Scale },
      { title: "CCLD Survey Process Overview", description: "What to expect before, during, and after a CCLD unannounced inspection, including your rights during the survey.", tag: "Guide", icon: ClipboardList },
      { title: "Understanding Citation Levels", description: "Explains Class A, Class B, and Administrative Penalty citations, appeal timelines, and financial exposure limits.", tag: "Guide", icon: Scale },
    ],
  },
  {
    heading: "Compliance Checklists",
    items: [
      { title: "Pre-Survey Self-Audit Checklist", description: "Monthly facility walkthrough covering staffing, medication, resident rights, physical environment, and emergency preparedness.", tag: "Checklist", icon: ShieldCheck, memberOnly: true },
      { title: "New Staff Onboarding Compliance Checklist", description: "Documents required before a new staff member can perform care tasks — health screening, CPR, background check, and orientation.", tag: "Checklist", icon: ShieldCheck, memberOnly: true },
      { title: "Corrective Action Plan (CAP) Template", description: "Structured CAP template accepted by CCLD for responding to deficiency notices with 30/60/90-day milestone tracking.", tag: "Checklist", icon: ShieldCheck, memberOnly: true },
    ],
  },
];

const TAG_COLORS: Record<string, string> = {
  Template: "bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]/20",
  Guide: "bg-[var(--color-secondary)]/10 text-[var(--color-secondary)] border-[var(--color-secondary)]/20",
  Checklist: "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border-[var(--color-accent)]/20",
};

export default async function MemberLibraryPage() {
  const user = await getUserFromRequest();
  if (!user) redirect("/login");

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
          <BookOpen className="h-5 w-5 text-[var(--color-primary)]" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-text)]">Member Library</h2>
          <p className="text-sm text-[var(--color-muted)] mt-0.5">Templates, guides, and compliance resources for California RCFE operators.</p>
        </div>
      </div>

      <div className="flex items-start gap-3 bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30 px-4 py-3 rounded-lg text-sm text-[var(--color-text)]">
        <ShieldCheck className="h-4 w-4 text-[var(--color-warning)] shrink-0 mt-0.5" aria-hidden="true" />
        <span>These resources are for informational purposes only and do <strong>not</strong> constitute legal advice. Consult a licensed attorney for guidance specific to your situation.</span>
      </div>

      {CATEGORIES.map((cat) => (
        <section key={cat.heading} aria-labelledby={`lib-${cat.heading.replace(/\s+/g, "-").toLowerCase()}`}>
          <h3 id={`lib-${cat.heading.replace(/\s+/g, "-").toLowerCase()}`} className="text-lg font-bold text-[var(--color-primary)] mb-4 pb-2 border-b border-[var(--color-border)]">
            {cat.heading}
          </h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cat.items.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.title} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 shadow-sm flex flex-col gap-3 hover:border-[var(--color-primary)]/30 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="h-4 w-4 text-[var(--color-primary)]" aria-hidden="true" />
                      </div>
                      <h4 className="text-sm font-semibold text-[var(--color-text)] leading-snug">{item.title}</h4>
                    </div>
                    <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${TAG_COLORS[item.tag]}`}>
                      {item.tag}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-muted)] leading-relaxed">{item.description}</p>
                  <div className="mt-auto pt-2 border-t border-[var(--color-border)]">
                    <button type="button" disabled title="Downloadable file coming soon"
                      className={`inline-flex items-center gap-1.5 text-xs font-medium cursor-not-allowed ${item.memberOnly ? "text-[var(--color-muted)]" : "text-[var(--color-secondary)]"}`}>
                      {item.memberOnly ? <Lock className="h-3.5 w-3.5" aria-hidden="true" /> : <Download className="h-3.5 w-3.5" aria-hidden="true" />}
                      {item.memberOnly ? "Member Download — Coming Soon" : "Download — Coming Soon"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
