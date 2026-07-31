"use client";

import { useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import {
  BarChart3,
  Pencil,
  Trash2,
  Check,
  X,
  Table2,
  Code2,
  ImageIcon,
} from "lucide-react";
import {
  ChartRenderer,
  decodeChartConfig,
  encodeChartConfig,
  parseTableToConfig,
  PALETTE,
  type ChartType,
  type ChartMode,
  type ChartConfig,
} from "@/components/blog/chart-renderer";
import { cn } from "@/lib/utils";

const SAMPLE = `Model\tAccuracy\tLatency
GPT-4\t88\t42
Claude\t86\t38
Llama\t81\t30`;

const SAMPLE_CODE = `// "data" is the JSON below. Return any Recharts JSX.
return (
  <BarChart data={data}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="name" />
    <YAxis />
    <Tooltip />
    <Bar dataKey="value" fill="#6366f1" radius={[3,3,0,0]} />
  </BarChart>
)`;

const SAMPLE_DATA = `[
  { "name": "A", "value": 40 },
  { "name": "B", "value": 72 },
  { "name": "C", "value": 55 }
]`;

const COLOR_SWATCHES = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
  "#8b5cf6",
  "#64748b",
];

function configToTable(cfg: ChartConfig | null): string {
  if (!cfg || !cfg.series?.length) return SAMPLE;
  const headers = [cfg.xKey, ...cfg.series.map((s) => s.key)];
  const lines = [headers.join("\t")];
  for (const row of cfg.data) {
    lines.push(headers.map((h) => String(row[h] ?? "")).join("\t"));
  }
  return lines.join("\n");
}

export function ChartView({
  node,
  updateAttributes,
  deleteNode,
  selected,
}: NodeViewProps) {
  const config = decodeChartConfig(node.attrs.config as string);
  const [editing, setEditing] = useState(!config);
  const [mode, setMode] = useState<ChartMode>(config?.mode ?? "builder");

  // shared
  const [title, setTitle] = useState(config?.title ?? "");
  const [caption, setCaption] = useState(config?.caption ?? "");
  const [height, setHeight] = useState(config?.height ?? 320);

  // builder
  const [type, setType] = useState<ChartType>(config?.type ?? "bar");
  const [table, setTable] = useState(configToTable(config));
  const [stacked, setStacked] = useState(config?.stacked ?? false);
  const [showLegend, setShowLegend] = useState(config?.showLegend ?? true);
  const [showGrid, setShowGrid] = useState(config?.showGrid ?? true);
  const [xLabel, setXLabel] = useState(config?.xLabel ?? "");
  const [yLabel, setYLabel] = useState(config?.yLabel ?? "");
  const [colors, setColors] = useState<string[]>(
    config?.series?.map(
      (s, i) => s.color || COLOR_SWATCHES[i % COLOR_SWATCHES.length],
    ) ?? COLOR_SWATCHES,
  );

  // code
  const [code, setCode] = useState(config?.code ?? SAMPLE_CODE);
  const [codeData, setCodeData] = useState(
    config?.mode === "code" && config.data
      ? JSON.stringify(config.data, null, 2)
      : SAMPLE_DATA,
  );
  const [codeError, setCodeError] = useState<string | null>(null);

  // image
  const [src, setSrc] = useState(config?.src ?? "");
  const [svg, setSvg] = useState(config?.svg ?? "");
  const [alt, setAlt] = useState(config?.alt ?? "");

  const apply = () => {
    let next: ChartConfig | null = null;

    if (mode === "builder") {
      const parsed = parseTableToConfig(table, type, {
        title: title || undefined,
        caption: caption || undefined,
        height,
        stacked,
        showLegend,
        showGrid,
        xLabel: xLabel || undefined,
        yLabel: yLabel || undefined,
      });
      if (!parsed) return;
      parsed.series = parsed.series.map((s, i) => ({ ...s, color: colors[i] }));
      next = parsed;
    } else if (mode === "code") {
      let data: ChartConfig["data"] = [];
      try {
        data = codeData.trim() ? JSON.parse(codeData) : [];
        setCodeError(null);
      } catch {
        setCodeError("Data is not valid JSON");
        return;
      }
      next = {
        mode: "code",
        type,
        xKey: "x",
        series: [],
        data,
        code,
        title: title || undefined,
        caption: caption || undefined,
        height,
      };
    } else {
      next = {
        mode: "image",
        type,
        xKey: "x",
        series: [],
        data: [],
        src: src || undefined,
        svg: svg.trim() || undefined,
        alt: alt || undefined,
        title: title || undefined,
        caption: caption || undefined,
      };
    }

    if (next) {
      updateAttributes({ config: encodeChartConfig(next) });
      setEditing(false);
    }
  };

  const seriesCount = Math.max(
    0,
    table.trim().split(/\r?\n/)[0]?.split(/\t|,/).length - 1 || 0,
  );

  const tabBtn = (m: ChartMode, label: string, Icon: typeof Table2) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
        mode === m
          ? "bg-secondary text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );

  const field =
    "h-9 rounded-md border border-border bg-background px-2 text-sm";

  return (
    <NodeViewWrapper>
      <div
        className={cn(
          "relative my-6 rounded-xl border border-border",
          selected && " outline-2 outline-offset-2 outline-accent",
        )}
      >
        {!editing && (
          <div className="absolute right-2 top-2 z-10 flex items-center gap-0.5 rounded-lg border border-border bg-popover p-1 ">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-foreground/70 hover:bg-secondary hover:text-foreground"
              aria-label="Edit chart"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => deleteNode()}
              className="flex h-7 w-7 items-center justify-center rounded-md text-foreground/70 hover:bg-secondary hover:text-destructive"
              aria-label="Delete chart"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}

        {editing ? (
          <div className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-foreground">Chart</span>
            </div>

            {/* Mode tabs */}
            <div className="mb-4 inline-flex items-center gap-1 rounded-lg border border-border bg-background p-1">
              {tabBtn("builder", "Builder", Table2)}
              {tabBtn("code", "Recharts code", Code2)}
              {tabBtn("image", "Image / SVG", ImageIcon)}
            </div>

            {/* Shared title + caption */}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">
                  Title (optional)
                </span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Benchmark results"
                  className={field}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">
                  Caption (optional)
                </span>
                <input
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Shown under the chart"
                  className={field}
                />
              </label>
            </div>

            {mode === "builder" && (
              <>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs text-muted-foreground">Type</span>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as ChartType)}
                      className={field}
                    >
                      <option value="bar">Bar</option>
                      <option value="line">Line</option>
                      <option value="area">Area</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs text-muted-foreground">
                      Height: {height}px
                    </span>
                    <input
                      type="range"
                      min={200}
                      max={640}
                      step={20}
                      value={height}
                      onChange={(e) => setHeight(Number(e.target.value))}
                      className="h-9"
                    />
                  </label>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs text-muted-foreground">
                      Options
                    </span>
                    <div className="flex h-9 items-center gap-3 text-xs">
                      <label className="inline-flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={showGrid}
                          onChange={(e) => setShowGrid(e.target.checked)}
                        />{" "}
                        Grid
                      </label>
                      <label className="inline-flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={showLegend}
                          onChange={(e) => setShowLegend(e.target.checked)}
                        />{" "}
                        Legend
                      </label>
                      {type !== "line" && (
                        <label className="inline-flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={stacked}
                            onChange={(e) => setStacked(e.target.checked)}
                          />{" "}
                          Stacked
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs text-muted-foreground">
                      X-axis label
                    </span>
                    <input
                      value={xLabel}
                      onChange={(e) => setXLabel(e.target.value)}
                      className={field}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs text-muted-foreground">
                      Y-axis label
                    </span>
                    <input
                      value={yLabel}
                      onChange={(e) => setYLabel(e.target.value)}
                      className={field}
                    />
                  </label>
                </div>

                {/* Per-series colors */}
                {seriesCount > 0 && (
                  <div className="mt-3 flex flex-col gap-1.5">
                    <span className="text-xs text-muted-foreground">
                      Series colors
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {Array.from({ length: seriesCount }).map((_, i) => (
                        <input
                          key={i}
                          type="color"
                          value={colors[i] || PALETTE[i] || "#6366f1"}
                          onChange={(e) => {
                            const next = [...colors];
                            next[i] = e.target.value;
                            setColors(next);
                          }}
                          className="h-7 w-9 cursor-pointer rounded border border-border bg-background"
                          aria-label={`Series ${i + 1} color`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <label className="mt-3 flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">
                    Data — paste from a spreadsheet (tab or comma separated).
                    First row = headers, first column = x-axis, other columns =
                    series.
                  </span>
                  <textarea
                    value={table}
                    onChange={(e) => setTable(e.target.value)}
                    rows={6}
                    className="rounded-md border border-border bg-background p-2 font-mono text-xs leading-relaxed"
                  />
                </label>
              </>
            )}

            {mode === "code" && (
              <div className="mt-3 grid gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">
                    Recharts JSX — return any chart. Recharts components are in
                    scope; `data` is the JSON below.
                  </span>
                  <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    rows={9}
                    className="rounded-md border border-border bg-background p-2 font-mono text-xs leading-relaxed"
                    spellCheck={false}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">
                    Data (JSON)
                  </span>
                  <textarea
                    value={codeData}
                    onChange={(e) => setCodeData(e.target.value)}
                    rows={5}
                    className="rounded-md border border-border bg-background p-2 font-mono text-xs leading-relaxed"
                    spellCheck={false}
                  />
                </label>
                <label className="flex max-w-45 flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">
                    Height: {height}px
                  </span>
                  <input
                    type="range"
                    min={200}
                    max={640}
                    step={20}
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                  />
                </label>
                {codeError && (
                  <p className="text-xs text-destructive">{codeError}</p>
                )}
              </div>
            )}

            {mode === "image" && (
              <div className="mt-3 grid gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">
                    Image URL (matplotlib export, screenshot, etc.)
                  </span>
                  <input
                    value={src}
                    onChange={(e) => setSrc(e.target.value)}
                    placeholder="https://… or /uploads/chart.png"
                    className={field}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">
                    …or paste raw SVG markup (takes priority over URL)
                  </span>
                  <textarea
                    value={svg}
                    onChange={(e) => setSvg(e.target.value)}
                    rows={5}
                    placeholder="<svg …>…</svg>"
                    className="rounded-md border border-border bg-background p-2 font-mono text-xs leading-relaxed"
                    spellCheck={false}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">
                    Alt text
                  </span>
                  <input
                    value={alt}
                    onChange={(e) => setAlt(e.target.value)}
                    className={field}
                  />
                </label>
              </div>
            )}

            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={apply}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
              >
                <Check className="h-4 w-4" /> Apply
              </button>
              {config && (
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" /> Cancel
                </button>
              )}
            </div>
          </div>
        ) : config ? (
          <ChartRenderer config={config} />
        ) : null}
      </div>
    </NodeViewWrapper>
  );
}
