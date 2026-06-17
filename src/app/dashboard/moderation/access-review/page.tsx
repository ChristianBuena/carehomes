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
  membership: {
    plan: string;
    status: string;
  } | null;
}

export default function AccessReviewPage() {
  const router = useRouter();
  const [users, setUsers] = useState<ReviewUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);

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

  const handleMarkReviewed = async (userId: string) => {
    setMarkingId(userId);
    try {
      const res = await fetch("/api/admin/access-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error("Failed to mark user");
      // Remove from the local list immediately
      setUsers((prev) => prev.filter((u) => u.id !== userId));
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
              href="/moderation"
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
              Review member accounts that haven't been verified in the last 90
              days. Confirm they still hold valid facility licenses.
            </p>
          </div>

          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-4 py-3 flex items-center gap-3 shrink-0 shadow-sm">
            <Users className="h-4 w-4 text-[var(--color-warning)]" />
            <span className="text-sm font-medium text-[var(--color-text)]">
              {users.length} account{users.length !== 1 ? "s" : ""} need review
            </span>
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
                    {user.membership && (
                      <Badge
                        variant={
                          user.membership.status === "ACTIVE"
                            ? "default"
                            : "secondary"
                        }
                        className={
                          user.membership.status === "ACTIVE"
                            ? "bg-[var(--color-success)] text-white text-xs"
                            : "text-xs"
                        }
                      >
                        {user.membership.plan} — {user.membership.status}
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
                      <Clock className="h-3 w-3" />
                      Last reviewed: {daysSince(user.lastReviewedAt)}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={() => handleMarkReviewed(user.id)}
                  disabled={markingId === user.id}
                  className="bg-[var(--color-secondary)] hover:bg-[var(--color-secondary)]/90 text-white shrink-0"
                >
                  {markingId === user.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="mr-2 h-4 w-4" /> Mark Reviewed
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
