// ─────────────────────────────────────────────────────────────────────────────
// CH-42: Attorney File Sharing — shared types
// ─────────────────────────────────────────────────────────────────────────────

export type ShareLinkExpiry = "7d" | "30d" | null;

/** Slim file descriptor returned on the public share page */
export interface ShareAccessFile {
  filename: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  mimeType: string;
}

/** One active share link entry shown on the member's dashboard */
export interface ShareLinkSummary {
  id: string;
  token: string;
  shareAll: boolean;
  expiry: "DAYS_7" | "DAYS_30" | "NEVER";
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  fileCount: number;        // 0 when shareAll = true (means "all")
  accessCount: number;
  lastAccessedAt: string | null;
}

/** Response body from POST /api/files/share */
export interface CreateShareLinkResponse {
  id: string;
  token: string;
  shareUrl: string;
  shareAll: boolean;
  expiry: "DAYS_7" | "DAYS_30" | "NEVER";
  expiresAt: string | null;
  fileCount: number;
}

/** Response body from GET /api/share/[token] (public, no auth) */
export interface PublicShareResponse {
  shareAll: boolean;
  expiry: "DAYS_7" | "DAYS_30" | "NEVER";
  expiresAt: string | null;
  createdAt: string;
  files: ShareAccessFile[];
}
