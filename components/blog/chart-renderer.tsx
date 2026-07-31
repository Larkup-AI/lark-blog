"use client";

import { useEffect, useRef, useState } from "react";
import * as Recharts from "recharts";
import * as React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export type ChartType = "bar" | "line" | "area";
export type ChartMode = "builder" | "code" | "image";

export type ChartConfig = {
  /** How this chart is produced. Defaults to 'builder' for backward compat. */
  mode?: ChartMode;
  type: ChartType;
  title?: string;
  caption?: string;
  xKey: string;
  series: { key: string; color?: string }[];
  data: Record<string, string | number>[];
  /* ---- builder customization ---- */
  height?: number;
  stacked?: boolean;
  showLegend?: boolean;
  showGrid?: boolean;
  xLabel?: string;
  yLabel?: string;
  /* ---- code mode ---- */
  code?: string;
  /* ---- image / svg mode ---- */
  src?: string;
  svg?: string;
  alt?: string;
};

export const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

/** Encode a config for storage inside a data attribute (HTML round-trip safe). */
export function encodeChartConfig(config: ChartConfig): string {
  return encodeURIComponent(JSON.stringify(config));
}

export function decodeChartConfig(raw: string): ChartConfig | null {
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (!parsed) return null;
    const mode: ChartMode = parsed.mode ?? "builder";
    if (
      mode === "builder" &&
      (!Array.isArray(parsed.data) || !Array.isArray(parsed.series))
    )
      return null;
    return parsed as ChartConfig;
  } catch {
    return null;
  }
}

/**
 * Parse a CSV/TSV table into a chart config. First row = headers, first column
 * = x-axis category, remaining columns = numeric series. Great for benchmarks.
 */
export function parseTableToConfig(
  text: string,
  type: ChartType,
  base?: Partial<ChartConfig>,
): ChartConfig | null {
  const rows = text
    .trim()
    .split(/\r?\n/)
    .map((r) => r.split(/\t|,/).map((c) => c.trim()))
    .filter((r) => r.some((c) => c.length));
  if (rows.length < 2) return null;

  const headers = rows[0];
  const xKey = headers[0] || "x";
  const seriesKeys = headers.slice(1);

  const data = rows.slice(1).map((r) => {
    const row: Record<string, string | number> = { [xKey]: r[0] };
    seriesKeys.forEach((key, i) => {
      const n = Number(r[i + 1]);
      row[key] = Number.isFinite(n) ? n : 0;
    });
    return row;
  });

  // Preserve any existing per-series colors by key.
  const prevColors = new Map((base?.series ?? []).map((s) => [s.key, s.color]));

  return {
    mode: "builder",
    type,
    xKey,
    series: seriesKeys.map((key) => ({ key, color: prevColors.get(key) })),
    data,
    title: base?.title,
    caption: base?.caption,
    height: base?.height,
    stacked: base?.stacked,
    showLegend: base?.showLegend,
    showGrid: base?.showGrid ?? true,
    xLabel: base?.xLabel,
    yLabel: base?.yLabel,
  };
}

const axisBase = {
  stroke: "var(--muted-foreground)",
  fontSize: 12,
  tickLine: false,
  axisLine: { stroke: "var(--border)" },
};

function Figure({
  title,
  caption,
  children,
}: {
  title?: string;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="my-8 rounded-xl border border-border bg-background p-4 md:p-6">
      {title && (
        <figcaption className="mb-4 text-center font-sans text-sm font-medium tracking-tight text-foreground">
          {title}
        </figcaption>
      )}
      {children}
      {caption && (
        <figcaption className="mt-4 text-center text-sm text-muted-foreground">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

/* ------------------------------- Builder chart ------------------------------- */

function BuilderChart({ config }: { config: ChartConfig }) {
  const {
    type,
    xKey,
    series,
    data,
    height = 320,
    stacked = false,
    showLegend,
    showGrid = true,
    xLabel,
    yLabel,
  } = config;

  const colorAt = (i: number) =>
    series[i]?.color || PALETTE[i % PALETTE.length];
  const legend = showLegend ?? series.length > 1;

  const tooltipStyle = {
    backgroundColor: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: "0.5rem",
    fontSize: "0.8rem",
    color: "var(--popover-foreground)",
  };

  const grid = showGrid ? (
    <CartesianGrid
      strokeDasharray="3 3"
      stroke="var(--border)"
      vertical={false}
    />
  ) : null;

  const xAxis = (
    <XAxis
      dataKey={xKey}
      {...axisBase}
      label={
        xLabel
          ? {
              value: xLabel,
              position: "insideBottom",
              offset: -4,
              fontSize: 12,
              fill: "var(--muted-foreground)",
            }
          : undefined
      }
    />
  );
  const yAxis = (
    <YAxis
      {...axisBase}
      width={yLabel ? 56 : 40}
      label={
        yLabel
          ? {
              value: yLabel,
              angle: -90,
              position: "insideLeft",
              fontSize: 12,
              fill: "var(--muted-foreground)",
            }
          : undefined
      }
    />
  );

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {type === "bar" ? (
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: xLabel ? 16 : 0 }}
          >
            {grid}
            {xAxis}
            {yAxis}
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: "var(--secondary)", opacity: 0.4 }}
            />
            {legend && <Legend wrapperStyle={{ fontSize: "0.8rem" }} />}
            {series.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                stackId={stacked ? "stack" : undefined}
                fill={colorAt(i)}
                radius={stacked ? 0 : [3, 3, 0, 0]}
              />
            ))}
          </BarChart>
        ) : type === "line" ? (
          <LineChart
            data={data}
            margin={{ top: 8, right: 12, left: 0, bottom: xLabel ? 16 : 0 }}
          >
            {grid}
            {xAxis}
            {yAxis}
            <Tooltip contentStyle={tooltipStyle} />
            {legend && <Legend wrapperStyle={{ fontSize: "0.8rem" }} />}
            {series.map((s, i) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={colorAt(i)}
                strokeWidth={2}
                dot={{ r: 2.5 }}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        ) : (
          <AreaChart
            data={data}
            margin={{ top: 8, right: 12, left: 0, bottom: xLabel ? 16 : 0 }}
          >
            <defs>
              {series.map((s, i) => (
                <linearGradient
                  key={s.key}
                  id={`grad-${s.key}-${i}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={colorAt(i)} stopOpacity={0.35} />
                  <stop
                    offset="95%"
                    stopColor={colorAt(i)}
                    stopOpacity={0.02}
                  />
                </linearGradient>
              ))}
            </defs>
            {grid}
            {xAxis}
            {yAxis}
            <Tooltip contentStyle={tooltipStyle} />
            {legend && <Legend wrapperStyle={{ fontSize: "0.8rem" }} />}
            {series.map((s, i) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stackId={stacked ? "stack" : undefined}
                stroke={colorAt(i)}
                strokeWidth={2}
                fill={`url(#grad-${s.key}-${i})`}
              />
            ))}
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

/* --------------------------------- Code chart -------------------------------- */
/**
 * Renders admin-authored Recharts JSX. Content is trusted (single admin), so we
 * transpile the JSX with Babel (loaded on demand to keep it out of the main
 * bundle) and evaluate it with the Recharts + React scope injected. The author
 * writes the body of a function that returns JSX, e.g.:
 *   `return <BarChart width={500} height={300} data={data}>...</BarChart>`
 * `data` is whatever JSON they provide in the builder data field.
 */
function CodeChart({ config }: { config: ChartConfig }) {
  const [el, setEl] = useState<React.ReactNode>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setEl(null);
    const code = config.code?.trim();
    if (!code) return;
    (async () => {
      try {
        const Babel = await import("@babel/standalone");
        const transformed = Babel.transform(`(function(){${code}\n})`, {
          presets: ["react"],
        }).code as string;
        // eslint-disable-next-line no-new-func
        const factory = new Function(
          "React",
          "Recharts",
          "data",
          `with (Recharts) { return (${transformed})(); }`,
        );
        const node = factory(React, Recharts, config.data ?? []);
        if (!cancelled) setEl(node as React.ReactNode);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to render chart");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [config.code, config.data]);

  if (error) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 font-mono text-xs text-destructive">
        Chart error: {error}
      </div>
    );
  }
  if (!el) {
    return (
      <div className="h-80 w-full animate-pulse rounded-md bg-secondary/40" />
    );
  }
  return (
    <div className="w-full" style={{ height: config.height ?? 360 }}>
      <ResponsiveContainer width="100%" height="100%">
        {el as React.ReactElement}
      </ResponsiveContainer>
    </div>
  );
}

/* -------------------------------- Image chart -------------------------------- */

function ImageChart({ config }: { config: ChartConfig }) {
  const svgRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (svgRef.current && config.svg) svgRef.current.innerHTML = config.svg;
  }, [config.svg]);

  if (config.svg) {
    return (
      <div
        ref={svgRef}
        className="flex w-full justify-center [&_svg]:h-auto [&_svg]:max-w-full"
      />
    );
  }
  if (config.src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={config.src || "/placeholder.svg"}
        alt={config.alt || config.title || "Chart"}
        className="mx-auto h-auto max-w-full rounded-md"
      />
    );
  }
  return null;
}

/* --------------------------------- Renderer ---------------------------------- */

export function ChartRenderer({ config }: { config: ChartConfig }) {
  const mode = config.mode ?? "builder";
  return (
    <Figure title={config.title} caption={config.caption}>
      {mode === "code" ? (
        <CodeChart config={config} />
      ) : mode === "image" ? (
        <ImageChart config={config} />
      ) : (
        <BuilderChart config={config} />
      )}
    </Figure>
  );
}
