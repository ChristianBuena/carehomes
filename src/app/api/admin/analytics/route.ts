import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roleGuard";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const result = await requireRole(["ADMIN"]);

  if (result.error) {
    return result.error;
  }

  const { searchParams } = new URL(req.url);

    const range = searchParams.get("range") || "30d";

  const allowedRanges = ["7d", "30d", "90d"];

  let endDate = new Date();
  let startDate = new Date(endDate);

  if (allowedRanges.includes(range)) {
    const days = Number(range.replace("d", ""));

    startDate.setDate(startDate.getDate() - (days - 1));
  } else if (range === "custom") {
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");

    if (!startParam || !endParam) {
      return NextResponse.json(
        {
          error: "Custom range requires start and end dates",
        },
        { status: 400 }
      );
    }

    startDate = new Date(`${startParam}T00:00:00`);
    endDate = new Date(`${endParam}T23:59:59.999`);

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime())
    ) {
      return NextResponse.json(
        {
          error: "Invalid custom date range",
        },
        { status: 400 }
      );
    }

    if (startDate > endDate) {
      return NextResponse.json(
        {
          error: "Start date must be before or equal to end date",
        },
        { status: 400 }
      );
    }
  } else {
    return NextResponse.json(
      { error: "Invalid date range" },
      { status: 400 }
    );
  }

  // Membership growth
  const memberships = await prisma.membership.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      createdAt: true,
      plan: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const membershipGrowth: Record<
    string,
    {
      date: string;
      [plan: string]: string | number;
    }
  > = {};

  for (const membership of memberships) {
    const date = membership.createdAt.toISOString().slice(0, 10);

    if (!membershipGrowth[date]) {
      membershipGrowth[date] = {
        date,
      };
    }

    const currentCount = membershipGrowth[date][membership.plan];

    membershipGrowth[date][membership.plan] =
      typeof currentCount === "number" ? currentCount + 1 : 1;
  }

  // Churn
  const churn = await prisma.membership.findMany({
    where: {
      canceledAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      canceledAt: true,
    },
    orderBy: {
      canceledAt: "asc",
    },
  });

  // Submission success rate
  const submissions = await prisma.rebuttal.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      status: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  let approved = 0;
  let rejected = 0;
  let requestFix = 0;
  let pending = 0;

  for (const submission of submissions) {
    switch (submission.status) {
      case "APPROVED":
        approved++;
        break;
      case "REJECTED":
        rejected++;
        break;
      case "REQUEST_FIX":
        requestFix++;
        break;
      case "PENDING":
        pending++;
        break;
    }
  }

  const total = submissions.length;
  const decided = approved + rejected + requestFix;

  const approvalRate =
    decided > 0 ? Number(((approved / decided) * 100).toFixed(2)) : 0;

  const submissionSuccess = {
    approved,
    rejected,
    requestFix,
    pending,
    total,
    decided,
    approvalRate,
  };

  // Moderation turnaround
  const moderationLogs = await prisma.moderationLog.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      toStatus: {
        in: ["APPROVED", "REJECTED", "REQUEST_FIX"],
      },
    },
    select: {
      createdAt: true,
      toStatus: true,
      rebuttal: {
        select: {
          createdAt: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const turnaroundTimes: number[] = [];

  for (const log of moderationLogs) {
    const submittedAt = log.rebuttal.createdAt.getTime();
    const decidedAt = log.createdAt.getTime();

    const differenceInDays =
      (decidedAt - submittedAt) / (1000 * 60 * 60 * 24);

    if (differenceInDays >= 0) {
      turnaroundTimes.push(differenceInDays);
    }
  }

  const averageDays =
    turnaroundTimes.length > 0
      ? Number(
          (
            turnaroundTimes.reduce((sum, days) => sum + days, 0) /
            turnaroundTimes.length
          ).toFixed(2)
        )
      : null;

  const moderationTurnaround = {
    averageDays,
    decisions: turnaroundTimes.length,
  };

  // Template downloads
    const templateDownloads = await prisma.templateDownload.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      templateId: true,
      template: {
        select: {
          title: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const templateDownloadMetrics: Record<
    string,
    {
      templateId: string;
      title: string;
      count: number;
    }
  > = {};

  for (const download of templateDownloads) {
    if (!templateDownloadMetrics[download.templateId]) {
      templateDownloadMetrics[download.templateId] = {
        templateId: download.templateId,
        title: download.template.title,
        count: 0,
      };
    }

    templateDownloadMetrics[download.templateId].count++;
  }

  return NextResponse.json({
    message: "Analytics API works",
    range,
    startDate,
    endDate,
    membershipGrowth: Object.values(membershipGrowth),
    churn,
    submissions,
    submissionSuccess,
    moderationLogs,
    moderationTurnaround,
    templateDownloads,
    templateDownloadMetrics: Object.values(templateDownloadMetrics),
  });
}

