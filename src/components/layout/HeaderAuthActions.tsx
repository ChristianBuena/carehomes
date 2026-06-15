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
      <div className="hidden lg:flex items-center gap-4">
        <div className="flex flex-col items-end mr-2">
          <span className="text-sm font-medium text-white">{user.name || user.email}</span>
          <span className="text-xs bg-[var(--color-secondary)] text-white px-2 rounded-full mt-0.5">
            {user.role}
          </span>
        </div>
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
