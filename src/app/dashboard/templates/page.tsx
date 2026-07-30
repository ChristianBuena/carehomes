"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Settings,
  Plus,
  Trash2,
  Download,
  BookOpen,
  Loader2,
  FileText,
  ShieldCheck,
  Scale,
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

type NewTemplateForm = {
  title: string;
  description: string;
  category: TemplateCategory;
  fileFormat: TemplateFileFormat;
  fileUrl: string;
  notionUrl: string;
};

const EMPTY_FORM: NewTemplateForm = {
  title: "",
  description: "",
  category: "REBUTTAL",
  fileFormat: "PDF",
  fileUrl: "",
  notionUrl: "",
};

const CATEGORY_ICONS: Record<TemplateCategory, React.ElementType> = {
  REBUTTAL: FileText,
  CHECKLIST: ShieldCheck,
  GUIDE: Scale,
};

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function ManageTemplatesPage() {
  const router = useRouter();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<NewTemplateForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Fetch all templates (admin sees them all) ───────────────────────────
  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/templates");
      if (res.status === 401 || res.status === 403) {
        router.replace("/dashboard");
        return;
      }
      const data = (await res.json()) as { templates: Template[] };
      setTemplates(data.templates);
    } catch {
      toast.error("Could not load templates.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  // ── Add template ────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.fileUrl) {
      toast.error("Title, description, and file URL are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          notionUrl: form.notionUrl || undefined,
        }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        toast.error(body.error ?? "Failed to create template");
        return;
      }
      toast.success("Template added successfully");
      setForm(EMPTY_FORM);
      setShowForm(false);
      await fetchTemplates();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete template ─────────────────────────────────────────────────────
  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Remove "${title}" from the library? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        toast.error(body.error ?? "Failed to remove template");
        return;
      }
      toast.success(`"${title}" removed from library`);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setDeletingId(null);
    }
  };

  // ── KPI totals ──────────────────────────────────────────────────────────
  const totalDownloads = templates.reduce((acc, t) => acc + t.downloadCount, 0);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
            <Settings className="h-5 w-5 text-[var(--color-primary)]" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[var(--color-text)]">Manage Templates</h2>
            <p className="text-sm text-[var(--color-muted)] mt-0.5">
              Add, review, and remove library resources for members.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          aria-expanded={showForm}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold hover:bg-[var(--color-primary)]/90 transition-colors"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Template
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Templates", value: templates.length, icon: BookOpen },
          { label: "Total Downloads", value: totalDownloads, icon: Download },
          {
            label: "Most Downloaded",
            value: templates.length
              ? templates.reduce((a, b) => (a.downloadCount > b.downloadCount ? a : b)).title.split(" ").slice(0, 3).join(" ") + "…"
              : "—",
            icon: FileText,
          },
        ].map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 flex flex-col gap-1"
          >
            <div className="flex items-center gap-2 text-[var(--color-muted)]">
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="text-xs font-medium">{label}</span>
            </div>
            <p className="text-xl font-bold text-[var(--color-text)] truncate">{value}</p>
          </div>
        ))}
      </div>

      {/* Add template form */}
      {showForm && (
        <form
          onSubmit={(e) => void handleCreate(e)}
          aria-label="Add new template form"
          className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 space-y-4"
        >
          <h3 className="text-base font-bold text-[var(--color-text)]">New Template</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Title */}
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label htmlFor="tmpl-title" className="text-xs font-semibold text-[var(--color-text)]">
                Title <span aria-hidden="true">*</span>
              </label>
              <input
                id="tmpl-title"
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Staffing Ratio Rebuttal Template"
                className="px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label htmlFor="tmpl-desc" className="text-xs font-semibold text-[var(--color-text)]">
                Description <span aria-hidden="true">*</span>
              </label>
              <textarea
                id="tmpl-desc"
                required
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Brief description of what this resource covers…"
                className="px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30 resize-none"
              />
            </div>

            {/* Category */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="tmpl-cat" className="text-xs font-semibold text-[var(--color-text)]">
                Category <span aria-hidden="true">*</span>
              </label>
              <select
                id="tmpl-cat"
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value as TemplateCategory }))
                }
                className="px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
              >
                <option value="REBUTTAL">Rebuttal Template</option>
                <option value="CHECKLIST">Compliance Checklist</option>
                <option value="GUIDE">Regulatory Guide</option>
              </select>
            </div>

            {/* Format */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="tmpl-fmt" className="text-xs font-semibold text-[var(--color-text)]">
                File Format <span aria-hidden="true">*</span>
              </label>
              <select
                id="tmpl-fmt"
                value={form.fileFormat}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fileFormat: e.target.value as TemplateFileFormat }))
                }
                className="px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
              >
                <option value="PDF">PDF</option>
                <option value="DOCX">Word (.docx)</option>
              </select>
            </div>

            {/* File URL */}
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label htmlFor="tmpl-url" className="text-xs font-semibold text-[var(--color-text)]">
                File URL <span aria-hidden="true">*</span>
              </label>
              <input
                id="tmpl-url"
                type="url"
                required
                value={form.fileUrl}
                onChange={(e) => setForm((f) => ({ ...f, fileUrl: e.target.value }))}
                placeholder="/templates/my-template.pdf or https://…"
                className="px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
              />
            </div>

            {/* Notion URL */}
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label htmlFor="tmpl-notion" className="text-xs font-semibold text-[var(--color-text)]">
                Notion URL <span className="text-[var(--color-muted)] font-normal">(optional)</span>
              </label>
              <input
                id="tmpl-notion"
                type="url"
                value={form.notionUrl}
                onChange={(e) => setForm((f) => ({ ...f, notionUrl: e.target.value }))}
                placeholder="https://notion.so/…"
                className="px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-secondary)] text-white text-sm font-semibold hover:bg-[var(--color-secondary)]/90 transition-colors disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="h-4 w-4" aria-hidden="true" />
              )}
              {submitting ? "Saving…" : "Save Template"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
              className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Template list */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-3 text-[var(--color-muted)]">
          <BookOpen className="h-10 w-10 opacity-30" aria-hidden="true" />
          <p className="text-sm">No templates yet. Add your first one above.</p>
        </div>
      ) : (
        <ul role="list" className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-label="Template list">
          {templates.map((template) => {
            const Icon = CATEGORY_ICONS[template.category];
            const isDeleting = deletingId === template.id;

            return (
              <li
                key={template.id}
                className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 shadow-sm flex flex-col gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="h-4 w-4 text-[var(--color-primary)]" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-[var(--color-text)] leading-snug truncate">
                      {template.title}
                    </h3>
                    <p className="text-xs text-[var(--color-muted)] mt-0.5 line-clamp-2">
                      {template.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
                  <div className="flex items-center gap-3 text-xs text-[var(--color-muted)]">
                    <span className="inline-flex items-center gap-1">
                      <Download className="h-3 w-3" aria-hidden="true" />
                      {template.downloadCount} downloads
                    </span>
                    <span className="uppercase font-semibold text-[10px]">
                      {template.fileFormat}
                    </span>
                    <span className="uppercase font-semibold text-[10px]">
                      {template.category}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleDelete(template.id, template.title)}
                    disabled={isDeleting}
                    aria-label={`Remove ${template.title}`}
                    className="inline-flex items-center gap-1 text-xs text-[var(--color-danger)] hover:opacity-80 transition-opacity disabled:opacity-40"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {isDeleting ? "Removing…" : "Remove"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
