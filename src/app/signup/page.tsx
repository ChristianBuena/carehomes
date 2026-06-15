"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Eye, EyeOff, Check, X } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const hasMinLength = formData.password.length >= 8;
  const hasUppercase = /[A-Z]/.test(formData.password);
  const hasNumber = /[0-9]/.test(formData.password);
  const hasSpecial = /[!@#$%^&*]/.test(formData.password);
  
  const isPasswordComplex = hasMinLength && hasUppercase && hasNumber && hasSpecial;
  const doPasswordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword.length > 0;
  
  // Submit is disabled if not complex, or passwords don't match, or loading
  const isSubmitDisabled = loading || !isPasswordComplex || !doPasswordsMatch || formData.name.trim() === '' || formData.email.trim() === '';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    
    if (!isPasswordComplex) {
      setError("Please ensure your password meets all requirements.");
      return;
    }
    if (!doPasswordsMatch) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Signup failed. Please try again.');
        return;
      }

      // Redirect to login
      router.push('/login?success=Account created successfully');
    } catch (err) {
      console.error("Signup submission error:", err);
      setError('An error occurred. Please try again later.');
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
        <h2 className="text-2xl font-bold text-center text-[var(--color-text)] mb-8">Create Your Account</h2>

        {error && (
          <div className="bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 text-[var(--color-danger)] px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="John Doe"
              required
              className="w-full min-h-[44px] px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-shadow"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
              className="w-full min-h-[44px] px-4 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-shadow"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="At least 8 characters"
                required
                className="w-full min-h-[44px] px-4 py-2 pr-10 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-shadow"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-text)] focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            
            {/* Complexity Checklist */}
            <div className="mt-3 space-y-1.5 text-sm">
              <p className={`flex items-center gap-2 ${hasMinLength ? 'text-[var(--color-success)]' : 'text-[var(--color-muted)]'}`}>
                {hasMinLength ? <Check className="h-4 w-4" /> : <span className="h-4 w-4 inline-block rounded-full border border-current opacity-50" />}
                At least 8 characters
              </p>
              <p className={`flex items-center gap-2 ${hasUppercase ? 'text-[var(--color-success)]' : 'text-[var(--color-muted)]'}`}>
                {hasUppercase ? <Check className="h-4 w-4" /> : <span className="h-4 w-4 inline-block rounded-full border border-current opacity-50" />}
                At least one uppercase letter
              </p>
              <p className={`flex items-center gap-2 ${hasNumber ? 'text-[var(--color-success)]' : 'text-[var(--color-muted)]'}`}>
                {hasNumber ? <Check className="h-4 w-4" /> : <span className="h-4 w-4 inline-block rounded-full border border-current opacity-50" />}
                At least one number
              </p>
              <p className={`flex items-center gap-2 ${hasSpecial ? 'text-[var(--color-success)]' : 'text-[var(--color-muted)]'}`}>
                {hasSpecial ? <Check className="h-4 w-4" /> : <span className="h-4 w-4 inline-block rounded-full border border-current opacity-50" />}
                At least one special character (!@#$%^&*)
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Repeat password"
                required
                className={`w-full min-h-[44px] px-4 py-2 pr-10 border ${
                  formData.confirmPassword.length > 0 && !doPasswordsMatch
                    ? 'border-[var(--color-danger)] focus:ring-[var(--color-danger)]'
                    : 'border-[var(--color-border)] focus:ring-[var(--color-primary)]'
                } rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-shadow`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[var(--color-text)] focus:outline-none"
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {formData.confirmPassword.length > 0 && !doPasswordsMatch && (
              <p className="mt-1.5 text-sm text-[var(--color-danger)] flex items-center gap-1">
                <X className="h-4 w-4" /> Passwords do not match
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="w-full min-h-[44px] mt-2 flex items-center justify-center bg-[var(--color-secondary)] text-white py-2 px-4 rounded-lg hover:bg-[var(--color-secondary-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-secondary)] font-medium transition disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Account...
              </>
            ) : (
              'Sign Up'
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-[var(--color-text)]">
          Already have an account?{' '}
          <Link href="/login" className="text-[var(--color-secondary)] hover:underline font-semibold">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}