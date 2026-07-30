import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";

// ── GET — fetch all deadlines for the logged-in member ────────────────────
export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get("auth-token")?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = await verifyToken(token);

        // MEMBER only
        if (user.role !== "MEMBER") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const deadlines = await prisma.citationDeadline.findMany({
            where: { userId: user.userId },
            orderBy: { dueDate: "asc" },
        });

        return NextResponse.json(deadlines);
    } catch {
        return NextResponse.json({ error: "Failed to fetch deadlines" }, { status: 500 });
    }
}

// ── POST — create a new deadline ──────────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        const token = req.cookies.get("auth-token")?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = await verifyToken(token);

        // MEMBER only
        if (user.role !== "MEMBER") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { citationId, dueDate, notes } = body as {
            citationId?: string;
            dueDate?: string;
            notes?: string;
        };

        if (!citationId || !dueDate) {
            return NextResponse.json(
                { error: "citationId and dueDate are required" },
                { status: 400 }
            );
        }

        const deadline = await prisma.citationDeadline.create({
            data: {
                citationId,
                dueDate: new Date(dueDate),
                notes,
                userId: user.userId,
            },
        });

        return NextResponse.json(deadline, { status: 201 });
    } catch {
        return NextResponse.json({ error: "Failed to create deadline" }, { status: 500 });
    }
}

// ── PUT — update an existing deadline ─────────────────────────────────────
export async function PUT(req: NextRequest) {
    try {
        const token = req.cookies.get("auth-token")?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = await verifyToken(token);

        if (user.role !== "MEMBER") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { id, citationId, dueDate, notes } = body as {
            id?: string;
            citationId?: string;
            dueDate?: string;
            notes?: string;
        };

        if (!id || !citationId || !dueDate) {
            return NextResponse.json(
                { error: "id, citationId, and dueDate are required" },
                { status: 400 }
            );
        }

        // Make sure the deadline belongs to this user
        const existing = await prisma.citationDeadline.findUnique({ where: { id } });

        if (!existing || existing.userId !== user.userId) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const updated = await prisma.citationDeadline.update({
            where: { id },
            data: {
                citationId,
                dueDate: new Date(dueDate),
                notes,
            },
        });

        return NextResponse.json(updated);
    } catch {
        return NextResponse.json({ error: "Failed to update deadline" }, { status: 500 });
    }
}

// ── DELETE — remove a deadline ─────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
    try {
        const token = req.cookies.get("auth-token")?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = await verifyToken(token);

        if (user.role !== "MEMBER") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "id is required" }, { status: 400 });
        }

        // Make sure the deadline belongs to this user
        const existing = await prisma.citationDeadline.findUnique({ where: { id } });

        if (!existing || existing.userId !== user.userId) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        await prisma.citationDeadline.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "Failed to delete deadline" }, { status: 500 });
    }
}
