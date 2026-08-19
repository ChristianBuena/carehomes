"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  FileText,
  Building2,
  BookOpen,
  Settings,
  LogOut,
  Menu,
  X,
  ClipboardCheck,
  Users,
  CreditCard,
  Calendar,
  Library,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { hasPermission } from "@/lib/permissions";

const NAV_LINKS = [
  { name: "Dashboard", href: "/dashboard", icon: Home, permission: null },
  {
    name: "My Facilities",
    href: "/dashboard/facilities",
    icon: Building2,
    permission: "view_own_facilities",
  },
  {
    name: "My Rebuttals",
    href: "/dashboard/rebuttals",
    icon: FileText,
    permission: "view_own_rebuttals",
  },
  {
    name: "Citation Deadlines",
    href: "/dashboard/deadlines",
    icon: Calendar,
    permission: "view_own_facilities",
  },
  {
    name: "Member Library",
    href: "/dashboard/library",
    icon: BookOpen,
    permission: "access_library",
  },
  {
    name: "Moderation Queue",
    href: "/dashboard/moderation",
    icon: ClipboardCheck,
    permission: "moderate_rebuttals",
  },
  {
    name: "Incidents & SLA",
    href: "/dashboard/incidents",
    icon: ShieldAlert,
    permission: "manage_incidents",
  },
  {
    name: "Manage Templates",
    href: "/dashboard/templates",
    icon: Library,
    permission: "manage_templates",
  },
  {
    name: "Manage Users",
    href: "/dashboard/users",
    icon: Users,
    permission: "manage_users",
  },
  {
    name: "Manage Facilities",
    href: "/dashboard/facilities/manage",
    icon: Settings,
    permission: "manage_facilities",
  },
  {
    name: "Memberships",
    href: "/dashboard/memberships",
    icon: CreditCard,
    permission: "manage_memberships",
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    permission: null,
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  const currentLink = NAV_LINKS.find((link) => link.href === pathname);
  const pageTitle = currentLink ? currentLink.name : "Dashboard";

  // Filter based on permission and override ADMIN hiding
  const visibleNavItems = NAV_LINKS.filter((item) => {
    if (!user || !user.role) return item.permission === null;

    // Hide member-only items from ADMIN dashboard (admins use management pages instead)
    if (
      user.role === "ADMIN" &&
      (item.name === "My Facilities" ||
        item.name === "My Rebuttals" ||
        item.name === "Member Library")
    ) {
      return false;
    }

    return (
      item.permission === null ||
      hasPermission(user.role, item.permission as any)
    );
  });

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  const roleColors: Record<string, string> = {
    ADMIN: "bg-[var(--color-danger)] text-white",
    MODERATOR: "bg-[var(--color-warning)] text-white",
    MEMBER: "bg-[var(--color-secondary)] text-white",
  };

  const defaultRoleColor = "bg-[var(--color-secondary)] text-white";
  const userRoleColor = user?.role
    ? roleColors[user.role.toUpperCase()] || defaultRoleColor
    : defaultRoleColor;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex md:flex-row flex-col">
      {/* Mobile Topbar */}
      <div className="md:hidden flex items-center justify-between h-16 bg-[var(--color-primary)] px-4 z-20 shadow-md shrink-0">
        <Link href="/" className="text-xl font-bold text-white tracking-tight">
          CareHomesSupportDocs
        </Link>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-white p-2"
          aria-label="Toggle Menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:sticky top-0 left-0 h-full md:h-screen w-[260px] 
          bg-[var(--color-primary)] text-white z-40
          transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 flex flex-col
        `}
      >
        <div className="h-16 flex items-center px-6 border-b border-white/10 shrink-0 md:flex hidden">
          <Link
            href="/"
            className="text-xl font-bold tracking-tight text-white hover:text-white/90 transition"
          >
            CareHomesSupportDocs
          </Link>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {visibleNavItems.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors
                  ${
                    isActive
                      ? "bg-[var(--color-secondary)] text-white"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }
                `}
              >
                <Icon size={20} />
                {link.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 shrink-0">
          {!loading && user ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 px-2">
                <div className="w-10 h-10 rounded-full bg-[var(--color-surface)] text-[var(--color-primary)] flex items-center justify-center font-bold shrink-0">
                  {user.name
                    ? user.name.charAt(0).toUpperCase()
                    : user.email.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span
                    className="text-sm font-semibold truncate"
                    title={user.name || user.email}
                  >
                    {user.name || "User"}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase mt-0.5 w-fit ${userRoleColor}`}
                  >
                    {user.role}
                  </span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center cursor-pointer gap-3 px-4 py-2 mt-2 w-full text-left rounded-lg text-white/80 hover:bg-[var(--color-danger)] hover:text-white transition-colors"
              >
                <LogOut size={20} />
                Logout
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 animate-pulse">
              <div className="flex items-center gap-3 px-2">
                <div className="w-10 h-10 rounded-full bg-white/20 shrink-0" />
                <div className="flex flex-col gap-2">
                  <div className="w-24 h-4 bg-white/20 rounded" />
                  <div className="w-16 h-3 bg-white/20 rounded" />
                </div>
              </div>
              <div className="h-10 w-full bg-white/10 rounded-lg mt-2" />
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Desktop Topbar */}
        <header className="hidden md:flex h-16 bg-[var(--color-surface)] border-b border-[var(--color-border)] items-center justify-between px-8 shrink-0">
          <h1 className="text-xl font-bold text-[var(--color-text)]">
            {pageTitle}
          </h1>
          <div className="flex items-center gap-4">
            {!loading && user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-[var(--color-text)]">
                  {user.name || user.email}
                </span>
                <div className="w-9 h-9 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center font-bold">
                  {user.name
                    ? user.name.charAt(0).toUpperCase()
                    : user.email.charAt(0).toUpperCase()}
                </div>
              </div>
            ) : (
              <div className="w-9 h-9 rounded-full bg-[var(--color-border)] animate-pulse" />
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
