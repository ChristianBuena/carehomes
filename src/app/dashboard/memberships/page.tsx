"use client";

import { useCallback, useEffect, useState } from "react";

type Consent = {
  id: string;
  agreementVersion: string;
  signedName: string;
  email: string;
  ipAddress: string | null;
  signedAt: string;
  documentPublicId: string | null;
};

type Member = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  consentLogs: Consent[];
};

export default function ManageMembershipsPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openingId, setOpeningId] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/admin/membership-agreements");

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load members");
      }

      setMembers(data.members || []);
    } catch (err) {
      console.error("Failed to load membership agreements:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load membership agreements"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleViewAgreement = async (consentId: string) => {
    try {
      setOpeningId(consentId);
      setError("");

      const response = await fetch(
        `/api/admin/membership-agreements/${consentId}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to retrieve signed agreement");
      }

      if (!data.document?.url) {
        throw new Error("Signed agreement document is unavailable");
      }

      window.open(data.document.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("Failed to open signed agreement:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to open signed agreement"
      );
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <div className="py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-primary)]">
          Manage Memberships
        </h1>

        <p className="mt-2 text-[var(--color-muted)]">
          Review member agreements and access signed membership documents.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-white p-6">
          <p className="text-[var(--color-muted)]">
            Loading member agreements...
          </p>
        </div>
      ) : members.length === 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-white p-6">
          <p className="text-[var(--color-muted)]">
            No members found.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--color-border)] bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-semibold">Member</th>
                <th className="px-4 py-3 font-semibold">Agreement</th>
                <th className="px-4 py-3 font-semibold">Signed By</th>
                <th className="px-4 py-3 font-semibold">Signed At</th>
                <th className="px-4 py-3 font-semibold">IP Address</th>
                <th className="px-4 py-3 font-semibold">Document</th>
              </tr>
            </thead>

            <tbody>
              {members.map((member) => {
                const consent = member.consentLogs[0];

                return (
                  <tr
                    key={member.id}
                    className="border-b border-[var(--color-border)] last:border-b-0"
                  >
                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-900">
                        {member.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {member.email}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      {consent ? (
                        <span className="font-medium text-green-700">
                          Version {consent.agreementVersion}
                        </span>
                      ) : (
                        <span className="font-medium text-red-600">
                          Not signed
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      {consent ? consent.signedName : "—"}
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap">
                      {consent
                        ? new Date(consent.signedAt).toLocaleString()
                        : "—"}
                    </td>

                    <td className="px-4 py-4">
                      {consent?.ipAddress || "—"}
                    </td>

                    <td className="px-4 py-4">
                      {consent ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleViewAgreement(consent.id)
                          }
                          disabled={openingId === consent.id}
                          className="rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {openingId === consent.id
                            ? "Opening..."
                            : "View Signed Agreement"}
                        </button>
                      ) : (
                        <span className="text-gray-400">
                          Unavailable
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}