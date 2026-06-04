import { Metadata } from "next";
import ProvidersClientPage from "./page.client";

export const metadata: Metadata = {
  title: "Provider Directory | CareHomesSupportDocs",
  description:
    "Find independent attorneys and paralegals specializing in CCLD regulatory compliance, citation defense, and facility operations in California.",
};

export default function ProvidersPage() {
  return <ProvidersClientPage />;
}
