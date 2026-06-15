"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [mfaRequired, setMfaRequired] = useState(false);
  const [otp, setOtp] = useState("");
  const [emailForOtp, setEmailForOtp] = useState("");
  const [timer, setTimer] = useState(60);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    const successMessage = searchParams.get("success");
    if (successMessage) setSuccess(successMessage);
  }, [searchParams]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (mfaRequired && timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [mfaRequired, timer]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (otp.length === 6 && !loading && mfaRequired) {
      handleVerifyOtp();
    }
  }, [otp, loading, mfaRequired]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      if (data.mfaRequired) {
        setMfaRequired(true);
        setEmailForOtp(data.email);
        return;
      }

      router.push("/dashboard");
    } catch (err) {
      console.error("Login submission error:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailForOtp, otp }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid OTP");
        return;
      }

      localStorage.setItem("token", data.token);

      await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${data.token}` },
      });

      router.push("/dashboard");
    } catch {
      setError("Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (timer > 0) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/mfa/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailForOtp }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to resend OTP");
        return;
      }

      setTimer(60);
      setSuccess("A new OTP has been sent to your email.");
    } catch {
      setError("Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg)] py-12 px-4 sm:px-6 lg:px-8">
      {/* Text Logo */}
      <Link href="/" className="mb-8 flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded-md">
        <span className="text-2xl font-extrabold tracking-tight text-[var(--color-primary)]">
          CareHomesSupportDocs
        </span>
      </Link>

      <div className="w-full max-w-md bg-[var(--color-surface)] rounded-xl shadow-sm border border-[var(--color-border)] p-8">
        <h2 className="text-2xl font-bold text-center text-[var(--color-text)] mb-8">Welcome Back</h2>

        {error && (
          <div className="bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 text-[var(--color-danger)] px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-[var(--color-success)]/10 border border-[var(--color-success)]/20 text-[var(--color-success)] px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        {!mfaRequired ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                Email
              </label>
              <input
                name="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full min-h-[44px] px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-shadow"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
                Password
              </label>
              <input
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full min-h-[44px] px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-shadow"
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] mt-2 flex items-center justify-center bg-[var(--color-secondary)] text-white py-2 px-4 rounded-lg hover:bg-[var(--color-secondary-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-secondary)] font-medium transition disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-5">
            <h3 className="text-lg font-semibold text-center text-[var(--color-text)]">Verify OTP</h3>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5 text-center">
                Enter the 6-digit code sent to your email
              </label>
              <input
                type="text"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                className="w-full min-h-[44px] px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-shadow text-center tracking-widest text-lg"
                maxLength={6}
              />
            </div>
            <button
              type="button"
              onClick={handleVerifyOtp}
              disabled={loading || otp.length < 6}
              className="w-full min-h-[44px] flex items-center justify-center bg-[var(--color-secondary)] text-white py-2 px-4 rounded-lg hover:bg-[var(--color-secondary-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-secondary)] font-medium transition disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify OTP"
              )}
            </button>
            
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={timer > 0 || loading}
                className="text-sm font-medium text-[var(--color-secondary)] hover:underline disabled:text-[var(--color-muted)] disabled:no-underline"
              >
                {timer > 0 ? `Resend OTP in ${timer}s` : "Resend OTP"}
              </button>
            </div>
          </div>
        )}

        <p className="mt-8 text-center text-sm text-[var(--color-text)]">
          Don't have an account?{" "}
          <Link
            href="/signup"
            className="text-[var(--color-secondary)] hover:underline font-semibold"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}