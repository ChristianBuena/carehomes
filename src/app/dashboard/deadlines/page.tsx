"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface CitationDeadline {
  id: string;
  citationId: string;
  dueDate: string;
  notes?: string;
}

function getDaysRemaining(dueDate: string): number {
  const now = new Date();
  const due = new Date(dueDate);
  const diff = due.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getUrgencyStyle(days: number): {
  bg: string;
  text: string;
  badge: string;
  label: string;
} {
  if (days < 0) return { bg: "bg-gray-50 border-gray-200", text: "text-gray-500", badge: "bg-gray-100 text-gray-600", label: "Overdue" };
  if (days < 7) return { bg: "bg-red-50 border-red-200", text: "text-red-700", badge: "bg-red-100 text-red-700", label: `${days}d left` };
  if (days <= 30) return { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", badge: "bg-amber-100 text-amber-700", label: `${days}d left` };
  return { bg: "bg-green-50 border-green-200", text: "text-green-700", badge: "bg-green-100 text-green-700", label: `${days}d left` };
}

const emptyForm = { citationId: "", dueDate: "", notes: "" };

export default function DeadlinesPage() {
  const router = useRouter();
  const [deadlines, setDeadlines] = useState<CitationDeadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDeadlines();
  }, []);

  async function fetchDeadlines() {
    try {
      const res = await fetch("/api/deadlines");
      if (res.status === 403) {
        router.push("/dashboard");
        return;
      }
      const data = await res.json();
      setDeadlines(data);
    } catch {
      setError("Failed to load deadlines");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const method = editingId ? "PUT" : "POST";
      const body = editingId ? { ...form, id: editingId } : form;

      const res = await fetch("/api/deadlines", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save deadline");
        return;
      }

      setForm(emptyForm);
      setEditingId(null);
      fetchDeadlines();
    } catch {
      setError("Failed to save deadline");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this deadline?")) return;

    try {
      await fetch(`/api/deadlines?id=${id}`, { method: "DELETE" });
      fetchDeadlines();
    } catch {
      setError("Failed to delete deadline");
    }
  }

  function handleEdit(deadline: CitationDeadline) {
    setEditingId(deadline.id);
    setForm({
      citationId: deadline.citationId,
      dueDate: new Date(deadline.dueDate).toISOString().split("T")[0],
      notes: deadline.notes ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCancel() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-[var(--color-primary)] mb-2">
        Citation Deadlines
      </h1>
      <p className="text-[var(--color-muted)] mb-6">
        Track your upcoming CCLD citation response deadlines.
      </p>

      {/* Legal Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-8 text-sm text-amber-800">
        ⚠️ <strong>Disclaimer:</strong> Reminders are informational only and do not constitute legal advice. Always consult a licensed attorney for compliance guidance.
      </div>

      {/* Add / Edit Form */}
      <div className="bg-white border border-[var(--color-border)] rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold text-[var(--color-primary)] mb-4">
          {editingId ? "Edit Deadline" : "Add New Deadline"}
        </h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Citation ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. CCLD-2025-001234"
              value={form.citationId}
              onChange={(e) => setForm({ ...form, citationId: e.target.value })}
              required
              className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Due Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              required
              className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              placeholder="Any additional notes about this citation..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="bg-[var(--color-primary)] text-white px-6 py-2 rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50"
            >
              {submitting ? "Saving..." : editingId ? "Update Deadline" : "Add Deadline"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={handleCancel}
                className="border border-[var(--color-border)] text-gray-600 px-6 py-2 rounded-lg font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Deadlines List */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-primary)] mb-4">
          Upcoming Deadlines ({deadlines.length})
        </h2>

        {loading ? (
          <div className="text-center py-8 text-[var(--color-muted)]">Loading...</div>
        ) : deadlines.length === 0 ? (
          <div className="text-center py-8 text-[var(--color-muted)] border border-dashed border-[var(--color-border)] rounded-lg">
            No deadlines added yet. Add your first citation deadline above.
          </div>
        ) : (
          <div className="space-y-3">
            {deadlines.map((deadline) => {
              const days = getDaysRemaining(deadline.dueDate);
              const urgency = getUrgencyStyle(days);

              return (
                <div
                  key={deadline.id}
                  className={`border rounded-lg p-4 flex items-start justify-between gap-4 ${urgency.bg}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-semibold text-gray-800">
                        {deadline.citationId}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${urgency.badge}`}>
                        {urgency.label}
                      </span>
                    </div>
                    <p className={`text-sm ${urgency.text}`}>
                      Due: {new Date(deadline.dueDate).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    {deadline.notes && (
                      <p className="text-sm text-gray-600 mt-1">{deadline.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleEdit(deadline)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(deadline.id)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
