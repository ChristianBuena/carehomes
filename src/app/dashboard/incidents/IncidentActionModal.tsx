"use client";

import { useState } from "react";
import {
  X,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Flame,
  FileText,
  User,
  Mail,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TakedownWithSla } from "@/services/takedown.service";
import { SlaCountdownBadge } from "./SlaCountdownBadge";

interface IncidentActionModalProps {
  incident: TakedownWithSla | null;
  onClose: () => void;
  onRefresh: () => void;
}

export function IncidentActionModal({
  incident,
  onClose,
  onRefresh,
}: IncidentActionModalProps) {
  const [activeTab, setActiveTab] = useState<"details" | "resolve" | "emergency">("details");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolutionStatus, setResolutionStatus] = useState<"RESOLVED" | "REJECTED">("RESOLVED");
  const [rebuttalIdInput, setRebuttalIdInput] = useState(incident?.rebuttalId || "");
  const [emergencyReason, setEmergencyReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!incident) return null;

  const handleResolveOrReject = async () => {
    if (!resolutionNotes.trim() || resolutionNotes.trim().length < 5) {
      setErrorMsg("Please provide resolution notes explaining your decision (min 5 characters).");
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/takedown/${incident.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: resolutionStatus === "RESOLVED" ? "resolve" : "reject",
          resolutionNotes: resolutionNotes.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update incident status");

      setSuccessMsg(`Incident successfully marked as ${resolutionStatus}. Notification email sent.`);
      setTimeout(() => {
        onRefresh();
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to process resolution");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEmergencyTakedown = async () => {
    const targetRebuttalId = rebuttalIdInput.trim() || incident.rebuttalId;
    if (!targetRebuttalId) {
      setErrorMsg("Please provide the ID of the Rebuttal to unpublish.");
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/takedown/${incident.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "emergency_takedown",
          rebuttalId: targetRebuttalId,
          emergencyReason: emergencyReason.trim() || "Emergency privacy violation takedown.",
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Emergency takedown failed");

      setSuccessMsg("EMERGENCY TAKEDOWN COMPLETE: Rebuttal has been unpublished immediately from public facility page.");
      setTimeout(() => {
        onRefresh();
        onClose();
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || "Emergency takedown failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="bg-[var(--color-primary)] text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <ShieldAlert className="h-5 w-5 text-[var(--color-warning)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs bg-white/20 px-2 py-0.5 rounded font-bold">
                  {incident.ticketNumber}
                </span>
                <span className="text-xs text-white/80">72h SLA Review</span>
              </div>
              <h3 className="text-lg font-bold text-white mt-0.5 truncate max-w-md">
                {incident.facilityOrRebuttal}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-2 rounded-lg hover:bg-white/10 transition"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[var(--color-border)] bg-[var(--color-bg)] px-6">
          <button
            onClick={() => { setActiveTab("details"); setErrorMsg(null); }}
            className={`py-3 px-4 text-sm font-semibold border-b-2 transition ${
              activeTab === "details"
                ? "border-[var(--color-secondary)] text-[var(--color-secondary)]"
                : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            Incident Details
          </button>
          <button
            onClick={() => { setActiveTab("resolve"); setErrorMsg(null); }}
            className={`py-3 px-4 text-sm font-semibold border-b-2 transition ${
              activeTab === "resolve"
                ? "border-[var(--color-secondary)] text-[var(--color-secondary)]"
                : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            Review &amp; Determination
          </button>
          <button
            onClick={() => { setActiveTab("emergency"); setErrorMsg(null); }}
            className={`py-3 px-4 text-sm font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "emergency"
                ? "border-[var(--color-danger)] text-[var(--color-danger)] font-bold"
                : "border-transparent text-[var(--color-danger)]/70 hover:text-[var(--color-danger)]"
            }`}
          >
            <Flame className="h-4 w-4" /> Emergency Takedown
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-5">
          {errorMsg && (
            <div className="p-4 rounded-xl bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 text-[var(--color-danger)] flex items-start gap-3 text-sm">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 rounded-xl bg-[var(--color-success)]/10 border border-[var(--color-success)]/30 text-[var(--color-success)] flex items-start gap-3 text-sm font-medium">
              <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: DETAILS */}
          {activeTab === "details" && (
            <div className="space-y-5">
              {/* SLA & Status Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[var(--color-bg)] p-4 rounded-xl border border-[var(--color-border)]">
                <div>
                  <span className="text-xs text-[var(--color-muted)] font-medium block">72-Hour SLA Status:</span>
                  <div className="mt-1">
                    <SlaCountdownBadge
                      submittedAt={incident.submittedAt}
                      slaDeadline={incident.slaDeadline}
                      status={incident.status}
                    />
                  </div>
                </div>
                <div>
                  <span className="text-xs text-[var(--color-muted)] font-medium block">Current Status:</span>
                  <span className="text-sm font-bold text-[var(--color-primary)] mt-1 block">
                    {incident.status}
                  </span>
                </div>
              </div>

              {/* Requester Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3.5 bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)]">
                  <User className="h-5 w-5 text-[var(--color-muted)] shrink-0" />
                  <div>
                    <span className="text-xs text-[var(--color-muted)] block">Requester:</span>
                    <span className="text-sm font-semibold text-[var(--color-text)]">{incident.requesterName}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3.5 bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)]">
                  <Mail className="h-5 w-5 text-[var(--color-muted)] shrink-0" />
                  <div>
                    <span className="text-xs text-[var(--color-muted)] block">Contact Email:</span>
                    <a href={`mailto:${incident.requesterEmail}`} className="text-sm font-semibold text-[var(--color-secondary)] hover:underline">
                      {incident.requesterEmail}
                    </a>
                  </div>
                </div>
              </div>

              {/* Reason & Details */}
              <div className="p-4 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider">Reported Violation Reason</span>
                  <span className="text-xs font-bold px-2 py-0.5 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded">
                    {incident.reason}
                  </span>
                </div>
                {incident.reasonDetails && (
                  <p className="text-sm font-medium text-[var(--color-text)]">
                    {incident.reasonDetails}
                  </p>
                )}
              </div>

              {/* Supporting Evidence */}
              <div>
                <label className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider block mb-1.5">
                  Supporting Evidence &amp; Explanation
                </label>
                <div className="p-4 bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text)] whitespace-pre-wrap leading-relaxed">
                  {incident.supportingInfo}
                </div>
              </div>

              {/* Associated Rebuttal if linked */}
              {incident.rebuttal && (
                <div className="p-4 rounded-xl bg-[var(--color-blue-50)] border border-[var(--color-border)] flex items-center justify-between">
                  <div>
                    <span className="text-xs text-[var(--color-muted)] block">Linked Rebuttal:</span>
                    <span className="text-sm font-bold text-[var(--color-primary)]">{incident.rebuttal.title}</span>
                    <span className="text-xs text-[var(--color-muted)] block mt-0.5">
                      Status: <strong>{incident.rebuttal.status}</strong>
                    </span>
                  </div>
                  {incident.rebuttal.facility && (
                    <a
                      href={`/facilities/${incident.rebuttal.facility.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-[var(--color-secondary)] hover:underline flex items-center gap-1"
                    >
                      View Facility Page <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              )}

              {/* Resolution History if resolved */}
              {incident.resolvedAt && (
                <div className="p-4 rounded-xl bg-[var(--color-success)]/10 border border-[var(--color-success)]/20 space-y-1 text-sm">
                  <p className="font-semibold text-[var(--color-success)]">Resolved on {new Date(incident.resolvedAt).toLocaleString()}</p>
                  <p className="text-[var(--color-text)]"><strong>Notes:</strong> {incident.resolutionNotes}</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: RESOLVE / REJECT */}
          {activeTab === "resolve" && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-[var(--color-text)] mb-2">
                  Determination Decision
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setResolutionStatus("RESOLVED")}
                    className={`p-3.5 rounded-xl border-2 font-semibold text-sm flex items-center justify-center gap-2 transition ${
                      resolutionStatus === "RESOLVED"
                        ? "border-[var(--color-success)] bg-[var(--color-success)]/10 text-[var(--color-success)]"
                        : "border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-text)]"
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Resolve / Content Removed
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolutionStatus("REJECTED")}
                    className={`p-3.5 rounded-xl border-2 font-semibold text-sm flex items-center justify-center gap-2 transition ${
                      resolutionStatus === "REJECTED"
                        ? "border-[var(--color-danger)] bg-[var(--color-danger)]/10 text-[var(--color-danger)]"
                        : "border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-text)]"
                    }`}
                  >
                    <XCircle className="h-4 w-4" />
                    Reject Request / Retain Content
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--color-text)] mb-1.5">
                  Resolution Notes <span className="text-[var(--color-danger)]">*</span>
                </label>
                <p className="text-xs text-[var(--color-muted)] mb-2">
                  These notes will be logged permanently in the incident compliance audit trail and emailed to the requester.
                </p>
                <textarea
                  rows={4}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Explain the findings of the investigation and the final determination..."
                  className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="outline" onClick={onClose} disabled={isProcessing}>
                  Cancel
                </Button>
                <Button
                  onClick={handleResolveOrReject}
                  disabled={isProcessing}
                  className={
                    resolutionStatus === "RESOLVED"
                      ? "bg-[var(--color-success)] hover:bg-[var(--color-success)]/90 text-white font-bold"
                      : "bg-[var(--color-danger)] hover:bg-[var(--color-danger)]/90 text-white font-bold"
                  }
                >
                  {isProcessing ? "Processing..." : `Confirm ${resolutionStatus}`}
                </Button>
              </div>
            </div>
          )}

          {/* TAB 3: EMERGENCY TAKEDOWN */}
          {activeTab === "emergency" && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 text-[var(--color-danger)] text-sm">
                <p className="font-bold flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="h-4 w-4" /> Emergency Privacy Breach Procedure
                </p>
                This action will immediately set the specified rebuttal to <strong>REJECTED</strong>, removing it from all public facility pages in real time, and record an emergency incident audit log.
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--color-text)] mb-1.5">
                  Target Rebuttal ID <span className="text-[var(--color-danger)]">*</span>
                </label>
                <input
                  type="text"
                  value={rebuttalIdInput}
                  onChange={(e) => setRebuttalIdInput(e.target.value)}
                  placeholder="e.g. cly1234567890..."
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-danger)] font-mono"
                />
                <p className="text-xs text-[var(--color-muted)] mt-1">
                  {incident.rebuttalId
                    ? `Auto-populated from linked incident: ${incident.rebuttalId}`
                    : "Paste the ID of the rebuttal to immediately take offline."}
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--color-text)] mb-1.5">
                  Emergency Justification / Reason
                </label>
                <input
                  type="text"
                  value={emergencyReason}
                  onChange={(e) => setEmergencyReason(e.target.value)}
                  placeholder="e.g. Unredacted resident full name and room number exposed"
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-danger)]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="outline" onClick={onClose} disabled={isProcessing}>
                  Cancel
                </Button>
                <Button
                  onClick={handleEmergencyTakedown}
                  disabled={isProcessing}
                  className="bg-[var(--color-danger)] hover:bg-[var(--color-danger)]/90 text-white font-bold flex items-center gap-1.5 shadow-md"
                >
                  <Flame className="h-4 w-4" />
                  {isProcessing ? "Unpublishing..." : "Execute Emergency Takedown Now"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
