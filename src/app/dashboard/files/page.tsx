"use client";

import { useEffect, useState, useCallback } from "react";
import { UploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/lib/uploadthing";

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

export default function FilesPage() {
  const [files, setFiles] = useState<MemberFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "qsf">("all");

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

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  async function handleDelete(id: string, filename: string) {
    if (!confirm(`Delete "${filename}"? This cannot be undone.`)) return;

    try {
      await fetch(`/api/files?id=${id}`, { method: "DELETE" });
      setFiles((prev) => prev.filter((f) => f.id !== id));
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

  const filteredFiles = filter === "qsf"
    ? files.filter((f) => f.isQsfDoc)
    : files;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-[var(--color-primary)] mb-2">
        My Files
      </h1>
      <p className="text-[var(--color-muted)] mb-6">
        Securely store and manage your compliance documents, signed agreements, and QSF governance files.
      </p>

      {/* Legal Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 text-sm text-amber-800">
        <strong>Storage Notice:</strong> Files are stored securely and are only accessible by you and authorized platform administrators. Maximum file size: 25MB. Supported formats: PDF, Word (.docx), JPG, PNG.
      </div>

      {/* Upload Section */}
      <div className="bg-white border border-[var(--color-border)] rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold text-[var(--color-primary)] mb-4">
          Upload Files
        </h2>
        <UploadButton<OurFileRouter, "memberFileUploader">
          endpoint="memberFileUploader"
          onClientUploadComplete={() => {
            fetchFiles();
          }}
          onUploadError={(error) => {
            setError(`Upload failed: ${error.message}`);
          }}
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
              className="bg-white border border-[var(--color-border)] rounded-lg p-4 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-2xl shrink-0">{getFileIcon(file.fileType)}</span>
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 truncate">{file.filename}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-[var(--color-muted)]">
                      {formatBytes(file.fileSize)}
                    </span>
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
    </div>
  );
}
