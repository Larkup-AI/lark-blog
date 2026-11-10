import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSession, isFullAdmin } from "@/lib/admin";
import { deployment } from "@/lib/config";
import { getBillingState } from "@/app/actions/billing";
import { BillingPanel } from "@/components/billing/billing-panel";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const session = await getSession();
  if (!session?.user) redirect("/blogs/sign-in");
  if (!isFullAdmin(session.user)) redirect("/");

  // Billing is a cloud-only concept. Self-host is unlimited and ungated.
  if (!deployment.isCloud()) {
    return (
      <div className="min-h-svh bg-background">
        <header className="border-b border-border">
          <div className="mx-auto flex h-16 max-w-5xl items-center px-6">
            <Link href="/settings" className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-12">
          <h1 className="text-3xl font-medium tracking-tight">Billing</h1>
          <p className="mt-3 max-w-prose text-sm text-muted-foreground">
            This is a self-hosted deployment — there are no plans or usage limits.
            Everything is unlimited. Billing only applies to the hosted Cloud
            (<code>DEPLOYMENT_MODE=cloud</code>).
          </p>
        </main>
      </div>
    );
  }

  const state = await getBillingState();

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Posts
          </Link>
          <Link href="/settings" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Settings
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-medium tracking-tight">Billing &amp; usage</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage your plan and see this workspace&apos;s usage against its limits.
          </p>
        </div>
        <BillingPanel initial={state} />
      </main>
    </div>
  );
}
