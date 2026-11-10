import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { customDomain } from "@/lib/db/schema";
import { deployment } from "@/lib/config";

/**
 * Custom domains for the hosted blog (cloud / no-code). A workspace adds a
 * domain, we issue a TXT verification token, the user adds it to DNS, and we
 * verify it via DNS-over-HTTPS. On cloud we also register the domain with the
 * Vercel Domains API so TLS is provisioned automatically.
 *
 * Env (cloud): VERCEL_API_TOKEN, VERCEL_PROJECT_ID, (optional) VERCEL_TEAM_ID.
 */

const TXT_PREFIX = "lark-verify";

export function normalizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");
}

export function isValidDomain(domain: string): boolean {
  return /^(?!-)[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})+$/.test(domain);
}

/** The TXT record the user must add: `lark-verify.<domain>  TXT  <token>`. */
export function txtRecordName(domain: string): string {
  return `${TXT_PREFIX}.${domain}`;
}

export async function listDomains(workspaceId: string) {
  return db
    .select()
    .from(customDomain)
    .where(eq(customDomain.workspaceId, workspaceId));
}

export async function addDomain(workspaceId: string, rawDomain: string) {
  const domain = normalizeDomain(rawDomain);
  if (!isValidDomain(domain)) throw new Error("Enter a valid domain, e.g. blog.example.com");

  const [existing] = await db
    .select()
    .from(customDomain)
    .where(eq(customDomain.domain, domain));
  if (existing) {
    if (existing.workspaceId !== workspaceId) throw new Error("That domain is already in use");
    return existing;
  }

  const token = `${TXT_PREFIX}-${randomUUID().replace(/-/g, "")}`;
  const [row] = await db
    .insert(customDomain)
    .values({
      id: randomUUID(),
      workspaceId,
      domain,
      verificationToken: token,
      verified: false,
    })
    .returning();

  // On cloud, register with Vercel so a cert is issued once DNS points here.
  await registerWithVercel(domain).catch(() => {});
  return row;
}

/** Look up the TXT records for a name via Cloudflare DNS-over-HTTPS. */
async function resolveTxt(name: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=TXT`,
      { headers: { accept: "application/dns-json" }, signal: AbortSignal.timeout(4000) },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { Answer?: Array<{ data?: string }> };
    return (data.Answer || []).map((a) => (a.data || "").replace(/^"|"$/g, ""));
  } catch {
    return [];
  }
}

export async function verifyDomain(workspaceId: string, domainId: string) {
  const [row] = await db
    .select()
    .from(customDomain)
    .where(eq(customDomain.id, domainId));
  if (!row || row.workspaceId !== workspaceId) throw new Error("Domain not found");
  if (row.verified) return row;

  const records = await resolveTxt(txtRecordName(row.domain));
  const ok = records.includes(row.verificationToken);
  if (!ok) {
    throw new Error(
      `TXT record not found yet. Add: ${txtRecordName(row.domain)} TXT "${row.verificationToken}" and retry (DNS can take a few minutes).`,
    );
  }

  const [updated] = await db
    .update(customDomain)
    .set({ verified: true, verifiedAt: new Date() })
    .where(eq(customDomain.id, domainId))
    .returning();
  return updated;
}

export async function removeDomain(workspaceId: string, domainId: string) {
  const [row] = await db
    .select()
    .from(customDomain)
    .where(eq(customDomain.id, domainId));
  if (!row || row.workspaceId !== workspaceId) throw new Error("Domain not found");
  await db.delete(customDomain).where(eq(customDomain.id, domainId));
  await unregisterFromVercel(row.domain).catch(() => {});
  return { success: true };
}

/** Map an incoming request host to a verified workspace (for host routing). */
export async function resolveWorkspaceByHost(host: string): Promise<string | null> {
  const domain = normalizeDomain(host);
  const [row] = await db
    .select({ workspaceId: customDomain.workspaceId, verified: customDomain.verified })
    .from(customDomain)
    .where(eq(customDomain.domain, domain));
  return row?.verified ? row.workspaceId : null;
}

/* ----------------------------- Vercel Domains API ------------------------ */

function vercelConfigured(): boolean {
  return Boolean(
    deployment.isCloud() &&
      process.env.VERCEL_API_TOKEN?.trim() &&
      process.env.VERCEL_PROJECT_ID?.trim(),
  );
}

function vercelUrl(path: string): string {
  const team = process.env.VERCEL_TEAM_ID?.trim();
  return `https://api.vercel.com${path}${team ? `?teamId=${team}` : ""}`;
}

async function registerWithVercel(domain: string): Promise<void> {
  if (!vercelConfigured()) return;
  await fetch(vercelUrl(`/v10/projects/${process.env.VERCEL_PROJECT_ID}/domains`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: domain }),
  });
}

async function unregisterFromVercel(domain: string): Promise<void> {
  if (!vercelConfigured()) return;
  await fetch(
    vercelUrl(`/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${domain}`),
    { method: "DELETE", headers: { Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}` } },
  );
}
