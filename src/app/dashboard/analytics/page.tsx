"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useEffect, useState } from "react";

type AnalyticsData = {
  membershipGrowth: Array<{
    date: string;
    [key: string]: string | number;
  }>;
  churn: Array<{
    date: string;
    count: number;
  }>;
  submissionSuccess: {
    approved: number;
    rejected: number;
    requestFix: number;
    pending: number;
    total: number;
    decided: number;
    approvalRate: number;
  };
  moderationTurnaround: {
    averageDays: number | null;
    decisions: number;
  };
  templateDownloadMetrics: Array<{
    templateId: string;
    title: string;
    count: number;
  }>;
};

const submissionColors = ["#16a34a", "#dc2626", "#f59e0b", "#6b7280"];

export default function AnalyticsPage() {
  const [range, setRange] = useState("30d");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/admin/analytics?range=${range}`
        );

        if (!response.ok) {
          throw new Error("Failed to load analytics");
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error(err);
        setError("Unable to load analytics data.");
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, [range]);

  const submissionData = data
    ? [
        {
          name: "Approved",
          value: data.submissionSuccess.approved,
        },
        {
          name: "Rejected",
          value: data.submissionSuccess.rejected,
        },
        {
          name: "Request Fix",
          value: data.submissionSuccess.requestFix,
        },
        {
          name: "Pending",
          value: data.submissionSuccess.pending,
        },
      ]
    : [];

  return (
    <main className="p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Platform-wide analytics and performance metrics.
          </p>
        </div>

        <select
          value={range}
          onChange={(event) => setRange(event.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm sm:w-auto"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      {loading && (
        <div className="rounded-lg border p-6 text-sm text-muted-foreground">
          Loading analytics...
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 p-6 text-sm text-red-500">
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <div className="space-y-6">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border bg-card p-5">
              <p className="text-sm text-muted-foreground">
                Total Submissions
              </p>
              <p className="mt-2 text-3xl font-bold">
                {data.submissionSuccess.total}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.submissionSuccess.decided} decided
              </p>
            </div>

            <div className="rounded-xl border bg-card p-5">
              <p className="text-sm text-muted-foreground">
                Approval Rate
              </p>
              <p className="mt-2 text-3xl font-bold">
                {data.submissionSuccess.approvalRate}%
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Approved / decided
              </p>
            </div>

            <div className="rounded-xl border bg-card p-5">
              <p className="text-sm text-muted-foreground">
                Cancellations
              </p>
              <p className="mt-2 text-3xl font-bold">
                {data.churn.reduce(
                  (sum, item) => sum + item.count,
                  0
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                During selected period
              </p>
            </div>

            <div className="rounded-xl border bg-card p-5">
              <p className="text-sm text-muted-foreground">
                Avg. Moderation Time
              </p>
              <p className="mt-2 text-3xl font-bold">
                {data.moderationTurnaround.averageDays !== null
                  ? `${data.moderationTurnaround.averageDays}d`
                  : "—"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.moderationTurnaround.decisions} decisions recorded
              </p>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="rounded-xl border bg-card p-5">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">
                  Membership Growth
                </h2>
                <p className="text-sm text-muted-foreground">
                  New memberships by tier
                </p>
              </div>

              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.membershipGrowth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      }
                    />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="TIER_A"
                      stackId="a"
                      name="Tier A"
                    />
                    <Bar
                      dataKey="TIER_B"
                      stackId="a"
                      name="Tier B"
                    />
                    <Bar
                      dataKey="TIER_C"
                      stackId="a"
                      name="Tier C"
                    />
                    <Bar
                      dataKey="NONE"
                      stackId="a"
                      name="No Tier"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-5">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">
                  Churn Tracking
                </h2>
                <p className="text-sm text-muted-foreground">
                  Canceled memberships over time
                </p>
              </div>

              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.churn}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      }
                    />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" name="Cancellations" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="rounded-xl border bg-card p-5">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">
                  Submission Results
                </h2>
                <p className="text-sm text-muted-foreground">
                  Status breakdown for submissions
                </p>
              </div>

              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={submissionData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={105}
                      label
                    >
                      {submissionData.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={submissionColors[index]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-5">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">
                  Moderation Turnaround
                </h2>
                <p className="text-sm text-muted-foreground">
                  Average time from submission to first decision
                </p>
              </div>

              <div className="flex h-[320px] flex-col items-center justify-center">
                <p className="text-5xl font-bold">
                  {data.moderationTurnaround.averageDays !== null
                    ? data.moderationTurnaround.averageDays
                    : "—"}
                </p>

                <p className="mt-2 text-sm text-muted-foreground">
                  {data.moderationTurnaround.averageDays !== null
                    ? "days average turnaround"
                    : "No moderation decisions recorded"}
                </p>

                <div className="mt-8 grid grid-cols-2 gap-8 text-center">
                  <div>
                    <p className="text-2xl font-semibold">
                      {data.moderationTurnaround.decisions}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Decisions
                    </p>
                  </div>

                  <div>
                    <p className="text-2xl font-semibold">
                      {data.submissionSuccess.decided}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Decided submissions
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">
                Template Downloads
              </h2>
              <p className="text-sm text-muted-foreground">
                Downloads per template during the selected period
              </p>
            </div>

            {data.templateDownloadMetrics.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No template downloads recorded during this period.
                </p>
              </div>
            ) : (
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.templateDownloadMetrics}
                    layout="vertical"
                    margin={{
                      left: 20,
                      right: 20,
                      top: 10,
                      bottom: 10,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="title"
                      width={140}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip />
                    <Bar dataKey="count" name="Downloads" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

