"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  UploadCloud,
  AlertCircle,
  Loader2,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateRebuttal } from "@/app/actions/rebuttals";

interface EditRebuttalFormProps {
  rebuttal: {
    id: string;
    title: string;
    content: string;
    documentUrl: string | null;
    facility: { id: string; name: string } | null;
  };
}

export default function EditRebuttalForm({ rebuttal }: EditRebuttalFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFileName(e.target.files[0].name);
    } else {
      setFileName(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      await updateRebuttal(rebuttal.id, formData);
      router.push("/dashboard/rebuttals?resubmitted=true");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link href="/dashboard/rebuttals">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back to My Rebuttals</span>
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-text)]">
            Edit &amp; Resubmit Rebuttal
          </h2>
          <p className="text-sm text-[var(--color-muted)]">
            Make your corrections and resubmit for moderation review.
          </p>
        </div>
      </div>

      {/* Fix Required notice */}
      <div className="bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 rounded-lg p-4 flex gap-3">
        <AlertTriangle
          className="h-5 w-5 text-[var(--color-accent)] shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <div className="text-sm">
          <p className="font-semibold text-[var(--color-text)]">Fix Required</p>
          <p className="text-[var(--color-muted)] mt-0.5">
            A moderator has requested changes to this rebuttal. Please review and
            correct the content below, then resubmit for review.
          </p>
          {rebuttal.facility && (
            <p className="text-[var(--color-muted)] mt-1">
              Facility: <span className="font-medium text-[var(--color-text)]">{rebuttal.facility.name}</span>
            </p>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-8 shadow-sm">
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-[var(--color-danger)]/10 text-[var(--color-danger)] p-4 rounded-lg flex gap-3 text-sm font-medium">
              <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
              <p>{error}</p>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Rebuttal Title</Label>
            <Input
              id="title"
              name="title"
              defaultValue={rebuttal.title}
              placeholder="e.g. Response to Citation #123456"
              required
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Rebuttal Content</Label>
            <Textarea
              id="content"
              name="content"
              rows={10}
              defaultValue={rebuttal.content}
              placeholder="Provide a detailed explanation or response to the citation..."
              required
            />
          </div>

          {/* Document upload */}
          <div className="space-y-2">
            <Label>Supporting Document (Optional)</Label>
            {rebuttal.documentUrl && !fileName && (
              <div className="flex items-center gap-2 text-sm text-[var(--color-muted)] mb-2">
                <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Current document attached. Upload a new file to replace it.</span>
                <a
                  href={rebuttal.documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-primary)] hover:underline font-medium"
                >
                  View current
                </a>
              </div>
            )}
            <div className="border-2 border-dashed border-[var(--color-border)] rounded-lg p-6 hover:bg-[var(--color-bg)] transition-colors relative">
              <input
                type="file"
                id="document"
                name="document"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileChange}
              />
              <div className="flex flex-col items-center justify-center text-center space-y-2 pointer-events-none">
                <UploadCloud className="h-8 w-8 text-[var(--color-muted)]" aria-hidden="true" />
                <div className="text-sm font-medium text-[var(--color-text)]">
                  {fileName ? (
                    <span className="text-[var(--color-primary)]">{fileName}</span>
                  ) : (
                    "Click to upload or drag and drop"
                  )}
                </div>
                <p className="text-xs text-[var(--color-muted)]">
                  PDF, PNG, JPG or Word (max. 10MB)
                </p>
              </div>
            </div>
          </div>

          {/* Redaction acknowledgement */}
          <div className="bg-[var(--color-warning)]/5 border border-[var(--color-warning)]/20 p-4 rounded-lg space-y-3">
            <h4 className="font-semibold text-sm text-[var(--color-text)]">Redaction Policy</h4>
            <p className="text-xs text-[var(--color-muted)] leading-relaxed">
              By resubmitting this rebuttal, you certify that all uploaded documents and written
              content have been fully redacted of any Protected Health Information (PHI), resident
              names, sensitive medical records, or personally identifiable information (PII) of
              staff/residents, in accordance with our Redaction Policy and HIPAA guidelines.
            </p>
            <label className="flex items-start gap-3 mt-3 cursor-pointer">
              <input
                type="checkbox"
                name="redactionAcknowledged"
                required
                className="mt-0.5 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
              />
              <span className="text-sm font-medium text-[var(--color-text)]">
                I have redacted all sensitive information and agree to the Redaction Policy.
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="pt-4 flex justify-end gap-3 border-t border-[var(--color-border)]">
            <Button
              variant="outline"
              type="button"
              onClick={() => router.push("/dashboard/rebuttals")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white min-w-[160px]"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Resubmit for Review"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
