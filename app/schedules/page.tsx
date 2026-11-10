import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/admin";
import { getActiveWorkspace } from "@/lib/workspace";
import { listSchedules, listRecentJobs } from "@/app/actions/schedules";
import { SchedulesManager } from "@/components/schedules/schedules-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Schedules" };

export default async function SchedulesPage() {
  const session = await getSession();
  if (!session?.user) redirect("/blogs/sign-in");

  const active = await getActiveWorkspace();
  if (!active) redirect("/");

  const { schedules, canAutoPublish, limitReached } = await listSchedules();
  const jobs = await listRecentJobs(20);

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
            href="/enterprise"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Enterprise
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-8">
          <h1 className="font-sans text-3xl font-medium tracking-tight text-foreground">
            Scheduled generation
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Have the AI draft posts automatically on a schedule. Drafts land in
            your posts for review; auto-publish is available on Enterprise.
          </p>
        </div>

        <SchedulesManager
          initialSchedules={schedules as any}
          initialJobs={jobs as any}
          canAutoPublish={canAutoPublish}
          limitReached={limitReached}
        />
      </main>
    </div>
  );
}
