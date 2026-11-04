/**
 * Log-safe summary of an email error: name and codes only. Nodemailer errors
 * can carry the recipient address in their message or SMTP response, so the
 * error object itself is never logged.
 */
export function describeMailError(error: unknown): string {
  if (!(error instanceof Error)) return "unknown error";
  const e = error as Error & { code?: unknown; responseCode?: unknown; command?: unknown };
  return [e.name, e.code, e.responseCode, e.command]
    .filter((v) => typeof v === "string" || typeof v === "number")
    .join(" ") || "Error";
}
