"use server";

import { getAdminUserId, getSession } from "@/lib/admin";
import { getActiveWorkspace } from "@/lib/workspace";
import { deployment } from "@/lib/config";
import { getUsageSummary, getWorkspacePlan } from "@/lib/usage";
import { PLANS, type PlanId } from "@/lib/plans";
import { billingEnabled, startCheckout, openPortal } from "@/ee/billing";

async function requireWorkspace() {
  const userId = await getAdminUserId();
  if (!userId) throw new Error("Unauthorized");
  const workspace = await getActiveWorkspace();
  if (!workspace) throw new Error("No active workspace");
  return workspace;
}

/** Billing panel data: current plan, usage vs limits, and whether checkout works. */
export async function getBillingState() {
  const workspace = await requireWorkspace();
  const [summary, plan] = await Promise.all([
    getUsageSummary(workspace.id),
    getWorkspacePlan(workspace.id),
  ]);
  return {
    isCloud: deployment.isCloud(),
    billingEnabled: billingEnabled(),
    currentPlan: plan.id,
    usage: summary,
    plans: Object.values(PLANS).map((p) => ({
      id: p.id,
      name: p.name,
      priceMonthly: p.priceMonthly,
      blurb: p.blurb,
      selfServe: p.id === "pro" || p.id === "team",
    })),
  };
}

/** Start a Stripe Checkout session for a self-serve plan. Returns a redirect URL. */
export async function createCheckout(plan: PlanId): Promise<{ url: string }> {
  const workspace = await requireWorkspace();
  if (!billingEnabled()) throw new Error("Billing is not enabled on this deployment");
  const session = await getSession();
  return startCheckout({
    workspaceId: workspace.id,
    plan,
    customerEmail: session?.user?.email,
  });
}

/** Open the Stripe billing portal (manage/cancel). Returns a redirect URL. */
export async function openBillingPortal(): Promise<{ url: string }> {
  const workspace = await requireWorkspace();
  if (!billingEnabled()) throw new Error("Billing is not enabled on this deployment");
  return openPortal({ workspaceId: workspace.id });
}
