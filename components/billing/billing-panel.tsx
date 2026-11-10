"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getBillingState,
  createCheckout,
  openBillingPortal,
} from "@/app/actions/billing";
import type { PlanId } from "@/lib/plans";

type State = Awaited<ReturnType<typeof getBillingState>>;

function fmtLimit(n: number): string {
  if (n < 0) return "Unlimited";
  if (n >= 1_000_000_000) return `${Math.round(n / 1_000_000_000)} GB`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString()}M`;
  return n.toLocaleString();
}

const METRIC_LABELS: Record<string, string> = {
  posts: "Posts",
  ai_tokens: "AI tokens (this month)",
  storage_bytes: "Storage",
  api_keys: "API keys",
};

export function BillingPanel({ initial }: { initial: State }) {
  const [state] = useState<State>(initial);
  const [busy, setBusy] = useState<string | null>(null);

  async function goCheckout(plan: PlanId) {
    setBusy(plan);
    try {
      const { url } = await createCheckout(plan);
      window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Checkout failed");
      setBusy(null);
    }
  }

  async function goPortal() {
    setBusy("portal");
    try {
      const { url } = await openBillingPortal();
      window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open portal");
      setBusy(null);
    }
  }

  const usage = state.usage;

  return (
    <div className="space-y-10">
      {/* Current plan + usage */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">
            Current plan:{" "}
            <span className="capitalize text-primary">{usage.planName}</span>
          </h2>
          {state.billingEnabled && state.currentPlan !== "free" && (
            <Button variant="outline" onClick={goPortal} disabled={busy !== null}>
              {busy === "portal" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="mr-2 h-4 w-4" />
              )}
              Manage billing
            </Button>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {Object.entries(usage.metrics).map(([metric, m]) => {
            const pct =
              m.limit < 0 ? 0 : Math.min(100, Math.round((m.used / Math.max(1, m.limit)) * 100));
            const unit = metric === "storage_bytes";
            return (
              <div key={metric} className="rounded-lg border border-border p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{METRIC_LABELS[metric] ?? metric}</span>
                  <span className="font-medium">
                    {unit ? `${(m.used / 1_000_000_000).toFixed(2)} GB` : m.used.toLocaleString()}
                    {" / "}
                    {fmtLimit(m.limit)}
                  </span>
                </div>
                {m.limit >= 0 && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full ${pct >= 90 ? "bg-destructive" : "bg-primary"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Plans */}
      <section>
        <h2 className="text-lg font-medium">Plans</h2>
        {!state.billingEnabled && (
          <p className="mt-1 text-sm text-muted-foreground">
            Checkout is not configured on this deployment (set{" "}
            <code>STRIPE_SECRET_KEY</code> and the price IDs). Plans are shown for
            reference.
          </p>
        )}
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          {state.plans.map((p) => {
            const current = p.id === state.currentPlan;
            return (
              <div
                key={p.id}
                className={`flex flex-col rounded-lg border p-4 ${
                  current ? "border-primary ring-1 ring-primary" : "border-border"
                }`}
              >
                <div className="font-medium">{p.name}</div>
                <div className="mt-1 text-2xl font-semibold">
                  {p.priceMonthly === null
                    ? "Custom"
                    : p.priceMonthly === 0
                      ? "Free"
                      : `$${p.priceMonthly}`}
                  {p.priceMonthly ? (
                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                  ) : null}
                </div>
                <p className="mt-2 flex-1 text-xs text-muted-foreground">{p.blurb}</p>
                <div className="mt-4">
                  {current ? (
                    <Button variant="outline" disabled className="w-full">
                      <Check className="mr-2 h-4 w-4" />
                      Current
                    </Button>
                  ) : p.selfServe && state.billingEnabled ? (
                    <Button
                      className="w-full"
                      onClick={() => goCheckout(p.id as PlanId)}
                      disabled={busy !== null}
                    >
                      {busy === p.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Upgrade
                    </Button>
                  ) : p.id === "enterprise" ? (
                    <Button variant="outline" className="w-full" asChild>
                      <a href="mailto:sales@lark.blog?subject=Enterprise">Contact sales</a>
                    </Button>
                  ) : (
                    <Button variant="outline" disabled className="w-full">
                      —
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
