import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyToken } from "@/lib/jwt";
import { hasPermission } from "@/lib/permissions";
import { createTakedownRequest, getTakedownRequests } from "@/services/takedown.service";
import { TakedownReason, TakedownStatus } from "@/types/takedown.types";

const createTakedownSchema = z.object({
  requesterName: z.string().min(2, "Name must be at least 2 characters").max(100),
  requesterEmail: z.string().email("Invalid email address"),
  facilityOrRebuttal: z.string().min(2, "Please specify the affected facility, rebuttal URL, or name"),
  reason: z.enum([
    "PRIVACY_PII_PHI",
    "INACCURATE_INFORMATION",
    "DEFAMATION_HARASSMENT",
    "COURT_ORDER",
    "COPYRIGHT_IP",
    "OTHER",
  ]),
  reasonDetails: z.string().max(200).optional(),
  supportingInfo: z.string().min(10, "Please provide supporting details explaining the violation (min 10 characters)"),
  rebuttalId: z.string().optional(),
  facilityId: z.string().optional(),
});

/**
 * Public POST: Submit a new takedown request (No login required).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = createTakedownSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const takedown = await createTakedownRequest({
      requesterName: validated.data.requesterName.trim(),
      requesterEmail: validated.data.requesterEmail.trim().toLowerCase(),
      facilityOrRebuttal: validated.data.facilityOrRebuttal.trim(),
      reason: validated.data.reason as TakedownReason,
      reasonDetails: validated.data.reasonDetails?.trim(),
      supportingInfo: validated.data.supportingInfo.trim(),
      rebuttalId: validated.data.rebuttalId,
      facilityId: validated.data.facilityId,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Your takedown request has been received. Our team will review it within our 72-hour target SLA.",
        ticketNumber: takedown.ticketNumber,
        submittedAt: takedown.submittedAt,
        slaDeadline: takedown.slaDeadline,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Takedown submission error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while processing your request. Please try again or email takedowns@carehomessupportdocs.org." },
      { status: 500 }
    );
  }
}

/**
 * Protected GET: Fetch all takedown requests for ADMIN / MODERATOR dashboard.
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!hasPermission(user.role, "manage_incidents")) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status") as TakedownStatus | "ALL" | null;
    const query = searchParams.get("q") ?? undefined;

    const requests = await getTakedownRequests({
      status: statusParam ?? "ALL",
      query,
    });

    return NextResponse.json({ success: true, requests });
  } catch (error) {
    console.error("Failed to fetch takedown requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch takedown requests" },
      { status: 500 }
    );
  }
}
