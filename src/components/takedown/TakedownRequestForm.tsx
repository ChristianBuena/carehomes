"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ShieldAlert,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Copy,
  Check,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const takedownFormSchema = z.object({
  requesterName: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  requesterEmail: z.string().email("Please provide a valid contact email"),
  facilityOrRebuttal: z
    .string()
    .min(3, "Please provide the facility name, page URL, or rebuttal title"),
  reason: z.enum([
    "PRIVACY_PII_PHI",
    "INACCURATE_INFORMATION",
    "DEFAMATION_HARASSMENT",
    "COURT_ORDER",
    "COPYRIGHT_IP",
    "OTHER",
  ]),
  reasonDetails: z.string().max(200).optional(),
  supportingInfo: z
    .string()
    .min(
      15,
      "Please describe the specific issue and evidence in detail (at least 15 characters)"
    )
    .max(2000, "Description cannot exceed 2000 characters"),
});

type TakedownFormData = z.infer<typeof takedownFormSchema>;

export function TakedownRequestForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    ticketNumber: string;
    submittedAt: string;
    slaDeadline: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<TakedownFormData>({
    resolver: zodResolver(takedownFormSchema),
    defaultValues: {
      reason: "PRIVACY_PII_PHI",
    },
  });

  const onSubmit = async (data: TakedownFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/takedown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to submit takedown request");
      }

      setSuccessData({
        ticketNumber: json.ticketNumber,
        submittedAt: json.submittedAt,
        slaDeadline: json.slaDeadline,
      });
      reset();
    } catch (err: any) {
      setSubmitError(err.message || "Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyTicket = () => {
    if (successData?.ticketNumber) {
      navigator.clipboard.writeText(successData.ticketNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (successData) {
    return (
      <div className="bg-[var(--color-surface)] border-2 border-[var(--color-success)]/40 rounded-2xl p-8 sm:p-10 shadow-lg text-left">
        <div className="flex items-center gap-3 text-[var(--color-success)] mb-4">
          <CheckCircle2 className="h-8 w-8 shrink-0" />
          <h3 className="text-2xl font-bold text-[var(--color-text)]">
            Takedown Request Submitted
          </h3>
        </div>

        <p className="text-[var(--color-muted)] text-base mb-6">
          Your request has been logged in our compliance management system. An
          automated confirmation has been sent to your email.
        </p>

        {/* Ticket box */}
        <div className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-[var(--color-border)]">
            <div>
              <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">
                Incident Reference Ticket
              </p>
              <p className="text-2xl font-extrabold text-[var(--color-primary)] font-mono mt-1">
                {successData.ticketNumber}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyTicket}
              className="inline-flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-[var(--color-success)]" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copy Ticket ID</span>
                </>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-[var(--color-muted)] block text-xs">Submitted At:</span>
              <span className="font-medium text-[var(--color-text)]">
                {new Date(successData.submittedAt).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-[var(--color-muted)] block text-xs">72-Hour Target SLA Deadline:</span>
              <span className="font-semibold text-[var(--color-secondary)]">
                {new Date(successData.slaDeadline).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* SLA Notice */}
        <div className="bg-[var(--color-blue-50)] border border-[var(--color-border)] rounded-xl p-5 flex items-start gap-3.5 mb-8">
          <Clock className="h-5 w-5 text-[var(--color-secondary)] shrink-0 mt-0.5" />
          <div className="text-sm text-[var(--color-text)]">
            <p className="font-semibold text-[var(--color-primary)] mb-1">
              What happens next?
            </p>
            <p className="leading-relaxed text-[var(--color-muted)]">
              Our moderation board has been alerted. Content flagged for severe privacy violations is prioritized for emergency unpublishing. You will receive final determination updates directly via email within our 72-hour review window.
            </p>
          </div>
        </div>

        <Button
          onClick={() => setSuccessData(null)}
          variant="outline"
          className="w-full sm:w-auto"
        >
          Submit Another Request
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 sm:p-8 md:p-10 shadow-md">
      <div className="flex items-start gap-4 mb-6">
        <div className="p-3 bg-[var(--color-warning)]/10 text-[var(--color-warning)] rounded-xl shrink-0">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-[var(--color-primary)]">
            Submit a Formal Takedown Request
          </h3>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            All requests are logged permanently in our compliance incident management log and targeted for a <strong>72-hour SLA response</strong>.
          </p>
        </div>
      </div>

      {submitError && (
        <div className="mb-6 p-4 rounded-xl bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 text-[var(--color-danger)] flex items-start gap-3 text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{submitError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Requester Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label
              htmlFor="requesterName"
              className="block text-sm font-semibold text-[var(--color-text)] mb-1.5"
            >
              Your Full Name <span className="text-[var(--color-danger)]">*</span>
            </label>
            <input
              id="requesterName"
              type="text"
              placeholder="e.g. Jane Doe"
              {...register("requesterName")}
              className="w-full px-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)] text-sm transition"
            />
            {errors.requesterName && (
              <p className="text-xs text-[var(--color-danger)] mt-1 font-medium">
                {errors.requesterName.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="requesterEmail"
              className="block text-sm font-semibold text-[var(--color-text)] mb-1.5"
            >
              Contact Email <span className="text-[var(--color-danger)]">*</span>
            </label>
            <input
              id="requesterEmail"
              type="email"
              placeholder="jane@example.com"
              {...register("requesterEmail")}
              className="w-full px-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)] text-sm transition"
            />
            {errors.requesterEmail && (
              <p className="text-xs text-[var(--color-danger)] mt-1 font-medium">
                {errors.requesterEmail.message}
              </p>
            )}
          </div>
        </div>

        {/* Target Content */}
        <div>
          <label
            htmlFor="facilityOrRebuttal"
            className="block text-sm font-semibold text-[var(--color-text)] mb-1.5"
          >
            Affected Facility / Rebuttal URL or Name <span className="text-[var(--color-danger)]">*</span>
          </label>
          <input
            id="facilityOrRebuttal"
            type="text"
            placeholder="e.g. Sunny Hills Care Home or https://carehomessupportdocs.org/facilities/sunny-hills-101"
            {...register("facilityOrRebuttal")}
            className="w-full px-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)] text-sm transition"
          />
          {errors.facilityOrRebuttal && (
            <p className="text-xs text-[var(--color-danger)] mt-1 font-medium">
              {errors.facilityOrRebuttal.message}
            </p>
          )}
        </div>

        {/* Violation Reason */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label
              htmlFor="reason"
              className="block text-sm font-semibold text-[var(--color-text)] mb-1.5"
            >
              Reason for Takedown <span className="text-[var(--color-danger)]">*</span>
            </label>
            <select
              id="reason"
              {...register("reason")}
              className="w-full px-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)] text-sm transition"
            >
              <option value="PRIVACY_PII_PHI">
                Privacy Breach / Resident PII or PHI exposed
              </option>
              <option value="INACCURATE_INFORMATION">
                Inaccurate / False Information
              </option>
              <option value="DEFAMATION_HARASSMENT">
                Defamation or Harassment
              </option>
              <option value="COURT_ORDER">Court Order / Legal Injunction</option>
              <option value="COPYRIGHT_IP">Copyright or IP Infringement</option>
              <option value="OTHER">Other Policy Violation</option>
            </select>
            {errors.reason && (
              <p className="text-xs text-[var(--color-danger)] mt-1 font-medium">
                {errors.reason.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="reasonDetails"
              className="block text-sm font-semibold text-[var(--color-text)] mb-1.5"
            >
              Short Category Summary (Optional)
            </label>
            <input
              id="reasonDetails"
              type="text"
              placeholder="e.g. Resident full name exposed in paragraph 2"
              {...register("reasonDetails")}
              className="w-full px-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)] text-sm transition"
            />
          </div>
        </div>

        {/* Supporting Evidence */}
        <div>
          <label
            htmlFor="supportingInfo"
            className="block text-sm font-semibold text-[var(--color-text)] mb-1.5"
          >
            Detailed Explanation & Supporting Evidence <span className="text-[var(--color-danger)]">*</span>
          </label>
          <textarea
            id="supportingInfo"
            rows={5}
            placeholder="Please provide specific details: paragraphs, timestamps, exact phrases, or medical/privacy concerns to assist our review team..."
            {...register("supportingInfo")}
            className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)] text-sm transition leading-relaxed"
          />
          {errors.supportingInfo && (
            <p className="text-xs text-[var(--color-danger)] mt-1 font-medium">
              {errors.supportingInfo.message}
            </p>
          )}
        </div>

        {/* Compliance notice */}
        <div className="p-4 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] leading-relaxed">
          <p className="font-semibold text-[var(--color-primary)] mb-1 flex items-center gap-1.5">
            <FileText className="h-4 w-4" /> Compliance & Non-profit Notice
          </p>
          Submissions are permanently logged in our immutable incident register to meet non-profit auditing and legal compliance requirements. False or abusive submissions may be flagged.
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto h-12 px-8 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Submitting Incident...
            </span>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Submit Takedown Request
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
