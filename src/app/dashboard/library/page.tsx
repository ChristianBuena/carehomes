"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  FileText,
  Scale,
  ClipboardList,
  ShieldCheck,
  Download,
  ExternalLink,
  Search,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type TemplateCategory = "REBUTTAL" | "CHECKLIST" | "GUIDE";
type TemplateFileFormat = "PDF" | "DOCX";

type Template = {
  id: string;
  title: string;
  description: string;
  category: TemplateCategory;
  fileFormat: TemplateFileFormat;
  fileUrl: string;
  notionUrl: string | null;
  downloadCount: number;
  createdAt: string;
  uploadedBy: { name: string } | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_TABS: { label: string; value: TemplateCategory | "ALL" }[] = [
  { label: "All Resources", value: "ALL" },
  { label: "Rebuttal Templates", value: "REBUTTAL" },
  { label: "Compliance Checklists", value: "CHECKLIST" },
  { label: "Regulatory Guides", value: "GUIDE" },
];

const CATEGORY_META: Record<
  TemplateCategory,
  { icon: React.ElementType; color: string; badge: string }
> = {
  REBUTTAL: {
    icon: FileText,
    color: "bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]/20",
    badge: "bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]/20",
  },
  CHECKLIST: {
    icon: ShieldCheck,
    color: "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border-[var(--color-accent)]/20",
    badge: "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border-[var(--color-accent)]/20",
  },
  GUIDE: {
    icon: Scale,
    color: "bg-[var(--color-secondary)]/10 text-[var(--color-secondary)] border-[var(--color-secondary)]/20",
    badge: "bg-[var(--color-secondary)]/10 text-[var(--color-secondary)] border-[var(--color-secondary)]/20",
  },
};

const FORMAT_LABEL: Record<TemplateFileFormat, string> = {
  PDF: "PDF",
  DOCX: "Word",
};

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function MemberLibraryPage() {
  const router = useRouter();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  // ── Fetch templates ─────────────────────────────────────────────────────
  const fetchTemplates = useCallback(async (category: TemplateCategory | "ALL") => {
    setLoading(true);
    try {
      const url =
        category === "ALL"
          ? "/api/templates"
          : `/api/templates?category=${category}`;
      const res = await fetch(url);
      if (res.status === 403) {
        setAccessDenied(true);
        return;
      }
      if (!res.ok) throw new Error("Failed to load templates");
      const data = (await res.json()) as { templates: Template[] };
      setTemplates(data.templates);
    } catch {
      toast.error("Could not load templates. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTemplates(activeCategory);
  }, [activeCategory, fetchTemplates]);

  // Redirect inactive members to pricing
  useEffect(() => {
    if (accessDenied) {
      router.replace("/pricing");
    }
  }, [accessDenied, router]);

  // ── Download handler ────────────────────────────────────────────────────
  const handleDownload = async (template: Template) => {
    setDownloadingId(template.id);
    try {
      const res = await fetch(`/api/templates/${template.id}/download`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        toast.error(body.error ?? "Download failed");
        return;
      }
      const { fileUrl } = (await res.json()) as { fileUrl: string };

      // Trigger browser download
      const a = document.createElement("a");
      a.href = fileUrl;
      a.download = template.title;
      a.click();

      toast.success(`"${template.title}" download started`);

      // Optimistically update local count
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === template.id
            ? { ...t, downloadCount: t.downloadCount + 1 }
            : t
        )
      );
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  // ── Filter by search ────────────────────────────────────────────────────
  const filtered = templates.filter((t) => {
    const q = search.toLowerCase();
    return (
      !q ||
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q)
    );
  });

  // ── Loading state ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
            <BookOpen className="h-5 w-5 text-[var(--color-primary)]" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[var(--color-text)]">Member Library</h2>
            <p className="text-sm text-[var(--color-muted)] mt-0.5">
              Templates, guides, and compliance resources for California RCFE operators.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-44 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
          <BookOpen className="h-5 w-5 text-[var(--color-primary)]" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-text)]">Member Library</h2>
          <p className="text-sm text-[var(--color-muted)] mt-0.5">
            Templates, guides, and compliance resources for California RCFE operators.
          </p>
        </div>
      </div>

      {/* Legal disclaimer */}
      <div className="flex items-start gap-3 bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30 px-4 py-3 rounded-lg text-sm text-[var(--color-text)]">
        <ShieldCheck className="h-4 w-4 text-[var(--color-warning)] shrink-0 mt-0.5" aria-hidden="true" />
        <span>
          These resources are for informational purposes only and do{" "}
          <strong>not</strong> constitute legal advice. Consult a licensed
          attorney for guidance specific to your situation.
        </span>
      </div>

      {/* Notion Knowledge Base callout */}
      <div className="flex items-start gap-3 bg-[var(--color-secondary)]/8 border border-[var(--color-secondary)]/25 px-4 py-3 rounded-lg text-sm text-[var(--color-text)]">
        <ClipboardList className="h-4 w-4 text-[var(--color-secondary)] shrink-0 mt-0.5" aria-hidden="true" />
        <span>
          These templates complement the{" "}
          <strong>CareHomesSupportDocs Notion Knowledge Base</strong> — your
          central hub for regulatory guidance, SOW references, and operator
          workflows.{" "}
          <a
            href="https://notion.so"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-[var(--color-secondary)] underline underline-offset-2 hover:opacity-80 transition"
          >
            Open Knowledge Base <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        </span>
      </div>

      {/* Interactive Forms Callout */}
      <div className="bg-white border border-[var(--color-border)] rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-[var(--color-primary)]" />
          <h3 className="font-bold text-[var(--color-text)]">Interactive Fillable Forms</h3>
        </div>
        <p className="text-sm text-[var(--color-muted)] leading-relaxed">
          Need to generate compliance documents? Use our interactive web forms to generate print-ready PDFs directly from your browser, no external software required.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => router.push("/dashboard/forms/rebuttal")}
            className="px-4 py-2 bg-[var(--color-primary)] text-white text-sm font-medium rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors text-center"
          >
            Facility Rebuttal Response Form
          </button>
          <button
            onClick={() => router.push("/dashboard/forms/redaction")}
            className="px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] text-sm font-medium rounded-lg hover:border-[var(--color-primary)]/40 hover:text-[var(--color-primary)] transition-colors text-center"
          >
            Redaction Attestation Form
          </button>
        </div>
      </div>

      {/* Category tabs + search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Filter templates by category"
          className="flex flex-wrap gap-2 flex-1"
        >
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.value}
              role="tab"
              aria-selected={activeCategory === tab.value}
              onClick={() => setActiveCategory(tab.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                activeCategory === tab.value
                  ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                  : "bg-[var(--color-surface)] text-[var(--color-muted)] border-[var(--color-border)] hover:border-[var(--color-primary)]/40 hover:text-[var(--color-text)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative sm:w-56 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-muted)]" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search templates"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
          />
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-3 text-[var(--color-muted)]">
          <BookOpen className="h-10 w-10 opacity-30" aria-hidden="true" />
          <p className="text-sm">No templates match your search.</p>
        </div>
      ) : (
        <ul
          role="list"
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
          aria-label="Template list"
        >
          {filtered.map((template) => {
            const meta = CATEGORY_META[template.category];
            const Icon = meta.icon;
            const isDownloading = downloadingId === template.id;

            return (
              <li
                key={template.id}
                className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 shadow-sm flex flex-col gap-3 hover:border-[var(--color-primary)]/30 transition-colors"
              >
                {/* Title row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${meta.color}`}>
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <h3 className="text-sm font-semibold text-[var(--color-text)] leading-snug">
                      {template.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${meta.badge}`}
                    >
                      {template.category === "REBUTTAL"
                        ? "Template"
                        : template.category === "CHECKLIST"
                        ? "Checklist"
                        : "Guide"}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider bg-[var(--color-bg)] text-[var(--color-muted)] border-[var(--color-border)]">
                      {FORMAT_LABEL[template.fileFormat]}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-[var(--color-muted)] leading-relaxed">
                  {template.description}
                </p>

                {/* Footer */}
                <div className="mt-auto pt-3 border-t border-[var(--color-border)] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* Download button */}
                    <button
                      type="button"
                      onClick={() => void handleDownload(template)}
                      disabled={isDownloading}
                      aria-label={`Download ${template.title}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-secondary)] hover:text-[var(--color-secondary)]/80 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isDownloading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Download className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {isDownloading ? "Downloading…" : "Download"}
                    </button>

                    {/* Notion link */}
                    {template.notionUrl && (
                      <a
                        href={template.notionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open Notion page for ${template.title}`}
                        className="inline-flex items-center gap-1 text-xs text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        Notion
                      </a>
                    )}
                  </div>

                  {/* Download count */}
                  <span className="text-[11px] text-[var(--color-muted)] tabular-nums">
                    {template.downloadCount}{" "}
                    {template.downloadCount === 1 ? "download" : "downloads"}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
