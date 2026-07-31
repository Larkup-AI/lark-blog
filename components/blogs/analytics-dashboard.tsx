"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { BarChart3, Check, ChevronsUpDown, Eye, RefreshCw, Users } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

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
  const [articlePickerOpen, setArticlePickerOpen] = useState(false);
  const [articleQuery, setArticleQuery] = useState("");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const articleParam = searchParams.get("article");
  const postId = articleParam && /^\d+$/.test(articleParam) ? articleParam : "all";

  const selectedPost = data?.posts.find((post) => String(post.id) === postId);
  const matchingPosts = useMemo(() => {
    const query = articleQuery.trim().toLocaleLowerCase();
    if (!query) return [];
    return (data?.posts ?? [])
      .filter((post) => post.title.toLocaleLowerCase().includes(query))
      .slice(0, 50);
  }, [articleQuery, data?.posts]);

  const selectPost = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id === "all") params.delete("article");
      else params.set("article", id);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      setArticlePickerOpen(false);
      setArticleQuery("");
    },
    [pathname, router, searchParams],
  );

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
          <Popover
            open={articlePickerOpen}
            onOpenChange={(open) => {
              setArticlePickerOpen(open);
              if (!open) setArticleQuery("");
            }}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={articlePickerOpen}
                className="w-64 justify-between font-normal"
              >
                <span className="truncate">
                  {selectedPost?.title ?? (postId === "all" ? "All articles" : "Loading article…")}
                </span>
                <ChevronsUpDown className="ml-2 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Search articles…"
                  value={articleQuery}
                  onValueChange={setArticleQuery}
                />
                <CommandList>
                  {!articleQuery ? (
                    <CommandGroup heading="Filter analytics">
                      <CommandItem value="all" onSelect={() => selectPost("all")}>
                        <Check className={cn("mr-2", postId === "all" ? "opacity-100" : "opacity-0")} />
                        All articles
                      </CommandItem>
                      {selectedPost && (
                        <CommandItem value={String(selectedPost.id)} onSelect={() => selectPost(String(selectedPost.id))}>
                          <Check className="mr-2 opacity-100" />
                          <span className="truncate">{selectedPost.title}</span>
                        </CommandItem>
                      )}
                    </CommandGroup>
                  ) : (
                    <CommandGroup heading="Matching articles">
                      {matchingPosts.map((post) => (
                        <CommandItem key={post.id} value={post.title} onSelect={() => selectPost(String(post.id))}>
                          <Check className={cn("mr-2", postId === String(post.id) ? "opacity-100" : "opacity-0")} />
                          <span className="truncate">{post.title}</span>
                        </CommandItem>
                      ))}
                      {!matchingPosts.length && <CommandEmpty>No matching articles.</CommandEmpty>}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
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
