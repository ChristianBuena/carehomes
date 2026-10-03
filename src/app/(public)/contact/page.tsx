import type { Metadata } from "next";
import Link from "next/link";
import { ResponsiveContainer } from "@/components/ui/ResponsiveContainer";
import { Button } from "@/components/ui/button";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Contact Us — CareHomesSupportDocs.org",
  description:
    "Get in touch with CareHomesSupportDocs.org for inquiries regarding membership, resources, volunteer opportunities, or website accessibility.",
});

interface TopicCard {
  title: string;
  description: string;
}

const TOPICS: TopicCard[] = [
  {
    title: "Membership inquiries",
    description: "Ask about membership levels and the limited one-month trial.",
  },
  {
    title: "Volunteer & partnerships",
    description: "Share your skills or discuss ways to support the program.",
  },
  {
    title: "Website & accessibility support",
    description:
      "Report an access problem or a website feature that is not working.",
  },
  {
    title: "Corrections & privacy concerns",
    description: "Identify a page that needs correction or review.",
  },
];

export default function ContactPage() {
  return (
    <div className="py-12 md:py-20 bg-[var(--color-bg)] text-[var(--color-text)] min-h-[90vh] transition-colors duration-200">
      <ResponsiveContainer className="max-w-5xl">
        <div className="space-y-10">
          
          {/* Header & Notice */}
          <div className="space-y-4">
            <span className="text-xs font-bold text-[var(--color-accent)] uppercase tracking-[0.2em] block">
              Get in touch
            </span>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-[var(--color-text)] tracking-tight leading-[1.15]">
              Contact us
            </h1>

            <p className="text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed max-w-4xl pt-1">
              <strong className="text-[var(--color-text)] font-semibold">
                ARF and RCFE questions:
              </strong>{" "}
              contact the association for membership, general resources or content corrections. For private service support, use your named commercial provider&apos;s contract contact. For individual legal questions, contact your engaged attorney. New provider and legal intake are unavailable pending approval. Do not send resident details, medical records, IPPs or behavioral plans through public contact channels.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-semibold text-[var(--color-primary)]">
              <Link href="/pricing" className="hover:underline">
                Compare facility tracks
              </Link>
              <span className="text-[var(--color-muted)]" aria-hidden="true">
                ·
              </span>
              <Link href="/independent-providers" className="hover:underline">
                Independent service responsibilities
              </Link>
            </div>

            <p className="text-sm md:text-base text-[var(--color-text)] font-medium pt-3">
              Questions about Care Home Support Docs? Reach out about our program, membership, or ways to get involved.
            </p>
          </div>

          {/* 2-Column Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Card: General Inquiries */}
            <div className="lg:col-span-6 rounded-2xl md:rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="space-y-3">
                <h2 className="text-base font-bold text-[var(--color-text)]">
                  General inquiries
                </h2>

                <a
                  href="mailto:support@carehomessupportdocs.org"
                  className="text-xl sm:text-2xl font-bold text-[var(--color-primary)] hover:underline break-all block"
                >
                  support@carehomessupportdocs.org
                </a>

                <p className="text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed">
                  Email us with your name, the topic of your inquiry, and a brief description of how we can help.
                </p>
              </div>

              <div>
                <Button
                  asChild
                  className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold rounded-full px-7 py-2.5 shadow-md shadow-[var(--color-primary)]/20 text-sm transition-all"
                >
                  <a href="mailto:support@carehomessupportdocs.org">
                    Write an email
                  </a>
                </Button>
              </div>

              <hr className="border-[var(--color-border)]" />

              <div className="space-y-1.5 pt-1">
                <p className="text-xs font-bold text-[var(--color-text)]">
                  Already a member?
                </p>
                <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                  <Link
                    href="/dashboard"
                    className="text-[var(--color-primary)] hover:underline font-medium"
                  >
                    Visit the service center
                  </Link>{" "}
                  for member helpdesk requests.{" "}
                  <Link
                    href="/login"
                    className="text-[var(--color-primary)] hover:underline font-medium"
                  >
                    Sign in
                  </Link>{" "}
                  if needed.
                </p>
              </div>
            </div>

            {/* Right Stack: What can we help with? */}
            <div className="lg:col-span-6 space-y-4">
              <h2 className="text-base sm:text-lg font-bold text-[var(--color-text)]">
                What can we help with?
              </h2>

              <div className="space-y-3.5">
                {TOPICS.map((topic) => (
                  <div
                    key={topic.title}
                    className="rounded-xl sm:rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-4 sm:p-5 hover:border-[var(--color-primary)]/40 transition-colors shadow-sm space-y-1"
                  >
                    <h3 className="text-sm sm:text-base font-bold text-[var(--color-text)]">
                      {topic.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed">
                      {topic.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Email Instructions */}
          <div className="space-y-3 pt-2 text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed">
            <p>
              Email links open your email application with a draft. You review and send the message yourself. If no email application opens, copy the address above into your email service.
            </p>
            <p>
              For website issues, include the page address and a brief description. Please do not email resident records, medical information, passwords, or other sensitive documents.
            </p>
          </div>

          {/* Bottom Section: Contact the responsible service */}
          <div className="pt-8 border-t border-[var(--color-border)] space-y-4">
            <h3 className="text-lg sm:text-xl font-bold text-[var(--color-text)]">
              Contact the responsible service
            </h3>

            <p className="text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed">
              Association questions and website concerns use the contact options above. Optional technology providers and attorneys must publish their own support contacts before contracting or receiving payments. No provider is currently identified for new services. Do not send private facility or legal records to the association.
            </p>

            <p className="text-xs sm:text-sm text-[var(--color-muted)] leading-relaxed">
              For a suspected material data incident, report a brief description through the helpdesk without including sensitive records. Service requirements include designated provider contacts and a 24-hour contractual reporting target once services launch.
            </p>

            <div className="pt-2">
              <Link
                href="/independent-providers"
                className="text-xs sm:text-sm font-semibold text-[var(--color-primary)] hover:underline inline-flex items-center gap-1"
              >
                Independent provider information →
              </Link>
            </div>
          </div>

        </div>
      </ResponsiveContainer>
    </div>
  );
}
