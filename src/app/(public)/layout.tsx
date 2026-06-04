import { ReactNode } from "react";
import { Inter, Outfit } from "next/font/google";

// These components are assumed to be defined in the components directory
import { GlobalHeader } from "@/components/layout/GlobalHeader";
import { GlobalFooter } from "@/components/layout/GlobalFooter";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

interface PublicLayoutProps {
  children: ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div
      className={`${outfit.variable} ${inter.variable} min-h-screen flex flex-col font-sans bg-[var(--color-bg)] text-[var(--color-text)]`}
    >
      <GlobalHeader />

      <main className="flex-grow">{children}</main>

      <GlobalFooter />
    </div>
  );
}
