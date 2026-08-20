import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { applyWatermark, isPdfFile, isPdfTextSearchable } from "@/services/pdf-watermark.service";

/**
 * POST /api/rebuttal/watermark
 * Admin/Moderator triggers watermarking of an approved rebuttal's document.
 * Called automatically when a rebuttal is approved.
 */
export async function POST(req: NextRequest) {
    try {
        // ── 1. Auth ──────────────────────────────────────────────────────────
        const token = req.cookies.get("auth-token")?.value;
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await verifyToken(token);

        if (!hasPermission(user.role, "moderate_rebuttals")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // ── 2. Get rebuttal ──────────────────────────────────────────────────
        const { rebuttalId } = await req.json();

        if (!rebuttalId) {
            return NextResponse.json({ error: "rebuttalId is required" }, { status: 400 });
        }

        const rebuttal = await prisma.rebuttal.findUnique({
            where: { id: rebuttalId },
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
            data: { watermarkedUrl },
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
 * Returns the watermarked PDF URL — public access for approved rebuttals.
 * Returns the original URL only if requester is ADMIN or MODERATOR.
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const rebuttalId = searchParams.get("rebuttalId");

        if (!rebuttalId) {
            return NextResponse.json({ error: "rebuttalId is required" }, { status: 400 });
        }

        const rebuttal = await prisma.rebuttal.findUnique({
            where: { id: rebuttalId },
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
                const user = await verifyToken(token);
                isPrivileged = hasPermission(user.role, "moderate_rebuttals");
            }
        } catch {
            // Not logged in — public access only
        }

        // Public users only get watermarked version of APPROVED rebuttals
        if (rebuttal.status !== "APPROVED" && !isPrivileged) {
            return NextResponse.json({ error: "Not authorized" }, { status: 403 });
        }

        return NextResponse.json({
            watermarkedUrl: rebuttal.watermarkedUrl ?? null,
            originalUrl: isPrivileged ? rebuttal.documentUrl : null,
        });
    } catch (error) {
        console.error("Watermark fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 });
    }
}
