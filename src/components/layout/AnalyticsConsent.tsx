"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { GoogleAnalytics } from "@next/third-parties/google";
import {
  readAnalyticsConsent,
  subscribeAnalyticsConsent,
  writeAnalyticsConsent,
  type AnalyticsConsent as Consent,
} from "@/lib/analytics-consent";

// On the server (and during hydration) nothing is shown and GA is not loaded.
const serverSnapshot = (): Consent | "pending" => "pending";

/**
 * Loads Google Analytics ONLY after the visitor clicks "Allow analytics".
 * Until then no GA script or cookie is set. Rendered by the root layout only
 * when NEXT_PUBLIC_GA_MEASUREMENT_ID is configured.
 */
export function AnalyticsConsent({ gaId }: { gaId: string }) {
  const consent = useSyncExternalStore<Consent | "pending">(subscribeAnalyticsConsent, readAnalyticsConsent, serverSnapshot);

  if (consent === "granted") return <GoogleAnalytics gaId={gaId} />;
  if (consent !== "unset") return null;

  return (
    <div
      role="region"
      aria-label="Analytics choice"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 shadow-lg print:hidden"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--color-text)]">
          We would like to use Google Analytics to count page visits. It only loads if you allow it.{" "}
          <Link href="/privacy" className="font-medium text-[var(--color-primary)] underline">
            Privacy Policy
          </Link>
        </p>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={() => writeAnalyticsConsent("denied")}
            className="min-h-11 rounded-md border border-[var(--color-border)] px-4 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-bg)]"
          >
            No thanks
          </button>
          <button
            type="button"
            onClick={() => writeAnalyticsConsent("granted")}
            className="min-h-11 rounded-md bg-[var(--color-primary)] px-4 text-sm font-medium text-white hover:opacity-90"
          >
            Allow analytics
          </button>
        </div>
      </div>
    </div>
  );
}

/** Footer control so a visitor can change their answer later. */
export function AnalyticsChoiceButton() {
  return (
    <button
      type="button"
      onClick={() => writeAnalyticsConsent("unset")}
      className="min-h-11 text-xs text-white/60 underline hover:text-white"
    >
      Analytics choice
    </button>
  );
}
