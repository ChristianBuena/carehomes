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

  // 🔐 MFA STATES
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

  // ✅ LOGIN (STEP 1)
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

      // 🔐 MFA FLOW
      if (data.mfaRequired) {
        setMfaRequired(true);
        setEmailForOtp(data.email);
        return;
      }

      // fallback (if MFA disabled)
      router.push('/dashboard');

    } catch {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // ✅ OTP VERIFY (STEP 2)
  const handleVerifyOtp = async () => {
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailForOtp,
          code: otp,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid OTP');
        return;
      }

      // 🎉 SUCCESS → LOGIN COMPLETE
      router.push('/dashboard');

    } catch {
      setError('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOtp(e.target.value);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">

        <h2 className="text-3xl font-bold text-center mb-6">
          Login
        </h2>

        {error && <div className="text-red-600 mb-4">{error}</div>}
        {success && <div className="text-green-600 mb-4">{success}</div>}

        {/* 🔐 STEP 1: LOGIN FORM */}
        {!mfaRequired ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              name="email"
              type="email"
              placeholder="Email"
              onChange={handleChange}
              className="w-full border p-2"
            />

            <input
              name="password"
              type="password"
              placeholder="Password"
              onChange={handleChange}
              className="w-full border p-2"
            />

            <button className="w-full bg-blue-600 text-white py-2">
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        ) : (
          /* 🔐 STEP 2: OTP FORM */
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-center">
              Verify OTP
            </h3>

            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={handleOtpChange}
              className="w-full border p-2"
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
        </p>

      </div>
    </div>
  );
}