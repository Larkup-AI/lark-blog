/**
 * Dependency-free cron support for the scheduler.
 *
 * Supports standard 5-field cron (`minute hour day-of-month month day-of-week`)
 * with `*`, lists (`a,b`), ranges (`a-b`), and steps (`*​/n`, `a-b/n`), plus the
 * common `@hourly`/`@daily`/`@weekly`/`@monthly` macros. Expressions are
 * evaluated against the schedule's IANA timezone using `Intl` (no deps), so a
 * "09:00 Europe/Berlin" schedule fires at Berlin wall-clock time, DST included.
 */

const MACROS: Record<string, string> = {
  "@hourly": "0 * * * *",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@weekly": "0 0 * * 0",
  "@monthly": "0 0 1 * *",
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
};

type Field = { min: number; max: number };
const FIELDS: Field[] = [
  { min: 0, max: 59 }, // minute
  { min: 0, max: 23 }, // hour
  { min: 1, max: 31 }, // day of month
  { min: 1, max: 12 }, // month
  { min: 0, max: 6 }, // day of week (0 = Sunday)
];

export type ParsedCron = Set<number>[];

/** Parse a cron expression into per-field allowed-value sets. Throws on error. */
export function parseCron(expr: string): ParsedCron {
  const normalized = MACROS[expr.trim()] ?? expr.trim();
  const parts = normalized.split(/\s+/);
  if (parts.length !== 5) {
    throw new Error(
      `Invalid cron "${expr}": expected 5 fields (got ${parts.length}).`,
    );
  }
  return parts.map((part, idx) => parseField(part, FIELDS[idx]));
}

function parseField(part: string, field: Field): Set<number> {
  const out = new Set<number>();
  for (const chunk of part.split(",")) {
    const [rangePart, stepPart] = chunk.split("/");
    const step = stepPart ? parseInt(stepPart, 10) : 1;
    if (!Number.isFinite(step) || step < 1)
      throw new Error(`Invalid step "${stepPart}".`);

    let lo = field.min;
    let hi = field.max;
    if (rangePart !== "*") {
      const [a, b] = rangePart.split("-");
      lo = parseInt(a, 10);
      hi = b !== undefined ? parseInt(b, 10) : lo;
      if (!Number.isFinite(lo) || !Number.isFinite(hi))
        throw new Error(`Invalid range "${rangePart}".`);
      if (lo < field.min || hi > field.max || lo > hi)
        throw new Error(`Range "${rangePart}" out of bounds.`);
    }
    for (let v = lo; v <= hi; v += step) out.add(v);
  }
  return out;
}

/** True when `expr` is a valid cron expression. */
export function isValidCron(expr: string): boolean {
  try {
    parseCron(expr);
    return true;
  } catch {
    return false;
  }
}

/** The wall-clock fields of `date` in `timezone`. */
function partsInZone(date: Date, timezone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour12: false,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    weekday: "short",
  });
  const map: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) map[p.type] = p.value;
  const weekdays: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  let hour = parseInt(map.hour, 10);
  if (hour === 24) hour = 0; // some runtimes emit 24 for midnight
  return {
    minute: parseInt(map.minute, 10),
    hour,
    day: parseInt(map.day, 10),
    month: parseInt(map.month, 10),
    weekday: weekdays[map.weekday] ?? 0,
  };
}

function matches(parsed: ParsedCron, p: ReturnType<typeof partsInZone>): boolean {
  return (
    parsed[0].has(p.minute) &&
    parsed[1].has(p.hour) &&
    parsed[2].has(p.day) &&
    parsed[3].has(p.month) &&
    parsed[4].has(p.weekday)
  );
}

/**
 * The next time (UTC Date) at or after `from` that `expr` fires in `timezone`.
 * Returns null if nothing matches within ~2 years (misconfigured expression).
 */
export function nextRun(
  expr: string,
  timezone = "UTC",
  from: Date = new Date(),
): Date | null {
  let parsed: ParsedCron;
  try {
    parsed = parseCron(expr);
  } catch {
    return null;
  }
  const tz = isValidTimezone(timezone) ? timezone : "UTC";

  // Start at the next whole minute strictly after `from`.
  const cursor = new Date(from.getTime());
  cursor.setUTCSeconds(0, 0);
  cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);

  const maxMinutes = 366 * 2 * 24 * 60;
  for (let n = 0; n < maxMinutes; n++) {
    if (matches(parsed, partsInZone(cursor, tz))) return new Date(cursor.getTime());
    cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);
  }
  return null;
}

function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** A short human description of a cron expression (best-effort). */
export function describeCron(expr: string, timezone = "UTC"): string {
  const normalized = MACROS[expr.trim()] ?? expr.trim();
  const parts = normalized.split(/\s+/);
  if (parts.length !== 5) return expr;
  const [min, hour, dom, mon, dow] = parts;
  const tzSuffix = timezone && timezone !== "UTC" ? ` ${timezone}` : " UTC";

  const time = (h: string, m: string) => {
    if (h === "*" ) return null;
    const hh = String(parseInt(h, 10)).padStart(2, "0");
    const mm = String(parseInt(m, 10) || 0).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  // Every weekday at HH:MM
  if (dom === "*" && mon === "*" && dow !== "*" && !dow.includes("*")) {
    const t = time(hour, min);
    const dayNames = dow
      .split(",")
      .map((d) => days[parseInt(d, 10)] ?? d)
      .join(", ");
    return `Every ${dayNames}${t ? ` at ${t}` : ""}${tzSuffix}`;
  }
  // Daily at HH:MM
  if (dom === "*" && mon === "*" && dow === "*") {
    const t = time(hour, min);
    if (t) return `Every day at ${t}${tzSuffix}`;
    if (hour === "*" && min === "0") return "Every hour";
    if (hour === "*" && min.startsWith("*/")) return `Every ${min.slice(2)} minutes`;
  }
  // Monthly on day N
  if (dom !== "*" && mon === "*" && dow === "*") {
    const t = time(hour, min);
    return `Monthly on day ${dom}${t ? ` at ${t}` : ""}${tzSuffix}`;
  }
  return `cron(${normalized})${tzSuffix}`;
}

/** Common presets offered in the Schedules UI. */
export const CRON_PRESETS: { label: string; cron: string }[] = [
  { label: "Every day at 09:00", cron: "0 9 * * *" },
  { label: "Every weekday at 09:00", cron: "0 9 * * 1-5" },
  { label: "Every Monday at 09:00", cron: "0 9 * * 1" },
  { label: "Twice a week (Mon & Thu, 09:00)", cron: "0 9 * * 1,4" },
  { label: "First of each month at 09:00", cron: "0 9 1 * *" },
  { label: "Every hour", cron: "0 * * * *" },
];
