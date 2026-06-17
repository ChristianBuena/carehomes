"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export function HeaderAuthActions() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (loading) {
    return (
      <div className="hidden lg:flex items-center gap-4">
        <div className="h-10 w-24 bg-white/10 animate-pulse rounded-md"></div>
        <div className="h-10 w-24 bg-[var(--color-secondary)]/50 animate-pulse rounded-md"></div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className="hidden lg:flex items-center gap-3">
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-full border border-white/15 bg-white/5">
          <span className="text-sm font-medium text-white leading-none whitespace-nowrap">
            {user.name || user.email}
          </span>
          <span className="text-[10px] bg-[var(--color-secondary)] text-white px-2.5 py-1 rounded-full uppercase font-bold tracking-wider leading-none shadow-sm">
            {user.role}
          </span>
        </div>

        <div className="h-6 w-px bg-white/15" />

        <Button
          asChild
          variant="ghost"
          className="text-white hover:bg-white/10 cursor-pointer hover:text-white"
        >
          <Link href="/dashboard">Dashboard</Link>
        </Button>
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="text-white hover:bg-white/10 cursor-pointer hover:text-white"
        >
          Logout
        </Button>
      </div>
    );
  }

  return (
    <div className="hidden lg:flex items-center gap-4">
      <Button
        asChild
        variant="ghost"
        className="text-white hover:bg-white/10 cursor-pointer hover:text-white"
      >
        <Link href="/login">Member Login</Link>
      </Button>
      <Button
        asChild
        className="bg-[var(--color-secondary)] text-white hover:bg-[var(--color-secondary-hover)] font-semibold border-none cursor-pointer"
      >
        <Link href="/pricing">Join Now</Link>
      </Button>
    </div>
  );
}
