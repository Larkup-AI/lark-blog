/**
 * Scheduled-generation worker endpoint.
 *
 * Call this on an interval to run due schedules:
 *   - Vercel:  add it to `vercel.json` crons (Vercel sends the CRON_SECRET as a
 *              Bearer token automatically when configured).
 *   - Docker:  a sidecar / system cron does `curl -H "Authorization: Bearer $CRON_SECRET" .../api/cron/tick`.
 *
 * Protected by CRON_SECRET (Bearer header, `x-cron-secret` header, or `?secret=`).
 * If CRON_SECRET is unset the endpoint refuses to run (fails closed) rather than
 * exposing unauthenticated generation.
 */
import { NextRequest, NextResponse } from "next/server";
import { tick } from "@/lib/cron/runner";

// Needs the full Node runtime (DB + AI SDK) and a long budget for generation.
export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false; // fail closed: no secret configured.
  const header = req.headers.get("authorization");
  const bearer = header?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const custom = req.headers.get("x-cron-secret")?.trim();
  const query = req.nextUrl.searchParams.get("secret")?.trim();
  return bearer === secret || custom === secret || query === secret;
}

async function handle(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json(
      { error: "Unauthorized. Set CRON_SECRET and pass it as a Bearer token." },
      { status: 401 },
    );
  }
  const limit = Number(req.nextUrl.searchParams.get("limit") || 10);
  try {
    const result = await tick(Number.isFinite(limit) ? limit : 10);
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Tick failed." },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
