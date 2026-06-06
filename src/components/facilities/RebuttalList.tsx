"use client";

import { useState, useMemo } from "react";
import {
  ExternalLink,
  CheckCircle2,
  Calendar,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Rebuttal } from "@/lib/mock-data/rebuttals";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Sort control ─────────────────────────────────────────────────────────────

type SortOrder = "newest" | "oldest";

interface RebuttalSortControlProps {
  value: SortOrder;
  onChange: (v: SortOrder) => void;
}

function RebuttalSortControl({ value, onChange }: RebuttalSortControlProps) {
  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="rebuttal-sort"
        className="text-sm text-[var(--color-muted)] whitespace-nowrap"
      >
        Sort:
      </label>
      <select
        id="rebuttal-sort"
        value={value}
        onChange={(e) => onChange(e.target.value as SortOrder)}
        className="h-9 px-3 pr-8 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition"
        aria-label="Sort rebuttals"
      >
        <option value="newest">Newest First</option>
        <option value="oldest">Oldest First</option>
      </select>
    </div>
  );
}

// ─── Individual card ──────────────────────────────────────────────────────────

function RebuttalCard({ rebuttal }: { rebuttal: Rebuttal }) {
  const [expanded, setExpanded] = useState(false);

  const formattedPublished = new Date(rebuttal.publishedAt).toLocaleDateString(
    "en-US",
    { year: "numeric", month: "long", day: "numeric" }
  );
  const formattedCitation = new Date(rebuttal.citationDate).toLocaleDateString(
    "en-US",
    { year: "numeric", month: "long", day: "numeric" }
  );

  return (
    <article
      className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
      aria-label={rebuttal.title}
    >
      {/* Card header */}
      <div className="px-6 pt-6 pb-4 border-b border-[var(--color-border)]/60">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
          {/* Title */}
          <h3 className="text-base font-bold text-[var(--color-text)] leading-snug">
            {rebuttal.filesUrl ? (
              <a
                href={rebuttal.filesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[var(--color-secondary)] transition-colors underline-offset-2 hover:underline"
                aria-label={`${rebuttal.title} — view document (opens in new tab)`}
              >
                {rebuttal.title}
              </a>
            ) : (
              rebuttal.title
            )}
          </h3>

          {/* Approved badge */}
          <span className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-success)] bg-[var(--color-success)]/10 border border-[var(--color-success)]/20 px-2.5 py-1 rounded-full">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            Approved &amp; Published
          </span>
        </div>

        {/* Citation reference */}
        <p className="text-sm text-[var(--color-muted)]">
          Re: Citation{" "}
          <span className="font-mono font-semibold text-[var(--color-text)]">
            #{rebuttal.citationId}
          </span>{" "}
          dated{" "}
          <time dateTime={rebuttal.citationDate}>{formattedCitation}</time>
        </p>
      </div>

      {/* Card body */}
      <div className="px-6 py-4 space-y-4">
        {/* Summary with expand/collapse */}
        <div>
          <p
            className={`text-sm text-[var(--color-text)] leading-relaxed transition-all ${
              expanded ? "" : "line-clamp-3"
            }`}
          >
            {rebuttal.summary}
          </p>
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded"
            aria-expanded={expanded}
          >
            {expanded ? (
              <>
                Show less <ChevronUp className="h-4 w-4" aria-hidden="true" />
              </>
            ) : (
              <>
                Read more <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </>
            )}
          </button>
        </div>

        {/* Inline disclaimer */}
        <p className="text-xs text-[var(--color-muted)] bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-3 leading-relaxed italic">
          This rebuttal was submitted by the facility operator and published after
          moderation review. It does not represent legal advice or an official
          regulatory determination.
        </p>
      </div>

      {/* Card footer */}
      <div className="px-6 py-4 border-t border-[var(--color-border)]/60 bg-[var(--color-bg)]/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
          <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
          <span>
            Published{" "}
            <time dateTime={rebuttal.publishedAt}>{formattedPublished}</time>
          </span>
        </div>

        {rebuttal.filesUrl && (
          <a
            href={rebuttal.filesUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-secondary)] rounded"
            aria-label={`View redacted document for ${rebuttal.title} (opens in new tab)`}
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            View Redacted Document
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        )}
      </div>
    </article>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

export function RebuttalListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 space-y-4"
        >
          <div className="flex justify-between gap-4">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-6 w-32 rounded-full" />
          </div>
          <Skeleton className="h-4 w-48" />
          <div className="space-y-2 pt-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          <Skeleton className="h-16 w-full rounded-lg" />
          <div className="pt-2 border-t border-[var(--color-border)] flex justify-between">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── List container (handles sort) ───────────────────────────────────────────

interface RebuttalListProps {
  rebuttals: Rebuttal[];
}

export function RebuttalList({ rebuttals }: RebuttalListProps) {
  const [sort, setSort] = useState<SortOrder>("newest");

  const sorted = useMemo(() => {
    return [...rebuttals].sort((a, b) => {
      const diff =
        new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
      return sort === "newest" ? -diff : diff;
    });
  }, [rebuttals, sort]);

  return (
    <div className="space-y-4">
      {/* Sort control sits above the list */}
      <div className="flex justify-end">
        <RebuttalSortControl value={sort} onChange={setSort} />
      </div>

      {sorted.map((r) => (
        <RebuttalCard key={r.id} rebuttal={r} />
      ))}
    </div>
  );
}
