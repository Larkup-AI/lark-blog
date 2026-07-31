"use client";

import { useCallback, useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { BarChart3, RefreshCw, Users, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AnalyticsData = {
  days: number;
  updatedAt: string;
  summary: { views: number; visitors: number };
  series: { date: string; views: number; visitors: number }[];
  topPosts: { id: number; title: string; views: number; visitors: number }[];
  posts: { id: number; title: string }[];
};

const chartConfig = {
  visitors: { label: "Unique visitors", color: "var(--chart-1)" },
} satisfies ChartConfig;

function formatDay(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function AnalyticsDashboard() {
  const [range, setRange] = useState("7");
  const [postId, setPostId] = useState("all");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (showLoading = true) => {
      if (showLoading) setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ range });
        if (postId !== "all") params.set("postId", postId);
        const response = await fetch(`/api/analytics/views?${params}`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Couldn’t load analytics.");
        setData(await response.json());
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Couldn’t load analytics.",
        );
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [postId, range],
  );

  useEffect(() => {
    void load();
    const refresh = window.setInterval(() => void load(false), 60 * 60 * 1000);
    return () => window.clearInterval(refresh);
  }, [load]);

  const updatedLabel = data
    ? new Intl.DateTimeFormat("en", {
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(data.updatedAt))
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-sans text-3xl font-medium tracking-tight text-foreground">
            Analytics
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Anonymous visitor activity. Refreshes automatically every hour
            {updatedLabel ? ` · updated ${updatedLabel}` : ""}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={postId} onValueChange={setPostId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All posts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All posts</SelectItem>
              {(data?.posts ?? []).map((post) => (
                <SelectItem key={post.id} value={String(post.id)}>
                  {post.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            className="size-9"
            variant="outline"
            size="icon"
            onClick={() => void load()}
            disabled={loading}
            aria-label="Refresh analytics"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
          {error}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <MetricCard
              icon={<Users className="h-4 w-4" />}
              label="Unique visitors"
              value={data?.summary.visitors ?? 0}
              loading={loading}
            />
            <MetricCard
              icon={<Eye className="h-4 w-4" />}
              label="Page views"
              value={data?.summary.views ?? 0}
              loading={loading}
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Daily visitors</CardTitle>
              <CardDescription>
                Unique browsers per day, in UTC.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-72 w-full">
                <BarChart
                  accessibilityLayer
                  data={data?.series ?? []}
                  margin={{ left: -16, right: 12, top: 10 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tickFormatter={formatDay}
                    minTickGap={28}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    width={30}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        labelFormatter={(label) => formatDay(String(label))}
                      />
                    }
                  />
                  <Bar
                    dataKey="visitors"
                    fill="var(--color-visitors)"
                    radius={[5, 5, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Most visited posts</CardTitle>
              <CardDescription>
                Page views for the selected period.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data?.topPosts.length ? (
                <div className="divide-y divide-border">
                  {data.topPosts.map((post) => (
                    <div
                      key={post.id}
                      className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                    >
                      <p className="truncate text-sm font-medium">
                        {post.title}
                      </p>
                      <p className="shrink-0 text-sm text-muted-foreground">
                        {post.visitors} visitors · {post.views} views
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-10 text-center text-sm text-muted-foreground">
                  <BarChart3 className="mb-3 h-6 w-6" />
                  No visitor data in this period yet.
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <Card className="gap-3">
      <CardHeader className="px-5">
        <CardDescription className="flex items-center gap-2">
          {icon}
          {label}
        </CardDescription>
        <CardTitle className="text-3xl tabular-nums">
          {loading ? "—" : value.toLocaleString()}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
