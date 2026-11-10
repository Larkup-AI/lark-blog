import { NextResponse } from "next/server";
import { deployment } from "@/lib/config";
import { applyStripeWebhook } from "@/ee/billing";

// Stripe needs the raw body for signature verification — do not let Next parse it.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!deployment.isCloud()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature");
  try {
    const result = await applyStripeWebhook(rawBody, sig);
    return NextResponse.json({ received: true, ...result });
  } catch (err) {
    // 400 so Stripe retries on transient errors but we never 500 the endpoint.
    console.error("[stripe] webhook error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Webhook verification failed" },
      { status: 400 },
    );
  }
}
