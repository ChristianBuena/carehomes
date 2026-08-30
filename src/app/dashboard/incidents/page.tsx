"use client";

import { useEffect, useState } from "react";
import {
  ShieldAlert,
  Clock,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TakedownWithSla } from "@/services/takedown.service";
import { SlaCountdownBadge } from "./SlaCountdownBadge";
import { IncidentActionModal } from "./IncidentActionModal";

export default function IncidentsDashboardPage() {
  const [incidents, setIncidents] = useState<TakedownWithSla[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedIncident, setSelectedIncident] = useState<TakedownWithSla | null>(null);

  const fetchIncidents = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL" && statusFilter !== "URGENT" && statusFilter !== "EMERGENCY") {
        params.append("status", statusFilter);
      }
      if (searchQuery) {
        params.append("q", searchQuery);
      }

      const res = await fetch(`/api/takedown?${params.toString()}`);
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || "Failed to load incidents");

      let list: TakedownWithSla[] = json.requests || [];

      // Filter for URGENT (critical / overdue)
      if (statusFilter === "URGENT") {
        list = list.filter(
          (i) =>
            (i.status === "PENDING" || i.status === "IN_REVIEW") &&
            (i.isOverdue || i.remainingHours < 24)
        );
      } else if (statusFilter === "EMERGENCY") {
        list = list.filter((i) => i.isEmergencyTakedown);
      } else if (statusFilter === "OPEN") {
        list = list.filter((i) => i.status === "PENDING" || i.status === "IN_REVIEW");
      }

      setIncidents(list);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [statusFilter]);

  // Handle Enter on search
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchIncidents();
  };

  // Metrics calculations
  const totalOpen = incidents.filter(
    (i) => i.status === "PENDING" || i.status === "IN_REVIEW"
  ).length;
  const totalUrgent = incidents.filter(
    (i) =>
      (i.status === "PENDING" || i.status === "IN_REVIEW") &&
      (i.isOverdue || i.remainingHours < 24)
  ).length;
  const totalEmergency = incidents.filter((i) => i.isEmergencyTakedown).length;
  const totalResolved = incidents.filter(
    (i) => i.status === "RESOLVED" || i.status === "REJECTED"
  ).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="h-7 w-7 text-[var(--color-warning)]" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text)]">
              Takedown &amp; Incident Management
            </h1>
          </div>
          <p className="mt-1.5 text-sm text-[var(--color-muted)]">
            Monitor incoming content removal requests, track the strict <strong>72-hour SLA</strong>, and execute emergency takedowns.
          </p>
        </div>

        <Button
          onClick={fetchIncidents}
          variant="outline"
          size="sm"
          className="inline-flex items-center gap-2 self-start md:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Feed
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Open */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-[var(--color-muted)] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Open Incidents</span>
            <Clock className="h-5 w-5 text-[var(--color-secondary)]" />
          </div>
          <p className="text-3xl font-extrabold text-[var(--color-text)]">{totalOpen}</p>
          <p className="text-xs text-[var(--color-muted)] mt-1">Pending or under review</p>
        </div>

        {/* Urgent (<24h / Overdue) */}
        <div className={`border rounded-2xl p-5 shadow-sm transition ${
          totalUrgent > 0
            ? "bg-[var(--color-danger)]/10 border-[var(--color-danger)]/30"
            : "bg-[var(--color-surface)] border-[var(--color-border)]"
        }`}>
          <div className="flex items-center justify-between text-[var(--color-danger)] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Urgent (&lt;24h / Overdue)</span>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <p className="text-3xl font-extrabold text-[var(--color-danger)]">{totalUrgent}</p>
          <p className="text-xs text-[var(--color-danger)]/80 mt-1">Requires immediate action</p>
        </div>

        {/* Emergency Takedowns */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-[var(--color-warning)] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Emergency Unpublishes</span>
            <Flame className="h-5 w-5" />
          </div>
          <p className="text-3xl font-extrabold text-[var(--color-text)]">{totalEmergency}</p>
          <p className="text-xs text-[var(--color-muted)] mt-1">Immediate privacy actions</p>
        </div>

        {/* Resolved */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-[var(--color-success)] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Resolved / Closed</span>
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <p className="text-3xl font-extrabold text-[var(--color-text)]">{totalResolved}</p>
          <p className="text-xs text-[var(--color-muted)] mt-1">Historical incident log</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--color-surface)] p-4 rounded-2xl border border-[var(--color-border)] shadow-sm">
        {/* Status Tabs */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: "ALL", label: "All Incidents" },
            { key: "OPEN", label: "Active Open" },
            { key: "URGENT", label: "⚠️ Urgent (<24h)" },
            { key: "EMERGENCY", label: "🔥 Emergency" },
            { key: "RESOLVED", label: "Resolved" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                statusFilter === tab.key
                  ? "bg-[var(--color-primary)] text-white shadow-sm"
                  : "bg-[var(--color-bg)] text-[var(--color-muted)] hover:text-[var(--color-text)] border border-[var(--color-border)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ticket, name, facility..."
              className="pl-9 pr-4 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-xs text-[var(--color-text)] w-60 focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]"
            />
          </div>
          <Button type="submit" size="sm" variant="secondary" className="text-xs">
            Search
          </Button>
        </form>
      </div>

      {/* Incident Log Table */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <h2 className="text-base font-bold text-[var(--color-text)] flex items-center gap-2">
            Incident Audit Log
            <span className="text-xs font-normal text-[var(--color-muted)] flex items-center gap-1">
              <Lock className="h-3 w-3" /> Permanent &amp; Immutable Compliance Register
            </span>
          </h2>
          <span className="text-xs text-[var(--color-muted)] font-mono">
            {incidents.length} Incident{incidents.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loading ? (
          <div className="p-16 text-center text-[var(--color-muted)]">
            <div className="h-8 w-8 border-3 border-[var(--color-secondary)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium">Loading incidents...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-[var(--color-danger)]">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm font-bold">{error}</p>
          </div>
        ) : incidents.length === 0 ? (
          <div className="p-16 text-center text-[var(--color-muted)]">
            <CheckCircle2 className="h-10 w-10 text-[var(--color-success)] mx-auto mb-2" />
            <p className="text-base font-bold text-[var(--color-text)]">No incidents found</p>
            <p className="text-xs mt-1">There are no takedown requests matching the selected filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--color-bg)] border-b border-[var(--color-border)] text-xs text-[var(--color-muted)] uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6 font-semibold">Ticket #</th>
                  <th className="py-3.5 px-6 font-semibold">Target Content</th>
                  <th className="py-3.5 px-6 font-semibold">Requester</th>
                  <th className="py-3.5 px-6 font-semibold">Reason</th>
                  <th className="py-3.5 px-6 font-semibold">72h SLA Deadline</th>
                  <th className="py-3.5 px-6 font-semibold">Status</th>
                  <th className="py-3.5 px-6 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {incidents.map((incident) => (
                  <tr
                    key={incident.id}
                    className="hover:bg-[var(--color-bg)]/50 transition cursor-pointer"
                    onClick={() => setSelectedIncident(incident)}
                  >
                    <td className="py-4 px-6 font-mono font-bold text-[var(--color-primary)] text-xs">
                      {incident.ticketNumber}
                      {incident.isEmergencyTakedown && (
                        <span className="ml-2 inline-flex items-center text-[10px] font-bold bg-[var(--color-danger)]/15 text-[var(--color-danger)] px-1.5 py-0.5 rounded">
                          EMERGENCY
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 max-w-xs truncate font-medium text-[var(--color-text)]">
                      {incident.facilityOrRebuttal}
                    </td>
                    <td className="py-4 px-6 text-xs text-[var(--color-text)]">
                      <div className="font-semibold">{incident.requesterName}</div>
                      <div className="text-[var(--color-muted)] text-[11px]">{incident.requesterEmail}</div>
                    </td>
                    <td className="py-4 px-6 text-xs">
                      <span className="px-2 py-0.5 bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] rounded font-medium">
                        {incident.reason.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <SlaCountdownBadge
                        submittedAt={incident.submittedAt}
                        slaDeadline={incident.slaDeadline}
                        status={incident.status}
                      />
                    </td>
                    <td className="py-4 px-6">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        incident.status === "PENDING"
                          ? "bg-[var(--color-warning)]/15 text-[var(--color-warning)]"
                          : incident.status === "IN_REVIEW"
                          ? "bg-[var(--color-secondary)]/15 text-[var(--color-secondary)]"
                          : incident.status === "RESOLVED"
                          ? "bg-[var(--color-success)]/15 text-[var(--color-success)]"
                          : "bg-[var(--color-muted)]/15 text-[var(--color-muted)]"
                      }`}>
                        {incident.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedIncident(incident)}
                        className="text-xs inline-flex items-center gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Modal */}
      {selectedIncident && (
        <IncidentActionModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onRefresh={fetchIncidents}
        />
      )}
    </div>
  );
}
