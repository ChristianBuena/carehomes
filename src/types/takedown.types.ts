export type TakedownStatus = "PENDING" | "IN_REVIEW" | "RESOLVED" | "REJECTED";

export type TakedownReason =
  | "PRIVACY_PII_PHI"
  | "INACCURATE_INFORMATION"
  | "DEFAMATION_HARASSMENT"
  | "COURT_ORDER"
  | "COPYRIGHT_IP"
  | "OTHER";

export const TAKEDOWN_REASONS: TakedownReason[] = [
  "PRIVACY_PII_PHI",
  "INACCURATE_INFORMATION",
  "DEFAMATION_HARASSMENT",
  "COURT_ORDER",
  "COPYRIGHT_IP",
  "OTHER",
];

export const TAKEDOWN_STATUSES: TakedownStatus[] = [
  "PENDING",
  "IN_REVIEW",
  "RESOLVED",
  "REJECTED",
];
