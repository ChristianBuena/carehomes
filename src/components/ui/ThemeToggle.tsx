"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  /**
   * - "button": single-click toggle between light & dark (default)
   * - "dropdown": opens menu to choose Light, Dark, or System
   * - "segmented": 3-state pill selector (Light | Dark | System)
   * - "inline": full row with label and switch for drawers/mobile menus
   */
  variant?: "button" | "dropdown" | "segmented" | "inline";
  className?: string;
}

export function ThemeToggle({
  variant = "button",
  className,
}: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Hydration fallback with matching dimensions to prevent layout shifts
  if (!mounted) {
    if (variant === "segmented") {
      return (
        <div
          className={cn(
            "inline-flex p-1 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] h-11 w-64 animate-pulse",
            className
          )}
        />
      );
    }
    if (variant === "inline") {
      return (
        <div
          className={cn(
            "flex items-center justify-between p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] h-12 w-full animate-pulse",
            className
          )}
        />
      );
    }
    return (
      <Button
        variant="ghost"
        size="icon"
        disabled
        aria-label="Toggle theme"
        className={cn(
          "min-h-[44px] min-w-[44px] rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors",
          className
        )}
      >
        <div className="h-5 w-5 rounded-full bg-white/20 animate-pulse" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  const handleToggle = () => {
    setTheme(isDark ? "light" : "dark");
  };

  // 1. Segmented Control (Light | Dark | System)
  if (variant === "segmented") {
    const options = [
      { id: "light", label: "Light", icon: Sun },
      { id: "dark", label: "Dark", icon: Moon },
      { id: "system", label: "System", icon: Monitor },
    ] as const;

    return (
      <div
        role="radiogroup"
        aria-label="Select color theme"
        className={cn(
          "inline-flex p-1 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border)] gap-1",
          className
        )}
      >
        {options.map((opt) => {
          const Icon = opt.icon;
          const isSelected = theme === opt.id;
          return (
            <button
              key={opt.id}
              role="radio"
              aria-checked={isSelected}
              onClick={() => setTheme(opt.id)}
              className={cn(
                "flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-all min-h-[40px] flex-1 cursor-pointer select-none",
                isSelected
                  ? "bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm font-bold border border-[var(--color-border)]"
                  : "text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]/50"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // 2. Inline row with label (Ideal for Mobile Navigation drawer)
  if (variant === "inline") {
    return (
      <div
        className={cn(
          "flex items-center justify-between p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]",
          className
        )}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[var(--color-bg)] text-[var(--color-primary)]">
            {isDark ? (
              <Moon className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Sun className="h-4 w-4" aria-hidden="true" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--color-text)] leading-none">
              Dark Mode
            </p>
            <p className="text-xs text-[var(--color-muted)] mt-1">
              Currently {isDark ? "enabled" : "disabled"}
            </p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={isDark}
          onClick={handleToggle}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className={cn(
            "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]",
            isDark ? "bg-[var(--color-primary)]" : "bg-[var(--color-border)]"
          )}
        >
          <span
            className={cn(
              "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center",
              isDark ? "translate-x-5 text-[var(--color-primary)]" : "translate-x-0 text-amber-500"
            )}
          >
            {isDark ? (
              <Moon className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Sun className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </span>
        </button>
      </div>
    );
  }

  // 3. Dropdown Menu Variant
  if (variant === "dropdown") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "min-h-[44px] min-w-[44px] rounded-lg text-white hover:bg-white/10 hover:text-white transition-colors cursor-pointer",
              className
            )}
            aria-label="Select theme"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Select theme</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36 bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)]">
          <DropdownMenuItem
            onClick={() => setTheme("light")}
            className="flex items-center justify-between cursor-pointer focus:bg-[var(--color-bg)]"
          >
            <span className="flex items-center gap-2">
              <Sun className="h-4 w-4" /> Light
            </span>
            {theme === "light" && <Check className="h-4 w-4 text-[var(--color-primary)]" />}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setTheme("dark")}
            className="flex items-center justify-between cursor-pointer focus:bg-[var(--color-bg)]"
          >
            <span className="flex items-center gap-2">
              <Moon className="h-4 w-4" /> Dark
            </span>
            {theme === "dark" && <Check className="h-4 w-4 text-[var(--color-primary)]" />}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setTheme("system")}
            className="flex items-center justify-between cursor-pointer focus:bg-[var(--color-bg)]"
          >
            <span className="flex items-center gap-2">
              <Monitor className="h-4 w-4" /> System
            </span>
            {theme === "system" && <Check className="h-4 w-4 text-[var(--color-primary)]" />}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // 4. Default Single-click Toggle Button
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      className={cn(
        "relative min-h-[44px] min-w-[44px] rounded-lg text-white hover:bg-white/10 hover:text-white transition-colors cursor-pointer",
        className
      )}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0 text-amber-300" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100 text-blue-300" />
      <span className="sr-only">
        {isDark ? "Switch to light mode" : "Switch to dark mode"}
      </span>
    </Button>
  );
}
