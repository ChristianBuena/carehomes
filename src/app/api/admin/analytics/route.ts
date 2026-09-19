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

  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const date = currentDate.toISOString().slice(0, 10);

    membershipGrowth[date] = {
      date,
    };

    currentDate.setDate(currentDate.getDate() + 1);
  }

  for (const membership of memberships) {
    const date = membership.createdAt.toISOString().slice(0, 10);

    if (!membershipGrowth[date]) continue;

    const currentCount = membershipGrowth[date][membership.plan];

    membershipGrowth[date][membership.plan] =
      typeof currentCount === "number" ? currentCount + 1 : 1;
  }

  // Churn
  const churnRecords = await prisma.membership.findMany({
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

  const churn: Record<
    string,
    {
      date: string;
      count: number;
    }
  > = {};

  const churnDate = new Date(startDate);

  while (churnDate <= endDate) {
    const date = churnDate.toISOString().slice(0, 10);

    churn[date] = {
      date,
      count: 0,
    };

    churnDate.setDate(churnDate.getDate() + 1);
  }

  for (const membership of churnRecords) {
    if (!membership.canceledAt) continue;

    const date = membership.canceledAt.toISOString().slice(0, 10);

    if (churn[date]) {
      churn[date].count++;
    }
  }

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
      rebuttalId: true,
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

  const firstDecisionByRebuttal = new Map<string, Date>();

  for (const log of moderationLogs) {
    if (!firstDecisionByRebuttal.has(log.rebuttalId)) {
      firstDecisionByRebuttal.set(log.rebuttalId, log.createdAt);
    }
  }

  const turnaroundTimes: number[] = [];

  for (const log of moderationLogs) {
    const firstDecisionAt = firstDecisionByRebuttal.get(log.rebuttalId);

    if (!firstDecisionAt) continue;

    if (log.createdAt.getTime() !== firstDecisionAt.getTime()) {
      continue;
    }

    const submittedAt = log.rebuttal.createdAt.getTime();
    const decidedAt = firstDecisionAt.getTime();

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
  const templates = await prisma.template.findMany({
    select: {
      id: true,
      title: true,
    },
    orderBy: {
      title: "asc",
    },
  });

  const templateDownloads = await prisma.templateDownload.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      templateId: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const downloadCounts: Record<string, number> = {};

  for (const download of templateDownloads) {
    downloadCounts[download.templateId] =
      (downloadCounts[download.templateId] || 0) + 1;
  }

  const templateDownloadMetrics = templates.map((template) => ({
    templateId: template.id,
    title: template.title,
    count: downloadCounts[template.id] || 0,
  }));

  return NextResponse.json({
    message: "Analytics API works",
    range,
    startDate,
    endDate,
    membershipGrowth: Object.values(membershipGrowth),
    churn: Object.values(churn),
    submissions,
    submissionSuccess,
    moderationLogs,
    moderationTurnaround,
    templateDownloads,
    templateDownloadMetrics,
  });
}