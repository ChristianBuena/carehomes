"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Focus trap and escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
      
      if (e.key === "Tab" && isOpen && menuRef.current) {
        const focusableElements = menuRef.current.querySelectorAll(
          'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
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

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        aria-label="Open main navigation"
        aria-expanded={isOpen}
        className="text-white hover:bg-white/10"
      >
        <Menu className="h-6 w-6" />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
            aria-hidden="true"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Drawer */}
          <div 
            ref={menuRef}
            className="relative flex w-[85%] max-w-sm flex-col bg-[var(--color-bg)] shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] p-4">
              <span className="font-bold text-[var(--color-primary)]">Menu</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                aria-label="Close navigation"
                className="text-[var(--color-text)] hover:bg-[var(--color-border)]"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
            
            <nav className="flex-1 overflow-y-auto p-4 flex flex-col space-y-4">
              {siteConfig.mainNav.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="block py-2 text-lg font-medium text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <hr className="my-4 border-[var(--color-border)]" />
              <div className="flex flex-col space-y-3">
                <Button variant="outline" className="w-full border-[var(--color-primary)] text-[var(--color-primary)]" onClick={() => setIsOpen(false)}>
                  Member Login
                </Button>
                <Button className="w-full bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent)]/90" onClick={() => setIsOpen(false)}>
                  Join Now
                </Button>
              </div>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
