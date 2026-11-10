/**
 * SSO login initiation (Enterprise, OIDC).
 *
 * GET /api/sso/login?email=user@acme.com   → route by email domain
 * GET /api/sso/login?connection=<id>       → force a specific connection
 *
 * Builds the IdP authorization URL, stores a short-lived state cookie, and
 * redirects. Gated by the EE `sso` flag via the connection lookups.
 */
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getBaseUrl } from "@/lib/config";
import { db } from "@/lib/db";
import { ssoConnection } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isEEEnabled } from "@/ee/license";
import { findConnectionForEmail, buildOidcAuthUrl } from "@/ee/sso";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isEEEnabled("sso")) {
    return NextResponse.json({ error: "SSO is not enabled." }, { status: 501 });
  }

  const email = req.nextUrl.searchParams.get("email");
  const connectionId = req.nextUrl.searchParams.get("connection");

  let connection = null;
  if (connectionId) {
    const [row] = await db
      .select()
      .from(ssoConnection)
      .where(eq(ssoConnection.id, connectionId))
      .limit(1);
    connection = row?.enabled ? row : null;
  } else if (email) {
    connection = await findConnectionForEmail(email);
  }

  if (!connection) {
    return NextResponse.json(
      { error: "No SSO connection found for that account." },
      { status: 404 },
    );
  }
  if (connection.type !== "oidc") {
    return NextResponse.json(
      { error: "Only OIDC sign-in is supported here." },
      { status: 400 },
    );
  }

  const state = randomBytes(16).toString("hex");
  const redirectUri = `${getBaseUrl()}/api/sso/callback/${connection.id}`;

  let authUrl: string;
  try {
    authUrl = await buildOidcAuthUrl(connection, state, redirectUri);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to start SSO." },
      { status: 500 },
    );
  }

  const res = NextResponse.redirect(authUrl);
  res.cookies.set(`sso_state_${connection.id}`, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: redirectUri.startsWith("https://"),
    path: "/",
    maxAge: 600,
  });
  return res;
}
