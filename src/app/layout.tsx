import "./globals.css";
import type { Metadata } from "next";
import { AnalyticsConsent } from "@/components/layout/AnalyticsConsent";
import { siteConfig } from "@/lib/site-config";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.tagline,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] transition-colors duration-200">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        {/* GA is configured AND loads only after the visitor allows it (SOW 11.3). */}
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <AnalyticsConsent gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
        )}
      </body>
    </html>
  );
}
