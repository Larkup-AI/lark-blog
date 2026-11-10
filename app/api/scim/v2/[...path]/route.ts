/**
 * SCIM 2.0 provisioning endpoint (Enterprise).
 *
 * Minimal but functional /Users implementation so an IdP (Okta, Azure AD) can
 * create and deactivate workspace members automatically. Authenticated with a
 * workspace SCIM token (Bearer). Gated by the EE `scim` flag — without a
 * license, `verifyScimToken` fails closed and every call returns 501.
 *
 * Supported:
 *   GET    /api/scim/v2/Users            list (optional ?filter=userName eq "x")
 *   POST   /api/scim/v2/Users            create / provision
 *   GET    /api/scim/v2/Users/{id}       fetch one
 *   PATCH  /api/scim/v2/Users/{id}       set active true/false (deprovision)
 *   DELETE /api/scim/v2/Users/{id}       deprovision
 */
import { NextRequest, NextResponse } from "next/server";
import { isEEEnabled } from "@/ee/license";
import {
  verifyScimToken,
  scimListUsers,
  scimProvisionUser,
  scimGetUser,
  scimDeprovisionUser,
} from "@/ee/scim";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCIM_CONTENT_TYPE = "application/scim+json";

function scim(body: unknown, status = 200) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: { "Content-Type": SCIM_CONTENT_TYPE },
  });
}

function scimError(detail: string, status: number) {
  return scim(
    {
      schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
      detail,
      status: String(status),
    },
    status,
  );
}

async function authWorkspace(req: NextRequest) {
  if (!isEEEnabled("scim")) return { error: scimError("SCIM is not enabled.", 501) };
  const result = await verifyScimToken(req.headers.get("authorization"));
  if (!result) return { error: scimError("Invalid or missing bearer token.", 401) };
  return { workspaceId: result.workspaceId };
}

function parseUserNameFilter(filter: string | null): string | null {
  if (!filter) return null;
  // userName eq "alice@acme.com"
  const m = /userName\s+eq\s+"([^"]+)"/i.exec(filter);
  return m ? m[1] : null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const auth = await authWorkspace(req);
  if ("error" in auth) return auth.error;
  const { path } = await params;
  const [resource, id] = path;

  if (resource !== "Users") return scimError("Unsupported resource.", 404);

  if (id) {
    const user = await scimGetUser(auth.workspaceId, id);
    if (!user) return scimError("User not found.", 404);
    return scim(user);
  }

  const users = await scimListUsers(auth.workspaceId);
  const filterName = parseUserNameFilter(req.nextUrl.searchParams.get("filter"));
  const filtered = filterName
    ? users.filter((u) => u.userName.toLowerCase() === filterName.toLowerCase())
    : users;

  return scim({
    schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
    totalResults: filtered.length,
    startIndex: 1,
    itemsPerPage: filtered.length,
    Resources: filtered,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const auth = await authWorkspace(req);
  if ("error" in auth) return auth.error;
  const { path } = await params;
  if (path[0] !== "Users") return scimError("Unsupported resource.", 404);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return scimError("Invalid JSON body.", 400);
  }

  const email: string | undefined =
    body.userName || body.emails?.find((e: any) => e.primary)?.value || body.emails?.[0]?.value;
  if (!email) return scimError("userName or an email is required.", 400);

  const name =
    body.displayName ||
    [body.name?.givenName, body.name?.familyName].filter(Boolean).join(" ") ||
    email;

  const user = await scimProvisionUser(auth.workspaceId, { email, name });
  return scim(user, 201);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const auth = await authWorkspace(req);
  if ("error" in auth) return auth.error;
  const { path } = await params;
  const [resource, id] = path;
  if (resource !== "Users" || !id) return scimError("Unsupported resource.", 404);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return scimError("Invalid JSON body.", 400);
  }

  // Look for an `active: false` operation (Okta deactivation).
  const ops: any[] = body.Operations || body.operations || [];
  let active: boolean | undefined;
  for (const op of ops) {
    const value = op.value;
    if (typeof value === "boolean" && /active/i.test(op.path || "")) active = value;
    else if (value && typeof value === "object" && "active" in value)
      active = Boolean(value.active);
  }
  if (typeof body.active === "boolean") active = body.active;

  if (active === false) {
    await scimDeprovisionUser(auth.workspaceId, id);
    const user = await scimGetUser(auth.workspaceId, id);
    return scim(user ?? { id, active: false }, 200);
  }

  const user = await scimGetUser(auth.workspaceId, id);
  if (!user) return scimError("User not found.", 404);
  return scim(user);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const auth = await authWorkspace(req);
  if ("error" in auth) return auth.error;
  const { path } = await params;
  const [resource, id] = path;
  if (resource !== "Users" || !id) return scimError("Unsupported resource.", 404);

  await scimDeprovisionUser(auth.workspaceId, id);
  return new NextResponse(null, { status: 204 });
}
