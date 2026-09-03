import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FileText, Image, FileIcon, Download, Clock, ShieldCheck, AlertTriangle } from "lucide-react";
import Link from "next/link";

// ── Metadata ─────────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "Shared Files | CareHomesSupportDocs",
  description: "Access shared compliance documents.",
  robots: { index: false, follow: false },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileTypeIcon({ type }: { type: string }) {
  if (type === "PDF") return <FileText className="w-6 h-6 text-red-500" aria-hidden="true" />;
  if (type === "DOCX") return <FileText className="w-6 h-6 text-blue-500" aria-hidden="true" />;
  if (type === "JPG" || type === "PNG") return <Image className="w-6 h-6 text-green-500" aria-hidden="true" />;
  return <FileIcon className="w-6 h-6 text-gray-400" aria-hidden="true" />;
}

function expiryLabel(expiry: string, expiresAt: string | null): string {
  if (expiry === "NEVER") return "No expiry";
  if (expiresAt) {
    return `Expires ${new Date(expiresAt).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })}`;
  }
  return "";
}

// ── Data fetching (server-side) ───────────────────────────────────────────────

async function getShareData(token: string) {
  const link = await prisma.fileShareLink.findUnique({
    where: { token },
    include: {
      selectedFiles: {
        include: {
          file: {
            select: {
              filename: true,
              fileUrl: true,
              fileSize: true,
              fileType: true,
              mimeType: true,
              deletedAt: true,
            },
          },
        },
      },
      user: {
        select: { organization: { select: { name: true } } },
      },
    },
  });

  return link;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const link = await getShareData(token);

  if (!link) notFound();

  const isRevoked = !!link.revokedAt;
  const isExpired = !!link.expiresAt && link.expiresAt < new Date();
  const isInvalid = isRevoked || isExpired;

  // Gather files for valid links
  let files: Array<{
    filename: string;
    fileUrl: string;
    fileSize: number;
    fileType: string;
  }> = [];

  if (!isInvalid) {
    if (link.shareAll) {
      const allFiles = await prisma.memberFile.findMany({
        where: { userId: link.userId, deletedAt: null },
        orderBy: { uploadedAt: "desc" },
        select: { filename: true, fileUrl: true, fileSize: true, fileType: true },
      });
      files = allFiles.map((f) => ({ ...f, fileType: f.fileType as string }));
    } else {
      files = link.selectedFiles
        .filter((sf) => !sf.file.deletedAt)
        .map((sf) => ({
          filename: sf.file.filename,
          fileUrl: sf.file.fileUrl,
          fileSize: sf.file.fileSize,
          fileType: sf.file.fileType as string,
        }));
    }
  }

  const orgName = link.user.organization?.name ?? "A CareHomesSupportDocs member";

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      {/* Slim header */}
      <header className="bg-[var(--color-primary)] text-white py-4 px-6 flex items-center justify-between shadow-md">
        <Link href="/" className="text-lg font-bold tracking-tight hover:opacity-80 transition">
          CareHomesSupportDocs
        </Link>
        <span className="text-xs text-white/60 hidden sm:block">
          Secure file sharing for care facility operators
        </span>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10">
        {/* Invalid link */}
        {isInvalid ? (
          <div className="bg-white border border-[var(--color-border)] rounded-2xl p-10 text-center shadow-sm">
            <AlertTriangle
              className="w-14 h-14 text-amber-500 mx-auto mb-4"
              aria-hidden="true"
            />
            <h1 className="text-2xl font-bold text-[var(--color-primary)] mb-2">
              {isRevoked ? "Link Revoked" : "Link Expired"}
            </h1>
            <p className="text-[var(--color-muted)] mb-6">
              {isRevoked
                ? "This share link has been revoked by the sender and is no longer accessible."
                : "This share link has expired. Please ask the sender to generate a new link."}
            </p>
            <p className="text-xs text-[var(--color-muted)]">
              If you believe this is an error, contact the person who sent you this link.
            </p>
          </div>
        ) : (
          <>
            {/* Header card */}
            <div className="bg-white border border-[var(--color-border)] rounded-2xl p-6 mb-6 shadow-sm">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-sm text-[var(--color-muted)] mb-1">Files shared by</p>
                  <h1 className="text-2xl font-bold text-[var(--color-primary)]">
                    {orgName}
                  </h1>
                  <p className="text-sm text-[var(--color-muted)] mt-1">
                    {link.shareAll ? "Full storage access" : `${files.length} file${files.length !== 1 ? "s" : ""} shared`}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-[var(--color-muted)] bg-[var(--color-bg)] px-3 py-2 rounded-lg border border-[var(--color-border)]">
                  <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{expiryLabel(link.expiry, link.expiresAt?.toISOString() ?? null)}</span>
                </div>
              </div>
            </div>

            {/* Legal disclaimer */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 text-sm text-amber-800 flex gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                <strong>Read-only access.</strong> These files are for review purposes only. You
                cannot upload, modify, or delete files through this link. This platform is not a
                government agency and content here does not constitute legal advice.
              </span>
            </div>

            {/* File list */}
            {files.length === 0 ? (
              <div className="text-center py-12 text-[var(--color-muted)] border border-dashed border-[var(--color-border)] rounded-lg">
                No files are currently available in this share.
              </div>
            ) : (
              <div className="space-y-3">
                {files.map((file, i) => (
                  <div
                    key={i}
                    className="bg-white border border-[var(--color-border)] rounded-xl p-4 flex items-center justify-between gap-4 hover:border-[var(--color-secondary)] transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileTypeIcon type={file.fileType} />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 truncate">{file.filename}</p>
                        <p className="text-xs text-[var(--color-muted)] mt-0.5">
                          {file.fileType} · {formatBytes(file.fileSize)}
                        </p>
                      </div>
                    </div>
                    <a
                      href={file.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 shrink-0 text-sm font-medium text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors"
                      aria-label={`Download ${file.filename}`}
                    >
                      <Download className="w-4 h-4" aria-hidden="true" />
                      Download
                    </a>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)] py-4 px-6 text-center text-xs text-[var(--color-muted)]">
        <p>
          <Link href="/" className="hover:underline">CareHomesSupportDocs.org</Link> — Not a government agency.
          Files shared here are provided by platform members, not by CCLD or any regulatory body.
        </p>
      </footer>
    </div>
  );
}
