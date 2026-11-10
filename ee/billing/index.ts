import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscription } from "@/lib/db/schema";
import { deployment, getBaseUrl } from "@/lib/config";
import type { PlanId } from "@/lib/plans";
import {
  stripeConfigured,
  createCheckoutSession,
  createPortalSession,
  constructWebhookEvent,
} from "./stripe";

/**
 * Billing orchestration (cloud only). Stripe is the concrete provider; the
 * surface here (checkout / portal / webhook apply) is deliberately small so a
 * second provider could be slotted in behind it. Self-host never calls this.
 */

export function billingEnabled(): boolean {
  return deployment.isCloud() && stripeConfigured();
}

/** Map a self-serve plan to its Stripe price id (from env). */
export function priceIdForPlan(plan: PlanId): string | null {
  switch (plan) {
    case "pro":
      return process.env.STRIPE_PRICE_PRO?.trim() || null;
    case "team":
      return process.env.STRIPE_PRICE_TEAM?.trim() || null;
    default:
      return null; // free = no checkout; enterprise = contact sales
  }
}

/** Reverse map a Stripe price id back to a plan. */
export function planForPriceId(priceId: string | null | undefined): PlanId {
  if (!priceId) return "free";
  if (priceId === process.env.STRIPE_PRICE_TEAM?.trim()) return "team";
  if (priceId === process.env.STRIPE_PRICE_PRO?.trim()) return "pro";
  return "free";
}

export async function startCheckout(opts: {
  workspaceId: string;
  plan: PlanId;
  customerEmail?: string;
}): Promise<{ url: string }> {
  if (!billingEnabled()) throw new Error("Billing is not enabled");
  const priceId = priceIdForPlan(opts.plan);
  if (!priceId) throw new Error(`No Stripe price configured for plan "${opts.plan}"`);

  const [existing] = await db
    .select()
    .from(subscription)
    .where(eq(subscription.workspaceId, opts.workspaceId));

  const base = getBaseUrl();
  const session = await createCheckoutSession({
    priceId,
    workspaceId: opts.workspaceId,
    plan: opts.plan,
    customerEmail: opts.customerEmail,
    customerId: existing?.customerId || undefined,
    successUrl: `${base}/billing?checkout=success`,
    cancelUrl: `${base}/billing?checkout=cancelled`,
  });
  return { url: session.url };
}

export async function openPortal(opts: {
  workspaceId: string;
}): Promise<{ url: string }> {
  if (!billingEnabled()) throw new Error("Billing is not enabled");
  const [sub] = await db
    .select()
    .from(subscription)
    .where(eq(subscription.workspaceId, opts.workspaceId));
  if (!sub?.customerId) throw new Error("No billing customer for this workspace yet");
  const session = await createPortalSession({
    customerId: sub.customerId,
    returnUrl: `${getBaseUrl()}/billing`,
  });
  return { url: session.url };
}

/** Upsert the workspace's subscription row from provider data. */
async function upsertSubscription(data: {
  workspaceId: string;
  plan: PlanId;
  status: string;
  customerId?: string | null;
  subscriptionId?: string | null;
  priceId?: string | null;
  seats?: number;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: Date | null;
}): Promise<void> {
  const [existing] = await db
    .select()
    .from(subscription)
    .where(eq(subscription.workspaceId, data.workspaceId));

  const values = {
    plan: data.plan,
    status: data.status,
    provider: "stripe" as const,
    customerId: data.customerId ?? existing?.customerId ?? null,
    subscriptionId: data.subscriptionId ?? existing?.subscriptionId ?? null,
    priceId: data.priceId ?? existing?.priceId ?? null,
    seats: data.seats ?? existing?.seats ?? 1,
    cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
    currentPeriodEnd: data.currentPeriodEnd ?? existing?.currentPeriodEnd ?? null,
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(subscription).set(values).where(eq(subscription.id, existing.id));
  } else {
    await db.insert(subscription).values({ id: randomUUID(), workspaceId: data.workspaceId, ...values });
  }
}

/**
 * Verify + apply a Stripe webhook. Returns the event type handled. The route
 * passes the raw body and the `Stripe-Signature` header.
 */
export async function applyStripeWebhook(
  rawBody: string,
  sigHeader: string | null,
): Promise<{ handled: boolean; type: string }> {
  const event = constructWebhookEvent(rawBody, sigHeader);
  const type: string = event.type;

  switch (type) {
    case "checkout.session.completed": {
      const s = event.data.object;
      const workspaceId = s.client_reference_id || s.metadata?.workspaceId;
      if (!workspaceId) break;
      await upsertSubscription({
        workspaceId,
        plan: (s.metadata?.plan as PlanId) || "pro",
        status: "active",
        customerId: s.customer,
        subscriptionId: s.subscription,
      });
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object;
      const workspaceId = sub.metadata?.workspaceId;
      if (!workspaceId) break;
      const priceId = sub.items?.data?.[0]?.price?.id;
      await upsertSubscription({
        workspaceId,
        plan: planForPriceId(priceId),
        status: sub.status,
        customerId: sub.customer,
        subscriptionId: sub.id,
        priceId,
        seats: sub.items?.data?.[0]?.quantity ?? 1,
        cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
        currentPeriodEnd: sub.current_period_end
          ? new Date(sub.current_period_end * 1000)
          : null,
      });
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const workspaceId = sub.metadata?.workspaceId;
      if (!workspaceId) break;
      await upsertSubscription({
        workspaceId,
        plan: "free",
        status: "canceled",
        customerId: sub.customer,
        subscriptionId: sub.id,
      });
      break;
    }
    default:
      return { handled: false, type };
  }
  return { handled: true, type };
}
