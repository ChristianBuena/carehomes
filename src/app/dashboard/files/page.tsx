"use client";

import { useEffect, useState, useCallback } from "react";
import { UploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/lib/uploadthing";
import {
  Share2,
  X,
  Copy,
  Check,
  Trash2,
  LinkIcon,
  Clock,
  Eye,
} from "lucide-react";
import type { ShareLinkExpiry, ShareLinkSummary, CreateShareLinkResponse } from "@/types/share";

// ── Local types ───────────────────────────────────────────────────────────────

interface MemberFile {
  id: string;
  filename: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  mimeType: string;
  label?: string;
  isQsfDoc: boolean;
  uploadedAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(fileType: string): string {
  if (fileType === "PDF") return "📄";
  if (fileType === "DOCX") return "📝";
  if (fileType === "JPG" || fileType === "PNG") return "🖼️";
  return "📎";
}

function expiryLabel(link: ShareLinkSummary): string {
  if (link.expiry === "NEVER") return "No expiry";
  if (link.expiresAt) {
    return `Expires ${new Date(link.expiresAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  }
  return "";
}

// ── Share Dialog ──────────────────────────────────────────────────────────────

function ShareDialog({
  mode,
  selectedCount,
  onConfirm,
  onClose,
}: {
  mode: "selected" | "all";
  selectedCount: number;
  onConfirm: (expiry: ShareLinkExpiry) => void;
  onClose: () => void;
}) {
  const [expiry, setExpiry] = useState<ShareLinkExpiry>("7d");

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-primary)]">
              {mode === "all" ? "Share All Files" : `Share ${selectedCount} File${selectedCount !== 1 ? "s" : ""}`}
            </h2>
            <p className="text-sm text-[var(--color-muted)] mt-0.5">
              Generate a secure link your attorney can access without logging in.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--color-muted)] hover:text-gray-700 transition"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Link expiry
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(["7d", "30d", null] as ShareLinkExpiry[]).map((opt) => (
              <button
                key={String(opt)}
                onClick={() => setExpiry(opt)}
                className={`py-2 px-3 rounded-lg border text-sm font-medium transition ${
                  expiry === opt
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                    : "border-[var(--color-border)] text-gray-600 hover:bg-gray-50"
                }`}
              >
                {opt === "7d" ? "7 days" : opt === "30d" ? "30 days" : "No expiry"}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-800 mb-6">
          Recipients can <strong>view and download</strong> files but cannot upload, edit, or delete them. Access is logged for your audit trail.
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 border border-[var(--color-border)] rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(expiry)}
            className="flex-1 py-2 px-4 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition"
          >
            Generate Link
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Share Result Modal ────────────────────────────────────────────────────────

function ShareResultModal({
  result,
  onClose,
}: {
  result: CreateShareLinkResponse;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(result.shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <LinkIcon className="w-7 h-7 text-green-600" />
          </div>
          <h2 className="text-lg font-bold text-[var(--color-primary)]">Share Link Created!</h2>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            {result.shareAll
              ? "All your files are shared."
              : `${result.fileCount} file${result.fileCount !== 1 ? "s" : ""} shared.`}{" "}
            {result.expiresAt
              ? `Expires ${new Date(result.expiresAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.`
              : "No expiry."}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 mb-4">
          <span className="flex-1 text-sm text-gray-700 truncate font-mono">{result.shareUrl}</span>
          <button
            onClick={handleCopy}
            className="shrink-0 text-[var(--color-primary)] hover:opacity-80 transition"
            aria-label="Copy link"
          >
            {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2 px-4 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition"
        >
          Done
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function FilesPage() {
  const [files, setFiles] = useState<MemberFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "qsf">("all");

  // Selection state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Share dialog / result
  const [shareDialog, setShareDialog] = useState<{ mode: "selected" | "all" } | null>(null);
  const [shareResult, setShareResult] = useState<CreateShareLinkResponse | null>(null);
  const [sharing, setSharing] = useState(false);

  // Active share links
  const [shareLinks, setShareLinks] = useState<ShareLinkSummary[]>([]);
  const [linksLoading, setLinksLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch("/api/files");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setFiles(data);
    } catch {
      setError("Failed to load files");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchShareLinks = useCallback(async () => {
    try {
      const res = await fetch("/api/files/share");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setShareLinks(data);
    } catch {
      // Non-fatal
    } finally {
      setLinksLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
    fetchShareLinks();
  }, [fetchFiles, fetchShareLinks]);

  // ── File actions ───────────────────────────────────────────────────────────

  async function handleDelete(id: string, filename: string) {
    if (!confirm(`Delete "${filename}"? This cannot be undone.`)) return;
    try {
      await fetch(`/api/files?id=${id}`, { method: "DELETE" });
      setFiles((prev) => prev.filter((f) => f.id !== id));
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    } catch {
      setError("Failed to delete file");
    }
  }

  async function toggleQsf(file: MemberFile) {
    try {
      await fetch("/api/files", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: file.id, isQsfDoc: !file.isQsfDoc }),
      });
      setFiles((prev) =>
        prev.map((f) => (f.id === file.id ? { ...f, isQsfDoc: !f.isQsfDoc } : f))
      );
    } catch {
      setError("Failed to update file");
    }
  }

  // ── Selection actions ──────────────────────────────────────────────────────

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredFiles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredFiles.map((f) => f.id)));
    }
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  // ── Share actions ──────────────────────────────────────────────────────────

  async function handleShareConfirm(expiry: ShareLinkExpiry) {
    if (!shareDialog) return;
    setSharing(true);
    try {
      const body =
        shareDialog.mode === "all"
          ? { shareAll: true, expiry }
          : { shareAll: false, fileIds: Array.from(selectedIds), expiry };

      const res = await fetch("/api/files/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to create share link");

      const data: CreateShareLinkResponse = await res.json();
      setShareResult(data);
      setShareDialog(null);
      fetchShareLinks();
    } catch {
      setError("Failed to create share link");
    } finally {
      setSharing(false);
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm("Revoke this share link? Anyone using it will immediately lose access.")) return;
    setRevoking(id);
    try {
      await fetch(`/api/files/share/${id}`, { method: "DELETE" });
      setShareLinks((prev) => prev.filter((l) => l.id !== id));
    } catch {
      setError("Failed to revoke share link");
    } finally {
      setRevoking(null);
    }
  }

  // ── Derived data ───────────────────────────────────────────────────────────

  const filteredFiles = filter === "qsf" ? files.filter((f) => f.isQsfDoc) : files;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between gap-4 mb-2 flex-wrap">
        <h1 className="text-3xl font-bold text-[var(--color-primary)]">My Files</h1>
        <div className="flex gap-2">
          {!selectMode ? (
            <>
              <button
                onClick={() => setSelectMode(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium border border-[var(--color-border)] rounded-lg text-gray-600 hover:bg-gray-50 transition"
              >
                <Share2 size={15} />
                Select to share
              </button>
              <button
                onClick={() => setShareDialog({ mode: "all" })}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-[var(--color-secondary)] text-white rounded-lg hover:opacity-90 transition"
              >
                <Share2 size={15} />
                Share all files
              </button>
            </>
          ) : (
            <>
              <button
                onClick={toggleSelectAll}
                className="px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg text-gray-600 hover:bg-gray-50 transition"
              >
                {selectedIds.size === filteredFiles.length ? "Deselect all" : "Select all"}
              </button>
              <button
                disabled={selectedIds.size === 0 || sharing}
                onClick={() => setShareDialog({ mode: "selected" })}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Share2 size={15} />
                Share selected ({selectedIds.size})
              </button>
              <button
                onClick={exitSelectMode}
                className="p-2 text-[var(--color-muted)] hover:text-gray-700 transition"
                aria-label="Cancel selection"
              >
                <X size={18} />
              </button>
            </>
          )}
        </div>
      </div>

      <p className="text-[var(--color-muted)] mb-6">
        Securely store and manage your compliance documents. Share files with your attorney via a secure link.
      </p>

      {/* Legal Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 text-sm text-amber-800">
        <strong>Storage Notice:</strong> Files are stored securely and are only accessible by you and authorized platform administrators. Maximum file size: 16MB. Supported formats: PDF, Word (.docx), JPG, PNG.
      </div>

      {/* Upload Section */}
      <div className="bg-white border border-[var(--color-border)] rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold text-[var(--color-primary)] mb-4">Upload Files</h2>
        <UploadButton<OurFileRouter, "memberFileUploader">
          endpoint="memberFileUploader"
          onClientUploadComplete={() => { fetchFiles(); }}
          onUploadError={(error) => { setError(`Upload failed: ${error.message}`); }}
          appearance={{
            button: "bg-[var(--color-primary)] text-white px-6 py-2 rounded-lg font-medium hover:opacity-90 transition",
            allowedContent: "text-[var(--color-muted)] text-sm mt-2",
          }}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === "all"
            ? "bg-[var(--color-primary)] text-white"
            : "border border-[var(--color-border)] text-gray-600 hover:bg-gray-50"
          }`}
        >
          All Files ({files.length})
        </button>
        <button
          onClick={() => setFilter("qsf")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === "qsf"
            ? "bg-[var(--color-primary)] text-white"
            : "border border-[var(--color-border)] text-gray-600 hover:bg-gray-50"
          }`}
        >
          QSF Documents ({files.filter((f) => f.isQsfDoc).length})
        </button>
      </div>

      {/* Files List */}
      {loading ? (
        <div className="text-center py-8 text-[var(--color-muted)]">Loading...</div>
      ) : filteredFiles.length === 0 ? (
        <div className="text-center py-12 text-[var(--color-muted)] border border-dashed border-[var(--color-border)] rounded-lg">
          {filter === "qsf"
            ? "No QSF documents yet. Upload a file and mark it as a QSF document."
            : "No files yet. Upload your first document above."}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              className={`bg-white border rounded-lg p-4 flex items-center gap-4 transition-colors ${
                selectMode && selectedIds.has(file.id)
                  ? "border-[var(--color-primary)] bg-blue-50/40"
                  : "border-[var(--color-border)]"
              }`}
            >
              {/* Checkbox (select mode) */}
              {selectMode && (
                <input
                  type="checkbox"
                  checked={selectedIds.has(file.id)}
                  onChange={() => toggleSelect(file.id)}
                  className="w-4 h-4 accent-[var(--color-primary)] shrink-0 cursor-pointer"
                  aria-label={`Select ${file.filename}`}
                />
              )}

              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-2xl shrink-0">{getFileIcon(file.fileType)}</span>
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 truncate">{file.filename}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-[var(--color-muted)]">{formatBytes(file.fileSize)}</span>
                    <span className="text-xs text-[var(--color-muted)]">•</span>
                    <span className="text-xs text-[var(--color-muted)]">
                      {new Date(file.uploadedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    {file.isQsfDoc && (
                      <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        QSF Document
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleQsf(file)}
                  className="text-xs text-blue-600 hover:underline"
                  title={file.isQsfDoc ? "Remove QSF tag" : "Mark as QSF document"}
                >
                  {file.isQsfDoc ? "Untag QSF" : "Tag QSF"}
                </button>
                <a
                  href={file.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--color-primary)] hover:underline"
                >
                  Download
                </a>
                <button
                  onClick={() => handleDelete(file.id, file.filename)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Active Share Links ─────────────────────────────────────────────── */}
      <section className="mt-12">
        <h2 className="text-xl font-bold text-[var(--color-primary)] mb-1">Active Share Links</h2>
        <p className="text-sm text-[var(--color-muted)] mb-4">
          Links you&apos;ve generated for attorneys. Revoke any link to immediately block access.
        </p>

        {linksLoading ? (
          <div className="text-center py-6 text-[var(--color-muted)] text-sm">Loading links...</div>
        ) : shareLinks.length === 0 ? (
          <div className="text-center py-10 text-[var(--color-muted)] border border-dashed border-[var(--color-border)] rounded-lg text-sm">
            No active share links. Use the &ldquo;Share&rdquo; buttons above to create one.
          </div>
        ) : (
          <div className="space-y-3">
            {shareLinks.map((link) => (
              <div
                key={link.id}
                className="bg-white border border-[var(--color-border)] rounded-lg p-4"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-800">
                        {link.shareAll ? "All files (dynamic)" : `${link.fileCount} file${link.fileCount !== 1 ? "s" : ""}`}
                      </span>
                      <span className="text-xs bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-muted)] px-2 py-0.5 rounded-full font-mono">
                        {link.token.slice(0, 12)}…
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[var(--color-muted)] flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock size={12} aria-hidden="true" />
                        {expiryLabel(link)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye size={12} aria-hidden="true" />
                        {link.accessCount} access{link.accessCount !== 1 ? "es" : ""}
                        {link.lastAccessedAt
                          ? ` · last ${new Date(link.lastAccessedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                          : " · not yet accessed"}
                      </span>
                      <span>
                        Created {new Date(link.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <CopyLinkButton
                      token={link.token}
                    />
                    <button
                      onClick={() => handleRevoke(link.id)}
                      disabled={revoking === link.id}
                      className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg transition disabled:opacity-40"
                      aria-label="Revoke share link"
                    >
                      <Trash2 size={13} aria-hidden="true" />
                      {revoking === link.id ? "Revoking…" : "Revoke"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Dialogs */}
      {shareDialog && (
        <ShareDialog
          mode={shareDialog.mode}
          selectedCount={selectedIds.size}
          onConfirm={handleShareConfirm}
          onClose={() => setShareDialog(null)}
        />
      )}

      {shareResult && (
        <ShareResultModal
          result={shareResult}
          onClose={() => {
            setShareResult(null);
            exitSelectMode();
          }}
        />
      )}
    </div>
  );
}

// ── Copy Link Button (isolated to prevent full page re-renders) ───────────────

function CopyLinkButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const url = `${window.location.origin}/share/${token}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs text-[var(--color-primary)] border border-[var(--color-border)] hover:border-[var(--color-primary)] px-3 py-1.5 rounded-lg transition"
      aria-label="Copy share link"
    >
      {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}
