"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
  CheckCircle,
  Loader2,
  Users,
  Clock,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ReviewUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  lastReviewedAt: string | null;
  lastReview: {
    reviewedAt: string;
    decision: "KEEP_ACCESS" | "CHANGE_REQUESTED";
    reviewer: { id: string; name: string } | null;
  } | null;
  organization: {
    membership: {
      plan: string;
      status: string;
    } | null;
  } | null;
}

export default function AccessReviewPage() {
  const router = useRouter();
  const [users, setUsers] = useState<ReviewUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [changeFor, setChangeFor] = useState<string | null>(null);
  const [changeNotes, setChangeNotes] = useState("");

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/access-review");
      if (!res.ok) {
        if (res.status === 403) {
          router.push("/dashboard");
          return;
        }
        throw new Error("Failed to load users");
      }
      const data = await res.json();
      setUsers(data.users);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleMarkReviewed = async (
    userId: string,
    decision: "KEEP_ACCESS" | "CHANGE_REQUESTED" = "KEEP_ACCESS",
    notes?: string
  ) => {
    setMarkingId(userId);
    setError(null);
    try {
      const res = await fetch("/api/admin/access-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, decision, notes }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Failed to record the review");
      }
      // Remove from the local list immediately
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setChangeFor(null);
      setChangeNotes("");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setMarkingId(null);
    }
  };

  const daysSince = (date: string | null): string => {
    if (!date) return "Never reviewed";
    const days = Math.floor(
      (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
    );
    return `${days} days ago`;
  };

  if (loading) {
    return (
      <div className="bg-[var(--color-bg)] min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-bg)] min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-6">
          <div>
            <Link
              href="/dashboard/moderation"
              className="inline-flex items-center gap-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors mb-3"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Moderation
            </Link>
            <h1 className="text-3xl font-bold text-[var(--color-text)] flex items-center gap-3">
              <ShieldCheck
                className="h-8 w-8 text-[var(--color-secondary)]"
                aria-hidden="true"
              />
              Quarterly Access Review
            </h1>
            <p className="mt-2 text-[var(--color-muted)]">
              Review member accounts that haven&apos;t been verified in the last 90
              days. Confirm they still hold valid facility licenses.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-4 py-3 flex items-center gap-3 shadow-sm">
              <Users className="h-4 w-4 text-[var(--color-warning)]" aria-hidden="true" />
              <span className="text-sm font-medium text-[var(--color-text)]">
                {users.length} account{users.length !== 1 ? "s" : ""} need review
              </span>
            </div>
            <a
              href="/api/admin/access-review/export"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm font-medium text-[var(--color-primary)] shadow-sm hover:bg-[var(--color-bg)]"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Export review record (CSV, last 90 days)
            </a>
          </div>
        </div>

        {error && (
          <div className="bg-[var(--color-danger)]/10 text-[var(--color-danger)] p-4 rounded-lg flex gap-3 text-sm font-medium">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Content */}
        {users.length === 0 ? (
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-16 text-center shadow-sm">
            <CheckCircle
              className="h-12 w-12 text-[var(--color-success)] mx-auto mb-4"
              aria-hidden="true"
            />
            <p className="text-xl font-bold text-[var(--color-text)]">
              All accounts reviewed
            </p>
            <p className="text-[var(--color-muted)] mt-2">
              No accounts currently require a quarterly access review.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {users.map((user) => (
              <div
                key={user.id}
                className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-[var(--color-text)]">
                      {user.name}
                    </h3>
                    <Badge
                      variant="outline"
                      className="text-xs"
                    >
                      {user.role}
                    </Badge>
                    {user.organization?.membership && (
                      <Badge
                        variant={
                          user.organization.membership.status === "ACTIVE"
                            ? "default"
                            : "secondary"
                        }
                        className={
                          user.organization.membership.status === "ACTIVE"
                            ? "bg-[var(--color-success)] text-white text-xs"
                            : "text-xs"
                        }
                      >
                        {user.organization.membership.plan} — {user.organization.membership.status}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-[var(--color-muted)]">
                    {user.email}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-[var(--color-muted)]">
                    <span>
                      Joined:{" "}
                      {new Date(user.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      Last reviewed: {daysSince(user.lastReviewedAt)}
                      {user.lastReview?.reviewer ? ` by ${user.lastReview.reviewer.name}` : ""}
                    </span>
                  </div>
                  {changeFor === user.id && (
                    <div className="pt-3 space-y-2">
                      <label
                        htmlFor={`change-notes-${user.id}`}
                        className="block text-sm font-medium text-[var(--color-text)]"
                      >
                        What needs to change?
                      </label>
                      <textarea
                        id={`change-notes-${user.id}`}
                        value={changeNotes}
                        onChange={(e) => setChangeNotes(e.target.value)}
                        maxLength={1000}
                        rows={3}
                        className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2 text-sm text-[var(--color-text)]"
                      />
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  {changeFor === user.id ? (
                    <>
                      <Button
                        onClick={() => handleMarkReviewed(user.id, "CHANGE_REQUESTED", changeNotes)}
                        disabled={markingId === user.id || !changeNotes.trim()}
                        className="min-h-11 bg-[var(--color-warning)] hover:bg-[var(--color-warning)]/90 text-white"
                      >
                        {markingId === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-label="Saving" />
                        ) : (
                          "Save change request"
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        className="min-h-11"
                        onClick={() => {
                          setChangeFor(null);
                          setChangeNotes("");
                        }}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={() => handleMarkReviewed(user.id)}
                        disabled={markingId === user.id}
                        className="min-h-11 bg-[var(--color-secondary)] hover:bg-[var(--color-secondary)]/90 text-white"
                      >
                        {markingId === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-label="Saving" />
                        ) : (
                          <>
                            <ShieldCheck className="mr-2 h-4 w-4" aria-hidden="true" /> Access is correct
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        className="min-h-11"
                        onClick={() => {
                          setChangeFor(user.id);
                          setChangeNotes("");
                        }}
                      >
                        Request a change
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
