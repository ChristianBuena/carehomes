/**
 * Google Analytics consent (SOW 11.3 "limit PII"). The visitor's choice is
 * kept in this browser only; GA loads only after an explicit "Allow".
 */
export type AnalyticsConsent = "granted" | "denied" | "unset";

export const ANALYTICS_CONSENT_KEY = "analytics-consent";
const CHANGE_EVENT = "analytics-consent-change";

export function readAnalyticsConsent(): AnalyticsConsent {
  try {
    const v = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : "unset";
  } catch {
    return "unset";
  }
}

export function writeAnalyticsConsent(value: AnalyticsConsent): void {
  try {
    if (value === "unset") window.localStorage.removeItem(ANALYTICS_CONSENT_KEY);
    else window.localStorage.setItem(ANALYTICS_CONSENT_KEY, value);
  } catch {
    // Storage blocked: the choice lasts for this page view only.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeAnalyticsConsent(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
