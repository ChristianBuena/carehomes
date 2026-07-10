import { redirect } from "next/navigation";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Settings as SettingsIcon, User, Mail, Shield, Key } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Settings — Dashboard",
  description: "Manage your account settings and preferences.",
};

export default async function SettingsPage() {
  const user = await getUserFromRequest();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({ where: { id: user.userId } });
  if (!dbUser) redirect("/login");

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-6">
        <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
          <SettingsIcon className="h-5 w-5 text-[var(--color-primary)]" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-text)]">Account Settings</h2>
          <p className="text-sm text-[var(--color-muted)] mt-0.5">
            Manage your personal information and security preferences.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Profile Section */}
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg)]/50">
            <h3 className="font-semibold text-[var(--color-text)] flex items-center gap-2">
              <User className="h-4 w-4 text-[var(--color-muted)]" /> Profile Information
            </h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid sm:grid-cols-3 gap-4 sm:items-center">
              <label className="text-sm font-medium text-[var(--color-text)] sm:text-right">Name</label>
              <div className="sm:col-span-2">
                <input
                  type="text"
                  disabled
                  defaultValue={dbUser.name || ""}
                  className="w-full px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md text-[var(--color-text)] text-sm cursor-not-allowed"
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-4 sm:items-center">
              <label className="text-sm font-medium text-[var(--color-text)] sm:text-right flex sm:justify-end items-center gap-2">
                Email Address
                <Mail className="h-3.5 w-3.5 text-[var(--color-muted)]" />
              </label>
              <div className="sm:col-span-2">
                <input
                  type="email"
                  disabled
                  defaultValue={dbUser.email}
                  className="w-full px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-md text-[var(--color-text)] text-sm cursor-not-allowed"
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-4 sm:items-center">
              <label className="text-sm font-medium text-[var(--color-text)] sm:text-right flex sm:justify-end items-center gap-2">
                Account Role
                <Shield className="h-3.5 w-3.5 text-[var(--color-muted)]" />
              </label>
              <div className="sm:col-span-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  {user.role}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-bg)]/50">
            <h3 className="font-semibold text-[var(--color-text)] flex items-center gap-2">
              <Key className="h-4 w-4 text-[var(--color-muted)]" /> Security
            </h3>
          </div>
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-medium text-[var(--color-text)]">Password</h4>
                <p className="text-sm text-[var(--color-muted)] mt-1">
                  Change your password to keep your account secure.
                </p>
              </div>
              <Button variant="outline" disabled className="shrink-0 cursor-not-allowed">
                Update Password
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
