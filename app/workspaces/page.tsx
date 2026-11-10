import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/admin";
import { getActiveWorkspace } from "@/lib/workspace";
import { listWorkspaceMembers } from "@/app/actions/workspace";
import { WorkspaceMembers } from "@/components/workspace/workspace-members";

export const dynamic = "force-dynamic";
export const metadata = { title: "Workspace" };

export default async function WorkspacesPage() {
  const session = await getSession();
  if (!session?.user) redirect("/blogs/sign-in");

  const active = await getActiveWorkspace();
  if (!active) redirect("/");

  const { members, myRole } = await listWorkspaceMembers(active.id);

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-6">
          <Link
            href="/"
            className="flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Posts
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-8">
          <h1 className="font-sans text-3xl font-medium tracking-tight text-foreground">
            {active.name}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage members and roles for this workspace.
          </p>
        </div>

        <WorkspaceMembers
          workspaceId={active.id}
          workspaceName={active.name}
          currentUserId={session.user.id}
          myRole={(myRole as string) || "member"}
          initialMembers={(members as any) || []}
        />
      </main>
    </div>
  );
}
