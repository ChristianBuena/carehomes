import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    // 🔐 READ FROM COOKIE (NOT HEADER)
    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // 🔐 VERIFY SESSION (signature, expiry, revocation)
    const decoded = await getSessionUser(token);
    if (!decoded) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    // 👤 FETCH USER
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        organization: {
          include: { membership: true }
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(user, { status: 200 });

  } catch (error) {
    console.error("Auth check error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}