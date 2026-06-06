import Link from "next/link";
import { Shield } from "lucide-react";
import { siteConfig } from "@/lib/site-config";
import { ResponsiveContainer } from "@/components/ui/ResponsiveContainer";

export function GlobalFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[var(--color-primary)] text-white/80 border-t border-[var(--color-border)]" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">
        Footer
      </h2>
      <ResponsiveContainer className="pb-8 pt-12 lg:pt-16">
        <div className="lg:grid lg:grid-cols-4 lg:gap-8">
          
          {/* Col 1: Logo + nonprofit tagline + disclaimer blurb */}
          <div className="space-y-6 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2" aria-label="CareHomesSupportDocs.org Home">
              <Shield className="h-7 w-7 text-[var(--color-accent)]" aria-hidden="true" />
              <span className="text-xl font-bold tracking-tight text-white">
                CareHomesSupportDocs
              </span>
            </Link>
            <p className="text-sm leading-6">
              A nonprofit membership platform helping licensed California care facility operators.
            </p>
            <p className="text-xs leading-5 text-white/60">
              CareHomesSupportDocs.org is a nonprofit platform. We are not a government agency, law firm, or regulatory body.
            </p>
          </div>
          
          {/* Columns 2-4 */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 lg:col-span-3 lg:mt-0">
            {/* Col 2: Platform links */}
            <div>
              <h3 className="text-sm font-semibold leading-6 text-white">Platform</h3>
              <ul role="list" className="mt-6 space-y-4">
                {siteConfig.mainNav.map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="text-sm leading-6 hover:text-white transition-colors">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Col 3: Legal */}
            <div>
              <h3 className="text-sm font-semibold leading-6 text-white">Legal</h3>
              <ul role="list" className="mt-6 space-y-4">
                {siteConfig.footerNav.find(group => group.title === "Legal")?.links.map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="text-sm leading-6 hover:text-white transition-colors">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 4: Contact */}
            <div>
              <h3 className="text-sm font-semibold leading-6 text-white">Contact</h3>
              <ul role="list" className="mt-6 space-y-4">
                <li>
                  <a href={`mailto:${siteConfig.contactEmail}`} className="text-sm leading-6 hover:text-white transition-colors">
                    {siteConfig.contactEmail}
                  </a>
                </li>
              </ul>
              <div className="mt-6 p-4 rounded-md bg-white/5 border border-white/10">
                <p className="text-xs text-white/70 leading-relaxed">
                  <strong>Notice:</strong> We cannot provide legal advice. If you require legal assistance regarding CCLD citations, please consult a qualified attorney.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Copyright bar */}
        <div className="mt-12 md:mt-16 border-t border-white/10 pt-8 flex flex-col md:flex-row md:items-center md:justify-between">
          <p className="text-xs leading-5 text-white/60">
            &copy; {currentYear} CareHomesSupportDocs.org. All rights reserved.
          </p>
          <div className="mt-4 flex space-x-6 md:mt-0">
            {siteConfig.socialLinks.map((item) => (
              <a key={item.platform} href={item.href} className="text-white/60 hover:text-white">
                <span className="sr-only">{item.platform}</span>
                {/* Fallback to text if no specific icon */}
                <span className="text-sm font-medium">{item.platform}</span>
              </a>
            ))}
          </div>
        </div>
      </ResponsiveContainer>
    </footer>
  );
}
