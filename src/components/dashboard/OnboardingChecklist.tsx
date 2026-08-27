"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  CheckCircle2, 
  Circle, 
  ArrowRight, 
  Sparkles, 
  CreditCard, 
  Building2, 
  FileText, 
  UserCheck,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface OnboardingChecklistProps {
  hasActiveMembership: boolean;
  facilityCount: number;
  rebuttalCount: number;
  userName?: string;
}

export function OnboardingChecklist({
  hasActiveMembership,
  facilityCount,
  rebuttalCount,
  userName = "there",
}: OnboardingChecklistProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const steps = [
    {
      id: "account",
      title: "Create your account",
      description: "Set up your operator login and verify credentials via MFA.",
      completed: true, // User is already logged in to view dashboard
      href: "/dashboard/settings",
      actionText: "View Profile",
      icon: UserCheck,
    },
    {
      id: "membership",
      title: "Choose a membership plan",
      description: "Select an active subscription tier to unlock facility claiming and rebuttal publishing.",
      completed: hasActiveMembership,
      href: "/pricing",
      actionText: hasActiveMembership ? "Manage Plan" : "Choose Plan",
      icon: CreditCard,
    },
    {
      id: "facility",
      title: "Claim your first facility",
      description: "Search the licensed directory and claim ownership of your care facility.",
      completed: facilityCount > 0,
      href: "/facilities",
      actionText: facilityCount > 0 ? "View Facilities" : "Claim Facility",
      icon: Building2,
      disabled: !hasActiveMembership,
      disabledReason: "Requires active membership",
    },
    {
      id: "rebuttal",
      title: "Submit your first rebuttal",
      description: "Draft a compliant, redacted response to a state citation for moderation review.",
      completed: rebuttalCount > 0,
      href: "/dashboard/rebuttals/new",
      actionText: rebuttalCount > 0 ? "View Rebuttals" : "Submit Rebuttal",
      icon: FileText,
      disabled: !hasActiveMembership || facilityCount === 0,
      disabledReason: facilityCount === 0 ? "Claim a facility first" : "Requires active membership",
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  // If all steps are complete, the checklist should not display (handled by parent or fallback)
  if (completedCount === steps.length) {
    return null;
  }

  return (
    <Card className="overflow-hidden border border-[var(--color-primary)]/20 bg-gradient-to-br from-[var(--color-surface)] via-[var(--color-surface)] to-[var(--color-primary)]/5 shadow-md">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 border-b border-[var(--color-border)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent)]/90 px-2.5 py-0.5 text-xs font-semibold">
                <Sparkles className="w-3 h-3 mr-1" aria-hidden="true" />
                Getting Started
              </Badge>
              <span className="text-xs text-[var(--color-muted)] font-medium">
                Step {completedCount + 1} of {steps.length}
              </span>
            </div>
            <h2 className="text-xl font-bold text-[var(--color-text)]">
              Welcome to CareHomesSupportDocs, {userName}!
            </h2>
            <p className="text-sm text-[var(--color-muted)]">
              Complete these steps to unlock full rebuttal management and public publication for your care facilities.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center shrink-0">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-[var(--color-primary)]">
                {progressPercent}% Completed
              </div>
              <div className="text-xs text-[var(--color-muted)]">
                {completedCount} of {steps.length} steps done
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-[var(--color-muted)] hover:text-[var(--color-text)] h-8 px-2"
              aria-label={isCollapsed ? "Expand onboarding checklist" : "Collapse onboarding checklist"}
            >
              {isCollapsed ? (
                <>
                  <span className="text-xs mr-1 font-medium sm:hidden">{progressPercent}%</span>
                  <ChevronDown className="w-4 h-4" />
                </>
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 w-full bg-[var(--color-border)]/60 rounded-full h-2 overflow-hidden" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
          <div 
            className="bg-gradient-to-r from-[var(--color-secondary)] to-[var(--color-accent)] h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Checklist Steps Body */}
      {!isCollapsed && (
        <div className="p-4 sm:p-6 divide-y divide-[var(--color-border)]/60">
          {steps.map((step, idx) => {
            const StepIcon = step.icon;
            const isNextStep = !step.completed && (idx === 0 || steps[idx - 1].completed);

            return (
              <div 
                key={step.id} 
                className={`py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                  isNextStep ? "bg-[var(--color-primary)]/[0.02] -mx-4 sm:-mx-6 px-4 sm:px-6 rounded-lg" : ""
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="mt-0.5 shrink-0">
                    {step.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-[var(--color-success)] fill-[var(--color-success)]/10" aria-label="Completed step" />
                    ) : (
                      <Circle className={`w-5 h-5 ${isNextStep ? "text-[var(--color-accent)] font-bold stroke-[2.5]" : "text-[var(--color-muted)]/50"}`} aria-label="Pending step" />
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-sm font-semibold ${step.completed ? "line-through text-[var(--color-muted)]" : "text-[var(--color-text)]"}`}>
                        {step.title}
                      </h3>
                      {isNextStep && (
                        <span className="inline-flex items-center text-[10px] uppercase font-bold text-[var(--color-accent)] bg-[var(--color-accent)]/10 px-1.5 py-0.2 rounded tracking-wider">
                          Next Up
                        </span>
                      )}
                    </div>
                    <p className={`text-xs ${step.completed ? "text-[var(--color-muted)]/70" : "text-[var(--color-muted)]"}`}>
                      {step.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:self-center pl-8 sm:pl-0 shrink-0">
                  {step.completed ? (
                    <Badge variant="outline" className="text-xs text-[var(--color-success)] border-[var(--color-success)]/30 bg-[var(--color-success)]/5">
                      Completed
                    </Badge>
                  ) : step.disabled ? (
                    <Button 
                      disabled 
                      size="sm" 
                      variant="outline" 
                      className="text-xs h-8 opacity-60 cursor-not-allowed"
                      title={step.disabledReason}
                    >
                      {step.actionText}
                    </Button>
                  ) : (
                    <Button
                      asChild
                      size="sm"
                      className={`text-xs h-8 ${
                        isNextStep 
                          ? "bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white font-medium shadow-sm" 
                          : "bg-[var(--color-surface)] hover:bg-[var(--color-border)]/50 text-[var(--color-text)] border border-[var(--color-border)]"
                      }`}
                    >
                      <Link href={step.href} className="inline-flex items-center gap-1.5">
                        <StepIcon className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{step.actionText}</span>
                        <ArrowRight className="w-3 h-3 ml-0.5" aria-hidden="true" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
