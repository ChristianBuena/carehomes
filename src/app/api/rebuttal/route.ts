import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { createRebuttal } from "@/services/rebuttal.service";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);

    // ROLE CHECK (IMPORTANT FIX)
    if (!["MEMBER", "MODERATOR", "ADMIN"].includes(user.role)) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await req.json();

    // BASIC VALIDATION
    if (!body.title || !body.content) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    const rebuttal = await createRebuttal({
      title: body.title,
      content: body.content,
      userId: user.userId,
    });

    return NextResponse.json(rebuttal);

  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create rebuttal" },
      { status: 500 }
    );
  }
}