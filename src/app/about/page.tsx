import type { Metadata } from "next"
import { buildMetadata } from "@/lib/metadata"

export const metadata: Metadata = buildMetadata({
  title: "About Us — CareHomesSupportDocs.org",
  description:
    "Learn about CareHomesSupportDocs.org, our mission, and how we help licensed California care facility operators manage and publish regulatory rebuttals with transparency and compliance.",

});

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto p-10">
      <h1 className="text-3xl font-bold mb-4">About Us</h1>

      <p className="text-[var(--color-text-secondary)] mb-4">
        CareHomeSupport is a platform designed to help users find and explore care home facilities easily and efficiently.
      </p>

      <p className="text-[var(--color-text-secondary)] mb-4">
        We aim to provide transparent information, better accessibility, and a smoother experience for families and individuals looking for care services.
      </p>

      <p className="text-[var(--color-muted)] text-sm">
        More details coming soon as we continue building the platform.
      </p>
    </div>
  )
}