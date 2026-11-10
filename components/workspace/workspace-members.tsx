"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Copy, UserPlus, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  setMemberRole,
  removeMember,
  renameWorkspace,
  inviteToWorkspace,
} from "@/app/actions/workspace";

type Member = {
  id: string;
  role: string;
  userId: string;
  name: string;
  email: string;
  image: string | null;
};

const ROLES = ["owner", "admin", "member"] as const;

export function WorkspaceMembers({
  workspaceId,
  workspaceName,
  currentUserId,
  myRole,
  initialMembers,
}: {
  workspaceId: string;
  workspaceName: string;
  currentUserId: string;
  myRole: string;
  initialMembers: Member[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState(workspaceName);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("member");
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const isOwner = myRole === "owner";
  const isAdmin = myRole === "owner" || myRole === "admin";

  function doRename() {
    start(async () => {
      const r = await renameWorkspace(workspaceId, name);
      r.ok ? toast.success("Renamed") : toast.error(r.error || "Failed");
      router.refresh();
    });
  }

  function doInvite() {
    if (!inviteEmail.trim()) return;
    start(async () => {
      const r = await inviteToWorkspace(workspaceId, inviteEmail.trim(), inviteRole);
      if (r.ok) {
        if (r.link) {
          setInviteLink(r.link);
          toast.success("Invite link ready (email is disabled)");
        } else {
          toast.success("Invitation sent");
        }
        setInviteEmail("");
        router.refresh();
      } else {
        toast.error(r.error || "Could not invite");
      }
    });
  }

  return (
    <div className="space-y-10">
      {/* Rename */}
      {isAdmin && (
        <section>
          <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Workspace name
          </h2>
          <div className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} className="max-w-sm" />
            <Button variant="outline" disabled={pending} onClick={doRename}>
              <Pencil className="mr-1 h-4 w-4" /> Save
            </Button>
          </div>
        </section>
      )}

      {/* Invite */}
      {isAdmin && (
        <section>
          <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Invite a member
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="email"
              placeholder="teammate@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="max-w-xs"
            />
            <Select value={inviteRole} onValueChange={setInviteRole}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Button disabled={pending} onClick={doInvite}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><UserPlus className="mr-1 h-4 w-4" /> Invite</>}
            </Button>
          </div>
          {inviteLink && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2">
              <code className="truncate text-xs text-muted-foreground">{inviteLink}</code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(inviteLink);
                  toast.success("Copied");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          )}
        </section>
      )}

      {/* Members */}
      <section>
        <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Members ({initialMembers.length})
        </h2>
        <div className="overflow-hidden rounded-xl border border-border">
          {initialMembers.map((m, i) => (
            <div
              key={m.id}
              className={`flex items-center justify-between gap-4 px-4 py-3 ${i > 0 ? "border-t border-border" : ""}`}
            >
              <div className="flex min-w-0 items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.image || ""} alt="" className="h-8 w-8 rounded-full bg-secondary" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {m.name} {m.userId === currentUserId && <span className="text-muted-foreground">(you)</span>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isOwner && m.userId !== currentUserId ? (
                  <Select
                    value={m.role}
                    onValueChange={(role) =>
                      start(async () => {
                        const r = await setMemberRole(workspaceId, m.userId, role as any);
                        r.ok ? toast.success("Role updated") : toast.error(r.error || "Failed");
                        router.refresh();
                      })
                    }
                  >
                    <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs capitalize text-muted-foreground">
                    {m.role}
                  </span>
                )}
                {isAdmin && m.role !== "owner" && m.userId !== currentUserId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const r = await removeMember(workspaceId, m.userId);
                        r.ok ? toast.success("Removed") : toast.error(r.error || "Failed");
                        router.refresh();
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
