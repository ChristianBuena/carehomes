import type { Metadata } from "next";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Login",
  description:
    "Sign in to your CareHomesSupportDocs.org account to manage memberships, facilities, and regulatory rebuttals.",
});

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}