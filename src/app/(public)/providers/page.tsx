import { Metadata } from "next";
import ProvidersClientPage from "./page.client";
import { buildMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Provider Directory",
  description:
    "Find independent attorneys and paralegals specializing in CCLD regulatory compliance, citation defense, and facility operations in California.",
});

export default function ProvidersPage() {
  return <ProvidersClientPage />;
}
