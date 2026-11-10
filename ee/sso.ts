/**
 * Enterprise SSO (OIDC / SAML) — connection storage and the OIDC login flow.
 *
 * Connections live in `sso_connection`, scoped by workspace. Secrets inside
 * `config` (OIDC client secret, SAML private key) are encrypted at rest via
 * `lib/crypto` and never returned to the browser.
 *
 * OIDC is implemented here end-to-end (authorization-code flow with discovery).
 * SAML connection storage is supported; the SAML assertion handler is a thin
 * stub left for a SAML library integration — OIDC covers the common IdPs
 * (Okta, Azure AD, Google Workspace, Auth0) out of the box.
 *
 * Everything is gated by the EE `sso` flag: without a license, `findConnection*`
 * returns null so the app only offers email/password sign-in.
 */
import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { ssoConnection, type SsoConnection } from "@/lib/db/schema";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { isEEEnabled } from "./license";

/** Secret keys inside the OIDC/SAML config blob, encrypted at rest. */
const SECRET_KEYS = ["clientSecret", "privateKey"];

export type OidcConfig = {
  clientId: string;
  clientSecret: string;
  /** OIDC issuer / discovery base, e.g. https://acme.okta.com */
  discoveryUrl?: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  userinfoUrl?: string;
};

function encryptConfig(cfg: Record<string, any>): Record<string, any> {
  const out = { ...cfg };
  for (const k of SECRET_KEYS)
    if (typeof out[k] === "string" && out[k]) out[k] = encryptSecret(out[k]);
  return out;
}

function decryptConfig(cfg: Record<string, any> | null): Record<string, any> {
  const out = { ...(cfg ?? {}) };
  for (const k of SECRET_KEYS)
    if (typeof out[k] === "string" && out[k]) out[k] = decryptSecret(out[k]);
  return out;
}

/* ----------------------------- connection CRUD ---------------------------- */

export async function listSsoConnections(
  workspaceId: string,
): Promise<SsoConnection[]> {
  return db
    .select()
    .from(ssoConnection)
    .where(eq(ssoConnection.workspaceId, workspaceId));
}

export async function createSsoConnection(input: {
  workspaceId: string;
  type: "oidc" | "saml";
  label: string;
  domain?: string | null;
  issuer?: string | null;
  config: Record<string, any>;
}): Promise<string> {
  const id = `sso_${randomUUID().replace(/-/g, "")}`;
  await db.insert(ssoConnection).values({
    id,
    workspaceId: input.workspaceId,
    type: input.type,
    label: input.label,
    domain: input.domain?.trim().toLowerCase() || null,
    issuer: input.issuer || null,
    config: encryptConfig(input.config) as never,
    enabled: false,
  });
  return id;
}

export async function updateSsoConnection(
  id: string,
  workspaceId: string,
  patch: Partial<{
    label: string;
    domain: string | null;
    issuer: string | null;
    config: Record<string, any>;
    enabled: boolean;
  }>,
): Promise<void> {
  const set: Record<string, any> = { updatedAt: new Date() };
  if (patch.label !== undefined) set.label = patch.label;
  if (patch.domain !== undefined)
    set.domain = patch.domain?.trim().toLowerCase() || null;
  if (patch.issuer !== undefined) set.issuer = patch.issuer;
  if (patch.enabled !== undefined) set.enabled = patch.enabled;
  if (patch.config !== undefined) set.config = encryptConfig(patch.config);
  await db
    .update(ssoConnection)
    .set(set)
    .where(
      and(eq(ssoConnection.id, id), eq(ssoConnection.workspaceId, workspaceId)),
    );
}

export async function deleteSsoConnection(
  id: string,
  workspaceId: string,
): Promise<void> {
  await db
    .delete(ssoConnection)
    .where(
      and(eq(ssoConnection.id, id), eq(ssoConnection.workspaceId, workspaceId)),
    );
}

/** A connection by id (secrets decrypted). EE-gated. */
export async function getConnection(
  id: string,
): Promise<(SsoConnection & { configDecrypted: Record<string, any> }) | null> {
  if (!isEEEnabled("sso")) return null;
  const [row] = await db
    .select()
    .from(ssoConnection)
    .where(eq(ssoConnection.id, id))
    .limit(1);
  if (!row) return null;
  return { ...row, configDecrypted: decryptConfig(row.config as any) };
}

/** Route an email address to an enabled connection by its domain. EE-gated. */
export async function findConnectionForEmail(
  email: string,
): Promise<SsoConnection | null> {
  if (!isEEEnabled("sso")) return null;
  const domain = email.split("@")[1]?.trim().toLowerCase();
  if (!domain) return null;
  const [row] = await db
    .select()
    .from(ssoConnection)
    .where(
      and(eq(ssoConnection.domain, domain), eq(ssoConnection.enabled, true)),
    )
    .limit(1);
  return row ?? null;
}

/* ------------------------------- OIDC flow -------------------------------- */

type OidcEndpoints = {
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint?: string;
};

/** Resolve OIDC endpoints from the discovery document or stored overrides. */
async function resolveOidcEndpoints(
  cfg: OidcConfig,
): Promise<OidcEndpoints> {
  if (cfg.authorizationUrl && cfg.tokenUrl) {
    return {
      authorization_endpoint: cfg.authorizationUrl,
      token_endpoint: cfg.tokenUrl,
      userinfo_endpoint: cfg.userinfoUrl,
    };
  }
  if (!cfg.discoveryUrl) {
    throw new Error("OIDC connection needs a discovery URL or explicit endpoints.");
  }
  const base = cfg.discoveryUrl.replace(/\/$/, "");
  const wellKnown = base.endsWith("/.well-known/openid-configuration")
    ? base
    : `${base}/.well-known/openid-configuration`;
  const res = await fetch(wellKnown, { cache: "no-store" });
  if (!res.ok) throw new Error(`OIDC discovery failed (${res.status}).`);
  const doc = (await res.json()) as OidcEndpoints;
  if (!doc.authorization_endpoint || !doc.token_endpoint)
    throw new Error("OIDC discovery document is missing required endpoints.");
  return doc;
}

/** Validate an OIDC connection by fetching its discovery document. */
export async function testOidcConnection(
  cfg: OidcConfig,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await resolveOidcEndpoints(cfg);
    if (!cfg.clientId) return { ok: false, error: "Client ID is required." };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Connection test failed." };
  }
}

/** Build the authorization URL to redirect the user to their IdP. */
export async function buildOidcAuthUrl(
  connection: SsoConnection,
  state: string,
  redirectUri: string,
): Promise<string> {
  const cfg = decryptConfig(connection.config as any) as OidcConfig;
  const endpoints = await resolveOidcEndpoints(cfg);
  const url = new URL(endpoints.authorization_endpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", cfg.clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  return url.toString();
}

export type OidcProfile = { email: string; name?: string; sub: string };

/** Exchange an authorization code for tokens and return the user's profile. */
export async function exchangeOidcCode(
  connection: SsoConnection,
  code: string,
  redirectUri: string,
): Promise<OidcProfile> {
  const cfg = decryptConfig(connection.config as any) as OidcConfig;
  const endpoints = await resolveOidcEndpoints(cfg);

  const tokenRes = await fetch(endpoints.token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
    }),
    cache: "no-store",
  });
  if (!tokenRes.ok) {
    throw new Error(`OIDC token exchange failed (${tokenRes.status}).`);
  }
  const tokens = (await tokenRes.json()) as {
    id_token?: string;
    access_token?: string;
  };

  // Prefer the id_token claims; fall back to the userinfo endpoint.
  let profile: Partial<OidcProfile> = {};
  if (tokens.id_token) {
    profile = decodeIdTokenClaims(tokens.id_token);
  }
  if ((!profile.email || !profile.sub) && endpoints.userinfo_endpoint && tokens.access_token) {
    const uiRes = await fetch(endpoints.userinfo_endpoint, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      cache: "no-store",
    });
    if (uiRes.ok) {
      const ui = (await uiRes.json()) as any;
      profile = {
        email: profile.email || ui.email,
        name: profile.name || ui.name || ui.preferred_username,
        sub: profile.sub || ui.sub,
      };
    }
  }

  if (!profile.email) throw new Error("IdP did not return an email address.");
  return {
    email: profile.email.toLowerCase(),
    name: profile.name,
    sub: profile.sub || profile.email,
  };
}

/** Decode (NOT cryptographically verify) the claims of a JWT id_token. */
function decodeIdTokenClaims(idToken: string): Partial<OidcProfile> {
  try {
    const [, payload] = idToken.split(".");
    const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return { email: json.email, name: json.name, sub: json.sub };
  } catch {
    return {};
  }
}

/** Public shape of a connection for the UI (no secrets). */
export function redactConnection(c: SsoConnection) {
  const cfg = (c.config as Record<string, any>) ?? {};
  return {
    id: c.id,
    type: c.type,
    label: c.label,
    domain: c.domain,
    issuer: c.issuer,
    enabled: c.enabled,
    hasClientSecret: Boolean(cfg.clientSecret),
    clientId: cfg.clientId ?? "",
    discoveryUrl: cfg.discoveryUrl ?? "",
    createdAt: c.createdAt,
  };
}
