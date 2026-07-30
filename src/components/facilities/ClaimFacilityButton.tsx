"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, PlusCircle } from "lucide-react";
import { claimFacility } from "@/app/actions/claimFacility";
import Link from "next/link";

interface ClaimFacilityButtonProps {
  facilityId: string;
  isClaimedByCurrentUser: boolean;
  hasActiveMembership: boolean;
  isClaimedByOther: boolean;
  hasReachedLimit?: boolean;
}

export function ClaimFacilityButton({
  facilityId,
  isClaimedByCurrentUser,
  hasActiveMembership,
  isClaimedByOther,
  hasReachedLimit = false,
}: ClaimFacilityButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!hasActiveMembership) {
    return (
      <Button
        asChild
        variant="outline"
        className="h-12 px-6 border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white font-semibold"
      >
        <Link href="/pricing">Join to Claim Facility</Link>
      </Button>
    );
  }

  if (isClaimedByCurrentUser) {
    return (
      <Button
        asChild
        variant="outline"
        className="h-12 px-6 border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white font-semibold"
      >
        <Link href="/dashboard/facilities">
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Facility Claimed
        </Link>
      </Button>
    );
  }

  if (isClaimedByOther) {
    return (
      <Button
        variant="outline"
        disabled
        className="h-12 px-6 border-white/20 bg-transparent text-white/50 font-semibold cursor-not-allowed"
      >
        Already Claimed
      </Button>
    );
  }

  if (hasReachedLimit) {
    return (
      <Button
        variant="outline"
        disabled
        title="Facility limit reached — upgrade your plan to claim more facilities."
        className="h-12 px-6 border-white/20 bg-transparent text-white/50 font-semibold cursor-not-allowed"
      >
        Limit Reached
      </Button>
    );
  }

  const handleClaim = () => {
    setError(null);
    startTransition(async () => {
      const result = await claimFacility(facilityId);
      if (!result.success) {
        setError(result.error || "Failed to claim facility");
      }
    });
  };

  return (
    <div className="flex flex-col items-end relative">
      <Button
        onClick={handleClaim}
        disabled={isPending}
        variant="outline"
        className="h-12 px-6 border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white font-semibold shadow-md"
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <PlusCircle className="w-4 h-4 mr-2" />
        )}
        Claim Facility
      </Button>
      {error && (
        <span className="text-red-300 text-xs mt-1 absolute -bottom-5 right-0 whitespace-nowrap">
          {error}
        </span>
      )}
    </div>
  );
}
