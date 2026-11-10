"use server";

import { revalidatePath } from "next/cache";
import { getAdminUserId } from "@/lib/admin";
import { getActiveWorkspace } from "@/lib/workspace";
import { getWorkspacePlan } from "@/lib/usage";
import {
  addDomain,
  listDomains,
  verifyDomain,
  removeDomain,
  txtRecordName,
} from "@/lib/custom-domains";

async function requireWorkspace() {
  const userId = await getAdminUserId();
  if (!userId) throw new Error("Unauthorized");
  const workspace = await getActiveWorkspace();
  if (!workspace) throw new Error("No active workspace");
  return workspace;
}

export type DomainListItem = {
  id: string;
  domain: string;
  verified: boolean;
  txtName: string;
  txtValue: string;
};

export async function getDomains(): Promise<DomainListItem[]> {
  const workspace = await requireWorkspace();
  const rows = await listDomains(workspace.id);
  return rows.map((r) => ({
    id: r.id,
    domain: r.domain,
    verified: r.verified,
    txtName: txtRecordName(r.domain),
    txtValue: r.verificationToken,
  }));
}

export async function addCustomDomain(domain: string): Promise<DomainListItem> {
  const workspace = await requireWorkspace();
  // Custom domains are a paid feature (cloud). Gate by plan.
  const plan = await getWorkspacePlan(workspace.id);
  if (!plan.features.customDomain) {
    throw new Error("Custom domains are available on the Pro plan and above.");
  }
  const row = await addDomain(workspace.id, domain);
  revalidatePath("/settings");
  return {
    id: row.id,
    domain: row.domain,
    verified: row.verified,
    txtName: txtRecordName(row.domain),
    txtValue: row.verificationToken,
  };
}

export async function verifyCustomDomain(id: string): Promise<{ verified: boolean }> {
  const workspace = await requireWorkspace();
  const row = await verifyDomain(workspace.id, id);
  revalidatePath("/settings");
  return { verified: row.verified };
}

export async function removeCustomDomain(id: string): Promise<{ success: true }> {
  const workspace = await requireWorkspace();
  await removeDomain(workspace.id, id);
  revalidatePath("/settings");
  return { success: true };
}
