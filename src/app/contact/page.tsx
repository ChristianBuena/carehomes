import type { Metadata } from "next";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Contact Us",
  description:
    "Contact CareHomesSupportDocs.comr questions about memberships, regulatory rebuttals, platform support, and general inquiries.",
});

export default function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto p-10">
      <h1 className="text-3xl font-bold mb-4">Contact Us</h1>

      <p className="text-[var(--color-text-secondary)] mb-6">
        Have questions or need support? Reach out to us.
      </p>

      <div className="space-y-2 text-[var(--color-text-secondary)]">
        <p>Email: support@carehomesupport.com</p>
        <p>Phone: (coming soon)</p>
        <p>Location: California, USA</p>
      </div>

      <p className="text-[var(--color-muted)] text-sm mt-6">
        Contact form will be added in a later update.
      </p>
    </div>
  );
}