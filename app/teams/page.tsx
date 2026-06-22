import { redirect } from "next/navigation";
import { getSession, isFullAdmin, isAdminEmail } from "@/lib/admin";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { InviteDialog } from "@/components/teams/invite-dialog";
import { TeamRowActions } from "@/components/teams/team-row-actions";
import { db } from "@/lib/db";
import { user, invitation } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/blogs/sign-in");
  
  const isFullAdminUser = isFullAdmin(session.user);
  if (!isFullAdminUser) {
    redirect("/");
  }

  const allUsers = await db.select().from(user);
  const pendingInvites = await db
    .select()
    .from(invitation)
    .where(eq(invitation.status, "pending"));

  const combinedUsers = [
    ...allUsers.map((u) => ({ ...u, isInvite: false })),
    ...pendingInvites.map((i) => ({
      id: i.id,
      name: "Pending Invite",
      email: i.email,
      role: i.role,
      isInvite: true,
    })),
  ];

  return (
    <div className="min-h-svh bg-background">
      {/* Header */}
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
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="font-sans text-3xl font-medium tracking-tight text-foreground">
              Teams
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Manage your team members and invite new authors.
            </p>
          </div>
          <InviteDialog />
        </div>

        <div className="mt-10">
          {combinedUsers.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader className="bg-white/60 ">
                  <TableRow className="bg-white/60">
                    <TableHead className="rounded-tl-lg!">Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="rounded-tr-lg! w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {combinedUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        {u.name}{" "}
                        {u.id === session.user.id && (
                          <span className="text-muted-foreground font-normal ml-2">
                            (You)
                          </span>
                        )}
                        {u.isInvite && (
                          <Badge
                            variant="outline"
                            className="ml-2 bg-orange-100/60 text-orange-500 border-orange-200 hover:bg-amber-50"
                          >
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {u.role.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <TeamRowActions
                          user={u}
                          isFullAdmin={isFullAdminUser}
                          isSelf={u.id === session.user.id}
                          isMainAdmin={isAdminEmail(u.email)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center bg-card">
              <Users className="h-8 w-8 text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">
                No team members yet. Invite someone to start collaborating.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
