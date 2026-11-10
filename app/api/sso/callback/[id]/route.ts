/**
 * SSO callback (Enterprise, OIDC authorization-code flow).
 *
 * GET /api/sso/callback/<connectionId>?code=...&state=...
 *
 * Validates the state cookie, exchanges the code for tokens, provisions the
 * user into the connection's workspace, establishes a Better Auth session, and
 * redirects into the app.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ssoConnection } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getBaseUrl } from "@/lib/config";
import { isEEEnabled } from "@/ee/license";
import { exchangeOidcCode } from "@/ee/sso";
import { scimProvisionUser } from "@/ee/scim";
import { createSessionForUser } from "@/ee/session";
import { recordAuditEvent } from "@/ee/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fail(reason: string) {
  const url = new URL("/blogs/sign-in", getBaseUrl());
  url.searchParams.set("sso_error", reason);
  return NextResponse.redirect(url);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isEEEnabled("sso")) return fail("disabled");
  const { id } = await params;

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (!code || !state) return fail("missing_code");

  const expectedState = req.cookies.get(`sso_state_${id}`)?.value;
  if (!expectedState || expectedState !== state) return fail("bad_state");

  const [connection] = await db
    .select()
    .from(ssoConnection)
    .where(eq(ssoConnection.id, id))
    .limit(1);
  if (!connection || !connection.enabled) return fail("unknown_connection");

  const redirectUri = `${getBaseUrl()}/api/sso/callback/${connection.id}`;

  let profile;
  try {
    profile = await exchangeOidcCode(connection, code, redirectUri);
  } catch (err) {
    console.error("[sso] code exchange failed", err);
    return fail("exchange_failed");
  }

  // Provision the user into this connection's workspace (idempotent).
  const scimUser = await scimProvisionUser(connection.workspaceId, {
    email: profile.email,
    name: profile.name,
  });

  const secure = redirectUri.startsWith("https://");
  try {
    await createSessionForUser(scimUser.id, {
      secure,
      ip: req.headers.get("x-forwarded-for"),
      userAgent: req.headers.get("user-agent"),
    });
  } catch (err) {
    console.error("[sso] session creation failed", err);
    return fail("session_failed");
  }

  await recordAuditEvent({
    workspaceId: connection.workspaceId,
    actorId: scimUser.id,
    actorEmail: profile.email,
    action: "sso.login",
    targetType: "sso_connection",
    targetId: connection.id,
  });

  const res = NextResponse.redirect(new URL("/", getBaseUrl()));
  res.cookies.delete(`sso_state_${id}`);
  return res;
}
