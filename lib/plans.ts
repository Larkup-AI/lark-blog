/**
 * Cloud plans, limits and prices.
 *
 * These matter only when `DEPLOYMENT_MODE=cloud`. Self-host is always
 * unlimited (no metering, no gates) — the whole MIT core runs with zero plan
 * logic. Prices are in USD/month; the actual Stripe/Polar price IDs are mapped
 * from env (see `ee/billing`).
 *
 * `-1` means unlimited. `aiTokensPerMonth` only applies when the workspace uses
 * the platform's AI credits; a workspace that brings its own key (BYOK) is never
 * charged or limited on AI tokens (`byokAllowed` is true on every plan).
 */

export type PlanId = "free" | "pro" | "team" | "enterprise";

export type UsageMetric = "posts" | "ai_tokens" | "storage_bytes" | "api_requests";

export type PlanLimits = {
  /** Published + draft posts the workspace may hold (-1 = unlimited). */
  posts: number;
  /** Platform-provided AI tokens per month (BYOK is always unmetered). */
  aiTokensPerMonth: number;
  /** Stored bytes across uploads. */
  storageBytes: number;
  /** Active API keys. */
  apiKeys: number;
  /** Members (seats) in the workspace. */
  seats: number;
  /** Active cron schedules. */
  schedules: number;
};

export type Plan = {
  id: PlanId;
  name: string;
  /** USD per month, billed monthly. null = "contact us". */
  priceMonthly: number | null;
  /** USD per member/month for seat-based overage (team+). */
  seatPriceMonthly?: number;
  blurb: string;
  limits: PlanLimits;
  features: {
    customDomain: boolean;
    advancedScheduling: boolean; // multiple schedules + auto-publish (EE)
    sso: boolean; // SSO/SCIM/custom roles/audit (EE)
    removeBadge: boolean; // drop the "Powered by" badge on hosted/embed
    byokAllowed: boolean;
  };
};

const GB = 1024 * 1024 * 1024;

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    blurb: "Try it out. 1 workspace, BYO AI key, Powered-by badge.",
    limits: {
      posts: 20,
      aiTokensPerMonth: 50_000,
      storageBytes: 1 * GB,
      apiKeys: 2,
      seats: 1,
      schedules: 0,
    },
    features: {
      customDomain: false,
      advancedScheduling: false,
      sso: false,
      removeBadge: false,
      byokAllowed: true,
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceMonthly: 19,
    blurb: "For solo creators: custom domain, scheduling, no badge.",
    limits: {
      posts: 500,
      aiTokensPerMonth: 1_000_000,
      storageBytes: 25 * GB,
      apiKeys: 10,
      seats: 1,
      schedules: 1,
    },
    features: {
      customDomain: true,
      advancedScheduling: false,
      sso: false,
      removeBadge: true,
      byokAllowed: true,
    },
  },
  team: {
    id: "team",
    name: "Team",
    priceMonthly: 79,
    seatPriceMonthly: 15,
    blurb: "For teams: seats, roles, multiple schedules, analytics.",
    limits: {
      posts: -1,
      aiTokensPerMonth: 5_000_000,
      storageBytes: 100 * GB,
      apiKeys: 50,
      seats: 5,
      schedules: 10,
    },
    features: {
      customDomain: true,
      advancedScheduling: true,
      sso: false,
      removeBadge: true,
      byokAllowed: true,
    },
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    priceMonthly: null, // contact sales (annual)
    blurb: "SSO/SCIM, custom roles, audit log, SLA, self-host EE license.",
    limits: {
      posts: -1,
      aiTokensPerMonth: -1,
      storageBytes: -1,
      apiKeys: -1,
      seats: -1,
      schedules: -1,
    },
    features: {
      customDomain: true,
      advancedScheduling: true,
      sso: true,
      removeBadge: true,
      byokAllowed: true,
    },
  },
};

export const DEFAULT_PLAN: PlanId = "free";

export function getPlan(id: string | null | undefined): Plan {
  if (id && id in PLANS) return PLANS[id as PlanId];
  return PLANS[DEFAULT_PLAN];
}

export function isUnlimited(limit: number): boolean {
  return limit < 0;
}
