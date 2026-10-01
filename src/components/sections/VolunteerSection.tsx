"use client";

import { useState } from "react";
import { ResponsiveContainer } from "@/components/ui/ResponsiveContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const VOLUNTEER_ROLES = [
  {
    title: "Resource reviewer",
    description:
      "Help organize and review educational materials for clarity, usefulness, and responsible redaction.",
  },
  {
    title: "Care-community contributor",
    description:
      "Share practical experience from residential care operations, administration, caregiving, or resident advocacy.",
  },
  {
    title: "Research & policy volunteer",
    description:
      "Locate public guidance, track policy developments, and summarize information in plain language.",
  },
  {
    title: "Outreach & partnerships volunteer",
    description:
      "Build respectful connections with providers, families, advocates, professionals, and community organizations.",
  },
  {
    title: "Accessibility & communications volunteer",
    description:
      "Improve readability, digital accessibility, translation readiness, newsletters, and community updates.",
  },
];

export function VolunteerSection() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    cityState: "",
    role: "",
    availability: "1–2 hours per month",
    background: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const subject = encodeURIComponent(
      `Volunteer Interest: ${formData.role || "General"} - ${formData.fullName}`
    );

    const body = encodeURIComponent(
      `Full Name: ${formData.fullName}\n` +
      `Email: ${formData.email}\n` +
      `Phone: ${formData.phone || "Not provided"}\n` +
      `City/State: ${formData.cityState || "Not provided"}\n` +
      `Preferred Role: ${formData.role || "Not specified"}\n` +
      `Availability: ${formData.availability}\n` +
      `Relevant Background: ${formData.background || "Not provided"}\n\n` +
      `How I would like to contribute:\n${formData.message || "Not provided"}`
    );

    window.location.href = `mailto:support@carehomessupportdocs.org?subject=${subject}&body=${body}`;
  };

  return (
    <section
      id="get-involved"
      aria-labelledby="volunteer-heading"
      className="py-16 md:py-24 bg-[var(--color-bg)] transition-colors duration-200"
    >
      <ResponsiveContainer>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left Column — 5 cols */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-[0.2em]">
                Volunteer With Us
              </span>
            </div>

            <h2
              id="volunteer-heading"
              className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-[var(--color-text)] tracking-tight leading-[1.15]"
            >
              Contribute skills that strengthen care.
            </h2>

            <p className="text-[var(--color-muted)] text-base md:text-lg leading-relaxed">
              Tell us how you would like to help. Volunteers may contribute remotely, on a flexible schedule, and within clearly defined responsibilities.
            </p>

            {/* Role Cards with Coral Left Accent Line */}
            <div className="space-y-4 pt-2">
              {VOLUNTEER_ROLES.map((role) => (
                <div
                  key={role.title}
                  className="p-5 md:p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] border-l-4 border-l-[var(--color-accent)] shadow-sm hover:border-[var(--color-primary)]/40 transition-all duration-200"
                >
                  <h3 className="text-base md:text-lg font-bold text-[var(--color-text)] mb-1.5">
                    {role.title}
                  </h3>
                  <p className="text-xs md:text-sm text-[var(--color-muted)] leading-relaxed">
                    {role.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column — Volunteer Form Card (7 cols) */}
          <div className="lg:col-span-7">
            <div className="p-6 md:p-10 rounded-3xl bg-[#0f172a]/90 dark:bg-[#0f172a] border border-white/10 dark:border-slate-800 shadow-2xl backdrop-blur-sm">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Row 1: Full name + Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="vol-name"
                      className="block text-xs font-semibold text-slate-300 tracking-wide"
                    >
                      Full name
                    </label>
                    <Input
                      id="vol-name"
                      type="text"
                      required
                      placeholder=""
                      value={formData.fullName}
                      onChange={(e) =>
                        setFormData({ ...formData, fullName: e.target.value })
                      }
                      className="h-11 bg-slate-900/80 border-slate-700 text-white placeholder-slate-500 rounded-xl focus:border-[var(--color-primary)]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="vol-email"
                      className="block text-xs font-semibold text-slate-300 tracking-wide"
                    >
                      Email address
                    </label>
                    <Input
                      id="vol-email"
                      type="email"
                      required
                      placeholder=""
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="h-11 bg-slate-900/80 border-slate-700 text-white placeholder-slate-500 rounded-xl focus:border-[var(--color-primary)]"
                    />
                  </div>
                </div>

                {/* Row 2: Phone + City / State */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="vol-phone"
                      className="block text-xs font-semibold text-slate-300 tracking-wide"
                    >
                      Phone (optional)
                    </label>
                    <Input
                      id="vol-phone"
                      type="tel"
                      placeholder=""
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="h-11 bg-slate-900/80 border-slate-700 text-white placeholder-slate-500 rounded-xl focus:border-[var(--color-primary)]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="vol-city"
                      className="block text-xs font-semibold text-slate-300 tracking-wide"
                    >
                      City / state
                    </label>
                    <Input
                      id="vol-city"
                      type="text"
                      placeholder=""
                      value={formData.cityState}
                      onChange={(e) =>
                        setFormData({ ...formData, cityState: e.target.value })
                      }
                      className="h-11 bg-slate-900/80 border-slate-700 text-white placeholder-slate-500 rounded-xl focus:border-[var(--color-primary)]"
                    />
                  </div>
                </div>

                {/* Row 3: Preferred volunteer role */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="vol-role"
                    className="block text-xs font-semibold text-slate-300 tracking-wide"
                  >
                    Preferred volunteer role
                  </label>
                  <select
                    id="vol-role"
                    required
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                    className="w-full h-11 px-3 bg-slate-900/80 border border-slate-700 text-white rounded-xl focus:outline-none focus:border-[var(--color-primary)] text-sm"
                  >
                    <option value="" disabled className="bg-slate-900 text-slate-400">
                      Select a role
                    </option>
                    {VOLUNTEER_ROLES.map((r) => (
                      <option key={r.title} value={r.title} className="bg-slate-900 text-white">
                        {r.title}
                      </option>
                    ))}
                    <option value="General support" className="bg-slate-900 text-white">
                      General support / Other
                    </option>
                  </select>
                </div>

                {/* Row 4: Typical availability + Relevant background */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="vol-avail"
                      className="block text-xs font-semibold text-slate-300 tracking-wide"
                    >
                      Typical availability
                    </label>
                    <select
                      id="vol-avail"
                      value={formData.availability}
                      onChange={(e) =>
                        setFormData({ ...formData, availability: e.target.value })
                      }
                      className="w-full h-11 px-3 bg-slate-900/80 border border-slate-700 text-white rounded-xl focus:outline-none focus:border-[var(--color-primary)] text-sm"
                    >
                      <option value="1–2 hours per month" className="bg-slate-900">
                        1–2 hours per month
                      </option>
                      <option value="3–5 hours per month" className="bg-slate-900">
                        3–5 hours per month
                      </option>
                      <option value="5–10 hours per month" className="bg-slate-900">
                        5–10 hours per month
                      </option>
                      <option value="Flexible / As needed" className="bg-slate-900">
                        Flexible / As needed
                      </option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="vol-bg"
                      className="block text-xs font-semibold text-slate-300 tracking-wide"
                    >
                      Relevant background
                    </label>
                    <Input
                      id="vol-bg"
                      type="text"
                      placeholder="Care, research, outreach..."
                      value={formData.background}
                      onChange={(e) =>
                        setFormData({ ...formData, background: e.target.value })
                      }
                      className="h-11 bg-slate-900/80 border-slate-700 text-white placeholder-slate-500 rounded-xl focus:border-[var(--color-primary)]"
                    />
                  </div>
                </div>

                {/* Row 5: How would you like to contribute? */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="vol-contrib"
                    className="block text-xs font-semibold text-slate-300 tracking-wide"
                  >
                    How would you like to contribute?
                  </label>
                  <Textarea
                    id="vol-contrib"
                    rows={4}
                    placeholder=""
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    className="bg-slate-900/80 border-slate-700 text-white placeholder-slate-500 rounded-xl focus:border-[var(--color-primary)] resize-none"
                  />
                </div>

                {/* Privacy / disclaimer note */}
                <p className="text-xs text-slate-400 leading-relaxed pt-1">
                  Selecting “Send volunteer interest” opens your email app with this information addressed to Care Home Support Docs. Your information is not stored on this website.
                </p>

                {/* Submit CTA */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold rounded-full px-8 py-3 shadow-lg shadow-[var(--color-primary)]/20 transition-all text-sm"
                  >
                    Send volunteer interest
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </ResponsiveContainer>
    </section>
  );
}
