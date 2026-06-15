'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // MFA STATES
  const [mfaRequired, setMfaRequired] = useState(false);
  const [otp, setOtp] = useState('');
  const [emailForOtp, setEmailForOtp] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  useEffect(() => {
    const successMessage = searchParams.get('success');
    if (successMessage) setSuccess(successMessage);
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // 🔐 LOGIN STEP
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      // 🔐 MFA REQUIRED
      if (data.mfaRequired) {
        setMfaRequired(true);
        setEmailForOtp(data.email);
        return;
      }

      router.push('/dashboard');

    } catch {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // 🔐 OTP VERIFY STEP
  const handleVerifyOtp = async () => {
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailForOtp,
          otp: otp, // ✅ FIXED (important)
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid OTP');
        return;
      }

      // 🔐 STORE JWT TOKEN
      localStorage.setItem('token', data.token);

      // OPTIONAL: preload user session check
      await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${data.token}`,
        },
      });

      router.push('/dashboard');

    } catch {
      setError('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
<<<<<<<< HEAD:src/app/auth/login/LoginContent.tsx
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] py-12 px-4">
      <div className="w-full max-w-md bg-[var(--color-surface)] rounded-lg shadow-md p-8">
        <h2 className="text-3xl font-bold text-center mb-6">Login</h2>
========
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">

        <h2 className="text-3xl font-bold text-center mb-6">
          Login
        </h2>
>>>>>>>> 6dbb10209467db3511a717ab4f295674c0da5714:carehomes-support-docs/src/app/auth/login/LoginContent.tsx

        {error && <div className="bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 text-[var(--color-danger)] px-4 py-3 rounded mb-4">{error}</div>}
        {success && <div className="bg-[var(--color-success)]/10 border border-[var(--color-success)]/20 text-[var(--color-success)] px-4 py-3 rounded mb-4">{success}</div>}

<<<<<<<< HEAD:src/app/auth/login/LoginContent.tsx
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            name="email"
            type="email"
            placeholder="Email"
            onChange={handleChange}
            className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          />

          <input
            name="password"
            type="password"
            placeholder="Password"
            onChange={handleChange}
            className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          />

          <button className="w-full bg-[var(--color-secondary)] text-[var(--color-surface)] py-2 rounded-lg hover:bg-[var(--color-secondary-hover)] font-medium transition">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
          No account? <Link href="/auth/signup" className="text-[var(--color-secondary)] hover:underline font-medium">Sign up</Link>
========
        {/* LOGIN FORM */}
        {!mfaRequired ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              name="email"
              type="email"
              placeholder="Email"
              onChange={handleChange}
              className="w-full border p-2"
              required
            />

            <input
              name="password"
              type="password"
              placeholder="Password"
              onChange={handleChange}
              className="w-full border p-2"
              required
            />

            <button className="w-full bg-blue-600 text-white py-2">
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        ) : (
          // OTP FORM
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-center">
              Verify OTP
            </h3>

            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full border p-2"
              required
            />

            <button
              onClick={handleVerifyOtp}
              className="w-full bg-green-600 text-white py-2"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </div>
        )}

        <p className="mt-4 text-sm text-center">
          No account? <Link href="/auth/signup">Sign up</Link>
>>>>>>>> 6dbb10209467db3511a717ab4f295674c0da5714:carehomes-support-docs/src/app/auth/login/LoginContent.tsx
        </p>

      </div>
    </div>
  );
}