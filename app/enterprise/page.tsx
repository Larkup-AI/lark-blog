import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession, isFullAdmin } from "@/lib/admin";
import { getActiveWorkspace } from "@/lib/workspace";
import { isEEEnabled, getLicense } from "@/ee/license";
import { PERMISSIONS, ROLE_PRESETS } from "@/ee/rbac";
import { listRoles, listSso, listScimTokens, getAuditLog } from "@/app/actions/ee";
import { getBaseUrl } from "@/lib/config";
import { EnterpriseManager } from "@/components/enterprise/enterprise-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Enterprise" };

export default async function EnterprisePage() {
  const session = await getSession();
  if (!session?.user) redirect("/blogs/sign-in");
  if (!isFullAdmin(session.user)) redirect("/");

  const active = await getActiveWorkspace();
  if (!active) redirect("/");

  const license = getLicense();
  const features = {
    customRoles: isEEEnabled("custom-roles"),
    sso: isEEEnabled("sso"),
    scim: isEEEnabled("scim"),
    auditLog: isEEEnabled("audit-log"),
  };

  const [roles, sso, scimTokens, audit] = await Promise.all([
    listRoles(),
    listSso(),
    listScimTokens(),
    getAuditLog(),
  ]);

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link
            href="/"
            className="flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Posts
          </Link>
          <Link
            href="/schedules"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Schedules
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-8">
          <h1 className="font-sans text-3xl font-medium tracking-tight text-foreground">
            Enterprise
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Plan: <span className="font-medium">{license.plan}</span>. Custom
            roles, SSO, SCIM and the audit log are unlocked with a license key
            ({" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              LICENSE_KEY
            </code>
            ). The MIT core works fully without one.
          </p>
        </div>

        <EnterpriseManager
          workspaceName={active.name}
          features={features}
          permissions={PERMISSIONS as unknown as string[]}
          presets={ROLE_PRESETS}
          initialRoles={roles as any}
          initialSso={sso as any}
          initialScimTokens={scimTokens as any}
          initialAudit={audit as any}
          scimBaseUrl={`${getBaseUrl()}/api/scim/v2`}
        />
      </main>
    </div>
  );
}
