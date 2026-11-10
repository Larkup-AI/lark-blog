/**
 * Rate limiting — a thin, dependency-free fixed-window limiter backed by Upstash
 * Redis REST. It is a **no-op when Upstash env is absent** (self-host / local),
 * so the MIT core never requires Redis. Flagged library, not an always-on worker.
 *
 * Env (cloud): UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN.
 */

const URL_ENV = process.env.UPSTASH_REDIS_REST_URL?.trim();
const TOKEN_ENV = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  /** Unix ms when the current window resets. */
  reset: number;
};

export function rateLimitEnabled(): boolean {
  return Boolean(URL_ENV && TOKEN_ENV);
}

/**
 * Fixed-window limit: at most `limit` requests per `windowSec` for `key`.
 * Returns `success: true` (allowed) and never throws — a backend error fails
 * open so a Redis hiccup can't take the API down.
 */
export async function rateLimit(
  key: string,
  limit = 60,
  windowSec = 60,
): Promise<RateLimitResult> {
  const now = Date.now();
  const reset = now + windowSec * 1000;
  if (!rateLimitEnabled()) {
    return { success: true, limit, remaining: limit, reset };
  }

  const bucket = Math.floor(now / 1000 / windowSec);
  const redisKey = `ratelimit:${key}:${bucket}`;

  try {
    // Pipeline: INCR then EXPIRE in one round-trip.
    const res = await fetch(`${URL_ENV}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN_ENV}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["EXPIRE", redisKey, String(windowSec)],
      ]),
      // Keep it snappy; fail open on slowness.
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return { success: true, limit, remaining: limit, reset };
    const data = (await res.json()) as Array<{ result?: number }>;
    const count = Number(data?.[0]?.result ?? 0);
    const remaining = Math.max(0, limit - count);
    return { success: count <= limit, limit, remaining, reset };
  } catch {
    return { success: true, limit, remaining: limit, reset };
  }
}

/** Best-effort client IP from standard proxy headers. */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}
