"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, FileText, CheckCircle2 } from "lucide-react";

type Agreement = {
  id: string;
  version: string;
  title: string;
  content: string;
};

type Consent = {
  id: string;
  agreementVersion: string;
  signedName: string;
  signedAt: string;
} | null;

export default function AgreementPage() {
  const router = useRouter();

  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [consent, setConsent] = useState<Consent>(null);
  const [requiresSignature, setRequiresSignature] = useState(false);

  const [signedName, setSignedName] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const loadAgreement = async () => {
      try {
        const res = await fetch("/api/membership/agreement");

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to load membership agreement.");
          return;
        }

        setAgreement(data.agreement);
        setConsent(data.consent);
        setRequiresSignature(data.requiresSignature);
      } catch (err) {
        console.error("Agreement loading error:", err);
        setError("Failed to load the membership agreement.");
      } finally {
        setLoading(false);
      }
    };

    loadAgreement();
  }, []);

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!signedName.trim()) {
      setError("Please enter your full name as your electronic signature.");
      return;
    }

    if (!confirmed) {
      setError(
        "Please confirm that you have read and agree to the membership agreement."
      );
      return;
    }

    setSigning(true);

    try {
      const res = await fetch("/api/membership/agreement/sign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          signedName: signedName.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to sign the membership agreement.");
        return;
      }

      setSuccess("Membership agreement signed successfully.");

      // Give the user a moment to see the confirmation.
      setTimeout(() => {
        router.push("/dashboard");
      }, 800);
    } catch (err) {
      console.error("Agreement signing error:", err);
      setError("Failed to sign the membership agreement.");
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-2 text-[var(--color-muted)]">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading membership agreement...
        </div>
      </div>
    );
  }

  if (error && !agreement) {
    return (
      <div className="py-8">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-lg border border-[var(--color-danger)]/20 bg-[var(--color-danger)]/10 px-5 py-4 text-[var(--color-danger)]">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!agreement) {
    return (
      <div className="py-8">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 text-[var(--color-text)]">
            No active membership agreement is currently available.
          </div>
        </div>
      </div>
    );
  }

  // This should normally not happen because login redirects users
  // who already signed the current agreement directly to the dashboard.
  if (!requiresSignature) {
    return (
      <div className="py-8">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-xl border border-[var(--color-success)]/20 bg-[var(--color-success)]/10 p-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-[var(--color-success)]" />

              <div>
                <h2 className="font-semibold text-[var(--color-text)]">
                  Agreement Already Signed
                </h2>

                {consent && (
                  <p className="text-sm text-[var(--color-muted)] mt-1">
                    You signed version {consent.agreementVersion} on{" "}
                    {new Date(consent.signedAt).toLocaleString()}.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary)]/10">
              <FileText className="h-5 w-5 text-[var(--color-primary)]" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-[var(--color-primary)]">
                Membership Agreement
              </h1>

              <p className="text-sm text-[var(--color-muted)]">
                Agreement version {agreement.version}
              </p>
            </div>
          </div>

          <p className="mt-4 text-[var(--color-text)]">
            Before you can access your membership features, you must review
            and electronically sign the current membership agreement.
          </p>
        </div>

        {/* Agreement document */}
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm overflow-hidden">
          <div className="border-b border-[var(--color-border)] px-6 py-5">
            <h2 className="text-xl font-semibold text-[var(--color-text)]">
              {agreement.title}
            </h2>

            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Version {agreement.version}
            </p>
          </div>

          <div className="max-h-[500px] overflow-y-auto px-6 py-6">
            <div className="whitespace-pre-wrap text-sm leading-7 text-[var(--color-text)]">
              {agreement.content}
            </div>
          </div>
        </div>

        {/* Signature section */}
        <form
          onSubmit={handleSign}
          className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm p-6"
        >
          <h2 className="text-lg font-semibold text-[var(--color-text)]">
            Electronic Signature
          </h2>

          <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
            Please enter your full legal name below. By submitting your
            electronic signature, you confirm that you have reviewed the
            agreement and agree to its terms.
          </p>

          {/* Signature name */}
          <div className="mt-5">
            <label
              htmlFor="signedName"
              className="block text-sm font-medium text-[var(--color-text)] mb-1.5"
            >
              Full Name / Electronic Signature
            </label>

            <input
              id="signedName"
              name="signedName"
              type="text"
              value={signedName}
              onChange={(e) => setSignedName(e.target.value)}
              placeholder="Enter your full name"
              disabled={signing}
              required
              className="w-full min-h-[46px] px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-shadow disabled:opacity-60"
            />
          </div>

          {/* Confirmation */}
          <label className="mt-5 flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              disabled={signing}
              className="mt-1 h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
            />

            <span className="text-sm leading-6 text-[var(--color-text)]">
              I confirm that I have read and understood this Membership
              Agreement and that the name I entered above is my electronic
              signature. I agree to be legally bound by the terms of this
              agreement.
            </span>
          </label>

          {/* Errors */}
          {error && (
            <div className="mt-5 rounded-lg border border-[var(--color-danger)]/20 bg-[var(--color-danger)]/10 px-4 py-3 text-sm text-[var(--color-danger)]">
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="mt-5 flex items-center gap-2 rounded-lg border border-[var(--color-success)]/20 bg-[var(--color-success)]/10 px-4 py-3 text-sm text-[var(--color-success)]">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {success}
            </div>
          )}

          {/* Sign button */}
          <button
            type="submit"
            disabled={signing || !signedName.trim() || !confirmed}
            className="mt-6 w-full min-h-[46px] flex items-center justify-center bg-[var(--color-secondary)] text-white py-2 px-4 rounded-lg hover:bg-[var(--color-secondary-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-secondary)] font-medium transition disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {signing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing Agreement...
              </>
            ) : (
              "Sign Membership Agreement"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}