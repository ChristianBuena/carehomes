"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, FileText, CheckCircle2 } from "lucide-react";

export type Rebuttal = {
  id: string;
  title: string;
  citationId: string;
  citationDate: string;
  summary: string;
  moderationStatus: "approved";
  publishedAt: string;
  filesUrl?: string;
};

interface ApprovedRebuttalsSectionProps {
  rebuttals?: Rebuttal[];
  isLoading?: boolean;
}

function RebuttalCard({ rebuttal }: { rebuttal: Rebuttal }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formattedCitationDate = new Date(rebuttal.citationDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedPublishedDate = new Date(rebuttal.publishedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Card className="mb-4 last:mb-0">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <CardTitle className="text-lg">
              {rebuttal.filesUrl ? (
                <Link
                  href={rebuttal.filesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline text-[var(--color-primary)]"
                >
                  {rebuttal.title}
                </Link>
              ) : (
                rebuttal.title
              )}
            </CardTitle>
            <CardDescription className="mt-1 font-medium text-[var(--color-text)]">
              Re: Citation #{rebuttal.citationId} dated {formattedCitationDate}
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className="bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20 shadow-none shrink-0"
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            Approved & Published
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-[var(--color-text)] space-y-2">
          <p className={isExpanded ? "" : "line-clamp-3"}>
            {rebuttal.summary}
          </p>
          {rebuttal.summary.length > 150 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[var(--color-primary)] text-sm font-medium hover:underline"
            >
              {isExpanded ? "Read less" : "Read more"}
            </button>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[var(--color-bg)] rounded-none border-t pb-4 pt-4">
        <div className="text-sm font-medium text-[var(--color-muted)]">
          Published {formattedPublishedDate}
        </div>
        {rebuttal.filesUrl && (
          <Button variant="default" size="sm" asChild>
            <Link
              href={rebuttal.filesUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              View Redacted Document
              <ExternalLink className="w-3.5 h-3.5 ml-2" />
            </Link>
          </Button>
        )}
      </CardFooter>
      <div className="px-4 pb-4 bg-[var(--color-bg)] text-xs text-[var(--color-muted)] italic rounded-b-xl">
        This rebuttal was submitted by the facility operator and published after
        moderation review. It does not represent legal advice or an official
        regulatory determination.
      </div>
    </Card>
  );
}

export function ApprovedRebuttalsSection({
  rebuttals,
  isLoading,
}: ApprovedRebuttalsSectionProps) {
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  if (isLoading) {
    return (
      <section className="space-y-4">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </section>
    );
  }

  if (!rebuttals || rebuttals.length === 0) {
    return (
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-[var(--color-primary)]">
          Published Rebuttals (0)
        </h2>
        <EmptyState
          icon={<FileText className="w-8 h-8" />}
          heading="No rebuttals published yet"
          description="There are currently no approved rebuttals for citations at this facility."
        />
        <MemberCTA />
      </section>
    );
  }

  const sortedRebuttals = [...rebuttals].sort((a, b) => {
    const dateA = new Date(a.publishedAt).getTime();
    const dateB = new Date(b.publishedAt).getTime();
    return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
  });

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-[var(--color-primary)]">
          Published Rebuttals ({rebuttals.length})
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--color-muted)]">
            Sort by:
          </span>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
            className="text-sm border border-[var(--color-border)] rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {sortedRebuttals.map((rebuttal) => (
          <RebuttalCard key={rebuttal.id} rebuttal={rebuttal} />
        ))}
      </div>

      <MemberCTA />
    </section>
  );
}

function MemberCTA() {
  return (
    <div className="mt-8 p-6 bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] text-center flex flex-col items-center justify-center gap-4">
      <p className="text-[var(--color-text)] font-medium">
        Are you the operator of this facility? Submit a rebuttal as a member.
      </p>
      <Button asChild>
        <Link href="/pricing">Become a Member</Link>
      </Button>
    </div>
  );
}
