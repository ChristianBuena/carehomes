"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useAuth } from "@/hooks/useAuth";
import { NavLink } from "./NavLink";
import { cn } from "@/lib/utils";

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, loading, isAuthenticated } = useAuth();

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useFocusTrap(menuRef, isOpen);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setIsOpen(false);
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="lg:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        aria-label="Open mobile navigation"
        aria-expanded={isOpen}
        aria-controls="mobile-navigation-menu"
        className="text-[var(--color-surface)] hover:bg-[var(--color-surface)]/10 min-h-[44px] min-w-[44px]"
      >
        <Menu className="h-6 w-6" aria-hidden="true" />
      </Button>

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-[var(--color-text)]/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
              aria-hidden="true"
              onClick={() => setIsOpen(false)}
            />

            <div
              ref={menuRef}
              id="mobile-navigation-menu"
              role="navigation"
              aria-hidden={!isOpen}
              aria-label="Mobile navigation"
              className="relative flex w-[85%] max-w-sm flex-col bg-[var(--color-surface)] shadow-xl animate-in slide-in-from-left duration-300"
            >
              <div className="flex items-center justify-between border-b border-[var(--color-border)] p-4 min-h-[64px]">
                <span className="font-bold text-lg text-[var(--color-primary)]">
                  Menu
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close navigation"
                  className="text-[var(--color-text)] hover:bg-[var(--color-bg)] min-h-[44px] min-w-[44px]"
                >
                  <X className="h-6 w-6" aria-hidden="true" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                {siteConfig.mainNav.map((link) => (
                  <NavLink
                    key={link.label}
                    href={link.href}
                    isMobile
                    onClick={() => setIsOpen(false)}
                  >
                    {link.label}
                  </NavLink>
                ))}

                <hr
                  className="my-4 border-[var(--color-border)]"
                  aria-hidden="true"
                />

                <div className="flex flex-col gap-3 mt-auto mb-4">
                  {loading ? (
                    <>
                      <div className="h-11 w-full bg-[var(--color-border)]/40 animate-pulse rounded-md" />
                      <div className="h-11 w-full bg-[var(--color-border)]/40 animate-pulse rounded-md" />
                    </>
                  ) : isAuthenticated && user ? (
                    <>
                      <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]">
                        <span className="text-sm font-medium text-[var(--color-text)] leading-none">
                          {user.name || user.email}
                        </span>
                        <span className="text-[10px] bg-[var(--color-secondary)] text-white px-2 py-0.5 rounded-full uppercase font-bold tracking-wider leading-none">
                          {user.role}
                        </span>
                      </div>

                      <Button
                        asChild
                        variant="outline"
                        className="w-full min-h-[44px] border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5"
                        onClick={() => setIsOpen(false)}
                      >
                        <Link href="/dashboard">Dashboard</Link>
                      </Button>

                      <Button
                        className="w-full min-h-[44px] bg-[var(--color-danger)] text-white hover:opacity-90"
                        onClick={handleLogout}
                      >
                        Logout
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        asChild
                        variant="outline"
                        className="w-full min-h-[44px] border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5"
                        onClick={() => setIsOpen(false)}
                      >
                        <Link href="/login">Member Login</Link>
                      </Button>

                      <Button
                        asChild
                        className="w-full min-h-[44px] bg-[var(--color-secondary)] text-[var(--color-surface)] hover:bg-[var(--color-secondary-hover)]"
                        onClick={() => setIsOpen(false)}
                      >
                        <Link href="/pricing">Join Now</Link>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
