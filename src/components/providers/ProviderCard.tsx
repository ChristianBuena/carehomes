import Link from "next/link";
import { Mail, Globe, MapPin, Scale, Briefcase, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Provider } from "@/lib/mock-data/providers";
import { cn } from "@/lib/utils";

export function ProviderCard({ provider }: { provider: Provider }) {
  const isAttorney = provider.type === "attorney";

  const contactHref = provider.contactEmail
    ? `mailto:${provider.contactEmail}`
    : provider.website;

  const isExternal = !provider.contactEmail && provider.website;

  return (
    <article className="flex flex-col md:flex-row gap-6 p-6 border border-[var(--color-border)] rounded-xl bg-[var(--color-surface)] shadow-sm hover:shadow-md transition-shadow">
      <div className="flex-1 space-y-4">
        <header className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h3 className="text-xl font-bold text-[var(--color-primary)]">
              {provider.name}
            </h3>
            <div className="font-medium text-[var(--color-text)] mt-1">
              {provider.specialty}
            </div>
            <div className="text-sm text-[var(--color-muted)] flex items-center gap-1.5 mt-1.5">
              <MapPin className="w-4 h-4 shrink-0" />
              {provider.location}
            </div>
          </div>
          <Badge
            variant={isAttorney ? "default" : "secondary"}
            className={cn(
              "shrink-0",
              isAttorney
                ? "bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90"
                : "bg-[var(--color-secondary)] hover:bg-[var(--color-secondary)]/90 text-[var(--color-surface)]"
            )}
          >
            {isAttorney ? (
              <Scale className="w-3.5 h-3.5 mr-1.5" />
            ) : (
              <Briefcase className="w-3.5 h-3.5 mr-1.5" />
            )}
            <span className="capitalize">{provider.type}</span>
          </Badge>
        </header>

        <p className="text-sm text-[var(--color-text)] leading-relaxed line-clamp-3">
          {provider.bio}
        </p>

        <div className="text-xs text-[var(--color-muted)] italic bg-[var(--color-bg)] p-2.5 rounded-md inline-block">
          Not vetted or endorsed by CareHomesSupportDocs.org
        </div>
      </div>

      <div className="md:w-56 flex flex-col justify-center shrink-0 border-t md:border-t-0 md:border-l border-[var(--color-border)] pt-4 md:pt-0 md:pl-6">
        {contactHref && (
          <Button asChild className="w-full">
            <a
              href={contactHref}
              target={isExternal ? "_blank" : undefined}
              rel={isExternal ? "noopener noreferrer" : undefined}
              aria-label={
                isExternal
                  ? `Visit ${provider.name}'s website (opens in new tab)`
                  : `Email ${provider.name}`
              }
            >
              {isExternal ? (
                <>
                  <Globe className="w-4 h-4 mr-2" />
                  Visit Website
                  <ExternalLink className="w-3 h-3 ml-2" />
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Contact Provider
                </>
              )}
            </a>
          </Button>
        )}
      </div>
    </article>
  );
}
