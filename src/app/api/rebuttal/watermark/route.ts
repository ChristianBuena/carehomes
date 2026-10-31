import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { applyWatermark, isPdfFile, isPdfTextSearchable } from "@/services/pdf-watermark.service";

/**
 * POST /api/rebuttal/watermark
 * Admin/Moderator manually (re)generates the "PUBLIC REDACTED VERSION" copy.
 * Approval now makes this copy automatically (src/services/approved-copy.service.ts,
 * called from POST /api/moderation); the moderation page's retry button uses
 * POST /api/rebuttal/[id]/approved-copy. This older route is kept as is.
 */
export async function POST(req: NextRequest) {
    try {
        // ── 1. Auth ──────────────────────────────────────────────────────────
        const token = req.cookies.get("auth-token")?.value;
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await getSessionUser(token);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        if (!hasPermission(user.role, "moderate_rebuttals")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // ── 2. Get rebuttal ──────────────────────────────────────────────────
        const { rebuttalId } = await req.json();

        if (!rebuttalId) {
            return NextResponse.json({ error: "rebuttalId is required" }, { status: 400 });
        }

        const rebuttal = await prisma.rebuttal.findFirst({
            where: { id: rebuttalId, deletedAt: null },
        });

        if (!rebuttal) {
            return NextResponse.json({ error: "Rebuttal not found" }, { status: 404 });
        }

        if (!rebuttal.documentUrl) {
            return NextResponse.json({ error: "No document attached to this rebuttal" }, { status: 400 });
        }

        if (rebuttal.watermarkedUrl) {
            return NextResponse.json({ message: "Already watermarked", watermarkedUrl: rebuttal.watermarkedUrl });
        }

        // ── 3. Fetch original PDF ────────────────────────────────────────────
        const response = await fetch(rebuttal.documentUrl);
        if (!response.ok) {
            return NextResponse.json({ error: "Failed to fetch original document" }, { status: 500 });
        }

        const arrayBuffer = await response.arrayBuffer();
        const pdfBuffer = Buffer.from(arrayBuffer);

        // ── 4. Validate PDF ──────────────────────────────────────────────────
        if (!isPdfFile(pdfBuffer)) {
            return NextResponse.json(
                { error: "Uploaded file is not a valid PDF" },
                { status: 400 }
            );
        }

        const isSearchable = await isPdfTextSearchable(pdfBuffer);
        if (!isSearchable) {
            return NextResponse.json(
                { error: "PDF appears to be a scanned image and is not text-searchable. Please upload an OCR-processed PDF." },
                { status: 400 }
            );
        }

        // ── 5. Apply watermark ───────────────────────────────────────────────
        const watermarkedBuffer = await applyWatermark(pdfBuffer);

        // ── 6. Upload watermarked version ────────────────────────────────────
        // Upload to UploadThing or store in /public/watermarked/ for local dev
        // For now, store as base64 data URL (replace with UploadThing in production)
        const base64 = watermarkedBuffer.toString("base64");
        const watermarkedUrl = `data:application/pdf;base64,${base64}`;

        // ── 7. Save watermarked URL to DB ────────────────────────────────────
        await prisma.rebuttal.update({
            where: { id: rebuttalId },
            data: { watermarkedUrl, watermarkStatus: "APPLIED", watermarkError: null, watermarkUpdatedAt: new Date() },
        });

        console.log(`✅ Watermark applied to rebuttal: ${rebuttalId}`);

        return NextResponse.json({ success: true, watermarkedUrl });
    } catch (error) {
        console.error("Watermarking error:", error);
        return NextResponse.json({ error: "Failed to apply watermark" }, { status: 500 });
    }
}

/**
 * GET /api/rebuttal/watermark?rebuttalId=xxx
 * ADMIN / MODERATOR only. Returns the watermarked and original URLs.
 *
 * Nobody else gets any document URL, for any status: public pages show
 * approved rebuttal TEXT only until a working redaction pipeline exists
 * (release decision 0c, docs/RELEASE_READINESS.md).
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const rebuttalId = searchParams.get("rebuttalId");

        if (!rebuttalId) {
            return NextResponse.json({ error: "rebuttalId is required" }, { status: 400 });
        }

        const rebuttal = await prisma.rebuttal.findFirst({
            where: { id: rebuttalId, deletedAt: null },
            select: {
                id: true,
                status: true,
                documentUrl: true,
                watermarkedUrl: true,
            },
        });

        if (!rebuttal) {
            return NextResponse.json({ error: "Rebuttal not found" }, { status: 404 });
        }

        // Check if requester is admin/moderator for original access
        let isPrivileged = false;
        try {
            const token = req.cookies.get("auth-token")?.value;
            if (token) {
                // An invalid or revoked token is treated as the public (no 401 here).
                const user = await getSessionUser(token);
                isPrivileged = !!user && hasPermission(user.role, "moderate_rebuttals");
            }
        } catch {
            // Not logged in — public access only
        }

        if (!isPrivileged) {
            return NextResponse.json({ error: "Not authorized" }, { status: 403 });
        }

        // App routes only, never the storage URL or the data URL (SOW 11.3).
        return NextResponse.json({
            watermarkedUrl: rebuttal.watermarkedUrl ? `/api/rebuttal/${rebuttal.id}/document?version=approved-copy` : null,
            originalUrl: rebuttal.documentUrl ? `/api/rebuttal/${rebuttal.id}/document` : null,
        });
    } catch (error) {
        console.error("Watermark fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 });
    }
}
