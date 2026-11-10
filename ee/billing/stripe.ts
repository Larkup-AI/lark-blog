import { createHmac, timingSafeEqual } from "crypto";

/**
 * Minimal, dependency-free Stripe client (REST over fetch) + webhook signature
 * verification. We avoid the `stripe` npm package so the MIT core stays lean and
 * installable with zero cloud deps; billing code only runs when configured.
 *
 * Env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_PRO, STRIPE_PRICE_TEAM.
 */

const API = "https://api.stripe.com";

function secretKey(): string {
  const k = process.env.STRIPE_SECRET_KEY?.trim();
  if (!k) throw new Error("STRIPE_SECRET_KEY is not set");
  return k;
}

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

/** Encode a nested object into Stripe's bracketed form syntax. */
function toForm(obj: Record<string, unknown>, prefix = ""): string[] {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    const field = prefix ? `${prefix}[${key}]` : key;
    if (typeof value === "object" && !Array.isArray(value)) {
      parts.push(...toForm(value as Record<string, unknown>, field));
    } else if (Array.isArray(value)) {
      value.forEach((v, i) => {
        if (typeof v === "object") {
          parts.push(...toForm(v as Record<string, unknown>, `${field}[${i}]`));
        } else {
          parts.push(`${encodeURIComponent(`${field}[${i}]`)}=${encodeURIComponent(String(v))}`);
        }
      });
    } else {
      parts.push(`${encodeURIComponent(field)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts;
}

async function stripePost<T = any>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: toForm(body).join("&"),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Stripe ${path} failed: ${json?.error?.message || res.status}`);
  }
  return json as T;
}

export async function createCheckoutSession(opts: {
  priceId: string;
  workspaceId: string;
  plan: string;
  customerEmail?: string;
  customerId?: string;
  successUrl: string;
  cancelUrl: string;
  quantity?: number;
}): Promise<{ id: string; url: string }> {
  const body: Record<string, unknown> = {
    mode: "subscription",
    "line_items": [{ price: opts.priceId, quantity: opts.quantity ?? 1 }],
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    client_reference_id: opts.workspaceId,
    allow_promotion_codes: true,
    subscription_data: {
      metadata: { workspaceId: opts.workspaceId, plan: opts.plan },
    },
    metadata: { workspaceId: opts.workspaceId, plan: opts.plan },
  };
  if (opts.customerId) body.customer = opts.customerId;
  else if (opts.customerEmail) body.customer_email = opts.customerEmail;
  return stripePost("/v1/checkout/sessions", body);
}

export async function createPortalSession(opts: {
  customerId: string;
  returnUrl: string;
}): Promise<{ id: string; url: string }> {
  return stripePost("/v1/billing_portal/sessions", {
    customer: opts.customerId,
    return_url: opts.returnUrl,
  });
}

export async function getSubscription(subscriptionId: string): Promise<any> {
  const res = await fetch(`${API}/v1/subscriptions/${subscriptionId}`, {
    headers: { Authorization: `Bearer ${secretKey()}` },
  });
  if (!res.ok) throw new Error(`Stripe get subscription failed: ${res.status}`);
  return res.json();
}

/**
 * Verify a Stripe webhook signature (the `Stripe-Signature` header) against the
 * raw request body. Returns the parsed event, or throws on an invalid/expired
 * signature. Equivalent to `stripe.webhooks.constructEvent`, no SDK needed.
 */
export function constructWebhookEvent(
  payload: string,
  sigHeader: string | null,
  secret = process.env.STRIPE_WEBHOOK_SECRET?.trim(),
  toleranceSec = 300,
): any {
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  if (!sigHeader) throw new Error("Missing Stripe-Signature header");

  const parts = Object.fromEntries(
    sigHeader.split(",").map((kv) => kv.split("=").map((s) => s.trim()) as [string, string]),
  );
  const timestamp = parts["t"];
  const signature = parts["v1"];
  if (!timestamp || !signature) throw new Error("Malformed Stripe-Signature header");

  // Replay protection.
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > toleranceSec) throw new Error("Stripe webhook timestamp outside tolerance");

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`, "utf8")
    .digest("hex");

  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("Stripe webhook signature mismatch");
  }
  return JSON.parse(payload);
}
