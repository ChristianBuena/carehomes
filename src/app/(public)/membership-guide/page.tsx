import type { Metadata } from "next";
import Link from "next/link";
import { ResponsiveContainer } from "@/components/ui/ResponsiveContainer";
import { buildMetadata } from "@/lib/metadata";
import {
  ShieldCheck,
  FileText,
  Clock,
  Lock,
  Share2,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Award,
} from "lucide-react";

export const metadata: Metadata = buildMetadata({
  title: "Care Facility Membership Guide — CareHomesSupportDocs.org",
  description:
    "Comprehensive operator guide to CareHomesSupportDocs membership tiers ($300, $400, $500). Learn how each plan safeguards your facility's public compliance standing, citation rebuttals, and Title 22 documentation.",
});

/* ---------- Plan Comparison Data ---------- */

interface ComparisonRow {
  feature: string;
  category: string;
  tier300: string;
  tier400: string;
  tier500: string;
}

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    category: "Facility Coverage & Quota",
    feature: "Licensed Facilities Included",
    tier300: "1 Facility",
    tier400: "Up to 3 Facilities",
    tier500: "Up to 10 Facilities",
  },
  {
    category: "Facility Coverage & Quota",
    feature: "Claim Verification with CCLD",
    tier300: "Included",
    tier400: "Included",
    tier500: "Included",
  },
  {
    category: "Facility Coverage & Quota",
    feature: "Multi-Facility Dashboard",
    tier300: "Single Facility View",
    tier400: "Multi-Facility Hub",
    tier500: "Enterprise Portfolio View",
  },
  {
    category: "Citation Rebuttal System",
    feature: "Rebuttal Submissions",
    tier300: "Unlimited for Claimed Facility",
    tier400: "Unlimited Across All 3",
    tier500: "Unlimited Across All 10",
  },
  {
    category: "Citation Rebuttal System",
    feature: "Moderation Queue SLA",
    tier300: "Standard (3–5 Business Days)",
    tier400: "Priority (48-Hour Turnaround)",
    tier500: "Express Priority Queue",
  },
  {
    category: "Citation Rebuttal System",
    feature: "Tamper-Evident Watermarked PDFs",
    tier300: "Included",
    tier400: "Included",
    tier500: "Included",
  },
  {
    category: "Citation Rebuttal System",
    feature: "Public Profile Rebuttal Display",
    tier300: "Included",
    tier400: "Included",
    tier500: "Included",
  },
  {
    category: "Document Library & Templates",
    feature: "Policy & Plan of Correction Templates",
    tier300: "Core Standard Set",
    tier400: "Expanded Library",
    tier500: "Full Complete Library",
  },
  {
    category: "Document Library & Templates",
    feature: "Title 22 Appeals Guidance",
    tier300: "Core Forms",
    tier400: "Expanded Guidance & Samples",
    tier500: "Comprehensive Strategy Suite",
  },
  {
    category: "Compliance & Collaboration",
    feature: "Citation Deadline & Appeal Tracker",
    tier300: "Included",
    tier400: "Included + Deadline Alerts",
    tier500: "Included + Priority Notifications",
  },
  {
    category: "Compliance & Collaboration",
    feature: "Encrypted Attorney Share Links",
    tier300: "7-Day & 30-Day Links",
    tier400: "7-Day, 30-Day & Custom Links",
    tier500: "Multi-Seat Attorney & Staff Access",
  },
  {
    category: "Support & Guidance",
    feature: "Support Channel",
    tier300: "Standard Email Support",
    tier400: "Priority Email Support",
    tier500: "Dedicated Support Specialist",
  },
  {
    category: "Support & Guidance",
    feature: "Onboarding Experience",
    tier300: "Self-Guided 5-Step Wizard",
    tier400: "Guided Setup & Facility Link",
    tier500: "White-Glove Onboarding Assistance",
  },
];

const CORE_PILLARS = [
  {
    title: "1. Factual, Contextual Rebuttals",
    icon: FileText,
    description:
      "When the California Department of Social Services (CCLD) posts an inspection report, the public sees deficiencies without the operator's side of the story. Our platform allows licensed operators to publish factual, evidence-backed rebuttals detailing corrective actions taken, staff retraining, and Title 22 compliance.",
  },
  {
    title: "2. Rigorous Resident Privacy",
    icon: Lock,
    description:
      "Resident dignity is paramount. Our system strictly enforces mandatory redaction of resident names, room numbers, birthdates, and protected health information (PHI). Submissions are verified through our moderation review before anything is made public.",
  },
  {
    title: "3. Independent 24–48h Review",
    icon: Clock,
    description:
      "Every rebuttal undergoes independent moderation before going live. Our review board ensures neutral, non-inflammatory phrasing and confirms that no resident identifying details are present, safeguarding your facility's professionalism.",
  },
  {
    title: "4. Tamper-Evident Watermarked PDFs",
    icon: ShieldCheck,
    description:
      "Approved rebuttals automatically generate official, cryptographically timestamped and watermarked PDFs. These documents serve as verified public records suitable for sharing with licensing analysts, ombudsmen, and prospective families.",
  },
  {
    title: "5. Secure Legal & Attorney Sharing",
    icon: Share2,
    description:
      "Need counsel to review your compliance documents? Generate time-limited, encrypted file links (7-day or 30-day) with real-time access logs and immediate revocation controls.",
  },
  {
    title: "6. Appeal & Deadline Tracking",
    icon: Calendar,
    description:
      "Never miss an Informal Dispute Resolution (IDR) deadline, Plan of Correction (POC) verification, or citation appeal date. Built-in compliance trackers keep your administrative team on schedule.",
  },
];

export default function MembershipGuidePage() {
  return (
    <div className="py-12 md:py-20 bg-[var(--color-bg)] text-[var(--color-text)] min-h-screen transition-colors duration-200">
      <ResponsiveContainer className="max-w-5xl space-y-14">
        
        {/* Header Hero */}
        <header className="text-center space-y-4 max-w-3xl mx-auto">
          <span className="text-xs font-bold text-[var(--color-secondary)] uppercase tracking-[0.25em] block">
            CareHomesSupportDocs.org • Operator Resource
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[var(--color-text)] tracking-tight leading-[1.15]">
            Care Facility Membership Guide &amp; Plan Breakdown
          </h1>
          <p className="text-base sm:text-lg text-[var(--color-muted)] leading-relaxed">
            Everything licensed California care facility operators (RCFE, ARF, Adult Day Care) need to know about our membership tiers, compliance tools, and citation rebuttal protections.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-4">
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg text-sm font-semibold bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary)]/90 transition shadow-sm"
            >
              View Pricing Tiers &amp; Subscribe <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg text-sm font-semibold bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-bg)] transition shadow-sm"
            >
              How It Works
            </Link>
          </div>
        </header>

        {/* Nonprofit Mission Callout */}
        <div className="p-6 rounded-2xl bg-[var(--color-secondary)]/10 border border-[var(--color-secondary)]/25 flex flex-col sm:flex-row items-start gap-4">
          <Award className="h-6 w-6 text-[var(--color-secondary)] shrink-0 mt-1" />
          <div className="space-y-1">
            <h2 className="text-base font-bold text-[var(--color-secondary)]">
              Nonprofit Transparency Guarantee
            </h2>
            <p className="text-sm text-[var(--color-text)] leading-relaxed">
              CareHomesSupportDocs.org is an independent nonprofit platform. We are not a government agency and not affiliated with the California Department of Social Services (CCLD). 100% of membership fees directly fund platform hosting, encrypted storage, independent moderation staff, and security audits.
            </p>
          </div>
        </div>

        {/* Section 1: Core Value Pillars */}
        <section className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text)]">
              What Membership Gives Your Care Home
            </h2>
            <p className="text-sm text-[var(--color-muted)]">
              Built specifically for residential care and assisted living administrators facing one-sided regulatory reports.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {CORE_PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.title}
                  className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm space-y-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-[var(--color-text)]">
                    {pillar.title}
                  </h3>
                  <p className="text-sm text-[var(--color-muted)] leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 2: Detailed Tier Breakdown */}
        <section className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text)]">
              Detailed Plan Breakdown ($300 / $400 / $500 Annual)
            </h2>
            <p className="text-sm text-[var(--color-muted)]">
              Choose the level of facility coverage and operational support that matches your home’s footprint.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            
            {/* $300 Tier */}
            <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6 sm:p-8 flex flex-col justify-between shadow-sm space-y-6">
              <div className="space-y-4">
                <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  Core Single-Facility
                </div>
                <div>
                  <h3 className="text-2xl font-black text-[var(--color-text)]">$300 / year</h3>
                  <p className="text-xs text-[var(--color-muted)] mt-1">Billed annually • 1 Licensed Facility</p>
                </div>
                <p className="text-sm text-[var(--color-muted)] leading-relaxed">
                  Best for independent 6-bed care homes and single-location assisted living operators looking to protect their public reputation.
                </p>

                <hr className="border-[var(--color-border)]" />

                <div className="space-y-2.5 text-sm">
                  <p className="font-semibold text-xs uppercase tracking-wider text-[var(--color-muted)]">What's Included:</p>
                  <ul className="space-y-2 text-xs sm:text-sm text-[var(--color-text)]">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[var(--color-success)] shrink-0 mt-0.5" />
                      <span><strong>1 Facility Claim:</strong> Verified against CCLD public records</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[var(--color-success)] shrink-0 mt-0.5" />
                      <span><strong>Unlimited Rebuttals</strong> for your claimed facility</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[var(--color-success)] shrink-0 mt-0.5" />
                      <span><strong>Watermarked PDFs:</strong> Official authenticated documents</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[var(--color-success)] shrink-0 mt-0.5" />
                      <span><strong>Core Document Library:</strong> Standard Title 22 templates</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[var(--color-success)] shrink-0 mt-0.5" />
                      <span><strong>Compliance Calendar:</strong> Citation deadline tracker</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[var(--color-success)] shrink-0 mt-0.5" />
                      <span><strong>Public Verified Profile:</strong> Display rebuttals publicly</span>
                    </li>
                  </ul>
                </div>
              </div>

              <Link
                href="/pricing"
                className="w-full text-center py-2.5 px-4 rounded-lg bg-[var(--color-primary)] text-white font-semibold text-sm hover:bg-[var(--color-primary)]/90 transition shadow-sm"
              >
                Select $300 Plan
              </Link>
            </div>

            {/* $400 Tier (Popular) */}
            <div className="rounded-2xl bg-[var(--color-surface)] border-2 border-[var(--color-secondary)] p-6 sm:p-8 flex flex-col justify-between shadow-lg relative space-y-6">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[var(--color-secondary)] text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider shadow-sm">
                Most Popular for Multi-Homes
              </div>

              <div className="space-y-4">
                <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[var(--color-secondary)]/10 text-[var(--color-secondary)]">
                  Enhanced Multi-Facility
                </div>
                <div>
                  <h3 className="text-2xl font-black text-[var(--color-text)]">$400 / year</h3>
                  <p className="text-xs text-[var(--color-muted)] mt-1">Billed annually • Up to 3 Licensed Facilities</p>
                </div>
                <p className="text-sm text-[var(--color-muted)] leading-relaxed">
                  Ideal for operators managing 2 to 3 licensed residential homes or expanding care networks needing priority moderation.
                </p>

                <hr className="border-[var(--color-border)]" />

                <div className="space-y-2.5 text-sm">
                  <p className="font-semibold text-xs uppercase tracking-wider text-[var(--color-muted)]">Everything in Core, Plus:</p>
                  <ul className="space-y-2 text-xs sm:text-sm text-[var(--color-text)]">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[var(--color-secondary)] shrink-0 mt-0.5" />
                      <span><strong>Up to 3 Facilities:</strong> Unified multi-home management</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[var(--color-secondary)] shrink-0 mt-0.5" />
                      <span><strong>Priority 48-Hour Moderation:</strong> Faster review turnaround</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[var(--color-secondary)] shrink-0 mt-0.5" />
                      <span><strong>Expanded Document Library:</strong> POC templates &amp; appeal forms</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[var(--color-secondary)] shrink-0 mt-0.5" />
                      <span><strong>Deadline Notification Alerts:</strong> Automated reminders</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[var(--color-secondary)] shrink-0 mt-0.5" />
                      <span><strong>Priority Support:</strong> Expedited email response</span>
                    </li>
                  </ul>
                </div>
              </div>

              <Link
                href="/pricing"
                className="w-full text-center py-2.5 px-4 rounded-lg bg-[var(--color-secondary)] text-white font-semibold text-sm hover:bg-[var(--color-secondary)]/90 transition shadow-sm"
              >
                Select $400 Plan
              </Link>
            </div>

            {/* $500 Tier */}
            <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6 sm:p-8 flex flex-col justify-between shadow-sm space-y-6">
              <div className="space-y-4">
                <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                  Top-Tier / Enterprise Portfolio
                </div>
                <div>
                  <h3 className="text-2xl font-black text-[var(--color-text)]">$500 / year</h3>
                  <p className="text-xs text-[var(--color-muted)] mt-1">Billed annually • Up to 10 Licensed Facilities</p>
                </div>
                <p className="text-sm text-[var(--color-muted)] leading-relaxed">
                  Tailored for established residential care organizations, multi-facility groups, and administrative teams.
                </p>

                <hr className="border-[var(--color-border)]" />

                <div className="space-y-2.5 text-sm">
                  <p className="font-semibold text-xs uppercase tracking-wider text-[var(--color-muted)]">Everything in Enhanced, Plus:</p>
                  <ul className="space-y-2 text-xs sm:text-sm text-[var(--color-text)]">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[var(--color-accent)] shrink-0 mt-0.5" />
                      <span><strong>Up to 10 Facilities:</strong> Full portfolio coverage</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[var(--color-accent)] shrink-0 mt-0.5" />
                      <span><strong>Express Moderation:</strong> Front-of-the-line queue</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[var(--color-accent)] shrink-0 mt-0.5" />
                      <span><strong>Multi-Seat Attorney &amp; Staff Access:</strong> Share links &amp; files</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[var(--color-accent)] shrink-0 mt-0.5" />
                      <span><strong>Complete Template Suite:</strong> All specialized policies &amp; forms</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[var(--color-accent)] shrink-0 mt-0.5" />
                      <span><strong>White-Glove Onboarding:</strong> Dedicated administrator setup</span>
                    </li>
                  </ul>
                </div>
              </div>

              <Link
                href="/pricing"
                className="w-full text-center py-2.5 px-4 rounded-lg bg-[var(--color-primary)] text-white font-semibold text-sm hover:bg-[var(--color-primary)]/90 transition shadow-sm"
              >
                Select $500 Plan
              </Link>
            </div>

          </div>
        </section>

        {/* Section 3: Full Comparison Table */}
        <section className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text)]">
              Feature-by-Feature Comparison Matrix
            </h2>
            <p className="text-sm text-[var(--color-muted)]">
              Compare exact feature entitlements across all three membership tiers.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)] shadow-sm bg-[var(--color-surface)]">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-[var(--color-primary)] text-white">
                  <th className="px-5 py-3.5 font-bold whitespace-nowrap">Feature Area</th>
                  <th className="px-5 py-3.5 font-bold whitespace-nowrap">$300 Tier</th>
                  <th className="px-5 py-3.5 font-bold whitespace-nowrap">$400 Tier</th>
                  <th className="px-5 py-3.5 font-bold whitespace-nowrap">$500 Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {COMPARISON_ROWS.map((row, idx) => (
                  <tr
                    key={row.feature}
                    className={idx % 2 === 0 ? "bg-[var(--color-surface)]" : "bg-[var(--color-bg)]"}
                  >
                    <td className="px-5 py-3.5 font-medium text-[var(--color-text)]">
                      <span className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider block font-semibold">
                        {row.category}
                      </span>
                      {row.feature}
                    </td>
                    <td className="px-5 py-3.5 text-[var(--color-muted)]">{row.tier300}</td>
                    <td className="px-5 py-3.5 font-medium text-[var(--color-text)]">{row.tier400}</td>
                    <td className="px-5 py-3.5 text-[var(--color-text)]">{row.tier500}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 4: 5-Step Getting Started Process */}
        <section className="p-8 sm:p-10 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text)]">
              How to Get Started in 5 Minutes
            </h2>
            <p className="text-sm text-[var(--color-muted)]">
              From signing up to publishing your first compliance rebuttal:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              {
                step: "1",
                title: "Register Account",
                desc: "Create your organization profile with email verification and secure MFA login.",
              },
              {
                step: "2",
                title: "Select Plan",
                desc: "Choose the $300, $400, or $500 tier via encrypted Stripe checkout.",
              },
              {
                step: "3",
                title: "Claim Facility",
                desc: "Search by CCLD license number and link your licensed care facility to your account.",
              },
              {
                step: "4",
                title: "Draft Rebuttal",
                desc: "Write your factual response, cite Title 22 sections, and verify resident redaction.",
              },
              {
                step: "5",
                title: "Live Publication",
                desc: "Our review team approves within 24–48h. Your watermarked rebuttal goes live publicly.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="p-4 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-2"
              >
                <div className="w-7 h-7 rounded-full bg-[var(--color-primary)] text-white text-xs font-bold flex items-center justify-center">
                  {item.step}
                </div>
                <h3 className="text-sm font-bold text-[var(--color-text)]">{item.title}</h3>
                <p className="text-xs text-[var(--color-muted)] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 5: Operator FAQ */}
        <section className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text)]">
              Frequently Asked Questions About Membership
            </h2>
            <p className="text-sm text-[var(--color-muted)]">
              Common questions regarding licensing, renewals, and rebuttal rights.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-2">
              <h3 className="text-sm font-bold text-[var(--color-text)]">
                Can I upgrade my tier later if I acquire more facilities?
              </h3>
              <p className="text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed">
                Yes. You can upgrade from the $300 tier to $400 or $500 at any time from your dashboard billing settings. Stripe handles prorated billing seamlessly so you only pay the difference for your remaining billing cycle.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-2">
              <h3 className="text-sm font-bold text-[var(--color-text)]">
                Does CareHomesSupportDocs.org replace state appeals (IDR)?
              </h3>
              <p className="text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed">
                No. Our platform provides public transparency and official rebuttal documentation for consumers, families, and ombudsmen. You must still file any official state appeals (IDR) directly with your CCLD district office within statutory deadlines.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-2">
              <h3 className="text-sm font-bold text-[var(--color-text)]">
                What happens if my rebuttal requires redactions?
              </h3>
              <p className="text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed">
                If our moderation team identifies resident names or room numbers, the submission status changes to "Fix Requested" with specific reviewer notes. You can edit and resubmit directly from your dashboard without restarting.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-2">
              <h3 className="text-sm font-bold text-[var(--color-text)]">
                How does annual renewal work?
              </h3>
              <p className="text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed">
                Memberships renew automatically once per year. You receive an email reminder before renewal, and you can manage or cancel your auto-renewal at any time through the Stripe customer portal.
              </p>
            </div>
          </div>
        </section>

        {/* Bottom CTA Banner */}
        <div className="p-8 sm:p-12 rounded-3xl bg-[var(--color-primary)] text-white text-center space-y-6 shadow-xl">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight">
            Ready to Protect Your Care Home's Reputation?
          </h2>
          <p className="text-sm sm:text-base text-white/80 max-w-2xl mx-auto leading-relaxed">
            Join licensed California care facility operators who publish professional, compliant responses to regulatory citations. Choose your plan today.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl font-bold bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent)]/90 transition shadow-md text-sm"
            >
              Choose Your Plan &amp; Subscribe <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/facilities"
              className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl font-bold bg-white/10 hover:bg-white/20 text-white transition text-sm"
            >
              Search Facility Directory
            </Link>
          </div>
        </div>

      </ResponsiveContainer>
    </div>
  );
}
