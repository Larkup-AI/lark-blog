/**
 * Establish a Better Auth session for a user who authenticated out-of-band
 * (SSO). Better Auth has no public "log this user in" API without a password,
 * so after the IdP verifies the user we create the session row ourselves and
 * set the exact cookie Better Auth reads.
 *
 * The cookie format is Better Auth's default (better-call signed cookie):
 *   name  = "<__Secure-?>better-auth.session_token"
 *   value = encodeURIComponent(`${token}.${base64(HMAC_SHA256(secret, token))}`)
 * This matches `createCookieGetter` + `signCookieValue` for the DEFAULT config
 * this product ships (no custom cookiePrefix / crossSubDomainCookies). Session
 * lookup then falls back to the DB, so no session_data cache cookie is needed.
 */
import { createHmac, randomUUID, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { session as sessionTable } from "@/lib/db/schema";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // mirrors auth.ts session.expiresIn

function authSecret(): string {
  const s =
    process.env.BETTER_AUTH_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.ENCRYPTION_KEY ||
    "";
  if (!s) throw new Error("BETTER_AUTH_SECRET must be set to sign sessions.");
  return s;
}

/** Reproduce better-call's signed-cookie value for a token. */
function signCookieValue(token: string, secret: string): string {
  const signature = createHmac("sha256", secret).update(token).digest("base64");
  return encodeURIComponent(`${token}.${signature}`);
}

function sessionCookieName(secure: boolean): string {
  const prefix = secure ? "__Secure-" : "";
  return `${prefix}better-auth.session_token`;
}

/**
 * Create a DB session for `userId` and set the Better Auth session cookie.
 * `secure` should be true when the deployment is served over HTTPS.
 */
export async function createSessionForUser(
  userId: string,
  opts: { secure: boolean; ip?: string | null; userAgent?: string | null },
): Promise<void> {
  const token = randomBytes(24).toString("base64url"); // ~32 chars, url-safe
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);

  await db.insert(sessionTable).values({
    id: randomUUID(),
    token,
    userId,
    expiresAt,
    ipAddress: opts.ip ?? "",
    userAgent: opts.userAgent ?? "",
    createdAt: now,
    updatedAt: now,
  });

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName(opts.secure), signCookieValue(token, authSecret()), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: opts.secure,
    maxAge: SESSION_TTL_SECONDS,
  });
}
