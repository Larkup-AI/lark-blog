"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ChevronsUpDown, Plus, Building2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  listMyWorkspaces,
  switchWorkspace,
  createWorkspace,
} from "@/app/actions/workspace";

type Ws = { id: string; name: string; slug: string; role: string };

export function WorkspaceSwitcher() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Ws[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function refresh() {
    const r = await listMyWorkspaces();
    setWorkspaces(r.workspaces as Ws[]);
    setActiveId(r.activeId);
  }

  useEffect(() => {
    refresh();
  }, []);

  const active = workspaces.find((w) => w.id === activeId) ?? workspaces[0];
  if (workspaces.length === 0) return null;

  function onSwitch(id: string) {
    if (id === activeId) return;
    start(async () => {
      const r = await switchWorkspace(id);
      if (r.ok) {
        setActiveId(id);
        router.refresh();
      } else {
        toast.error(r.error || "Could not switch workspace");
      }
    });
  }

  function onCreate() {
    const name = window.prompt("New workspace name");
    if (!name) return;
    start(async () => {
      const r = await createWorkspace(name);
      if (r.ok) {
        toast.success("Workspace created");
        await refresh();
        router.refresh();
      } else {
        toast.error(r.error || "Could not create workspace");
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={pending}
        className="ml-1 inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary/50 disabled:opacity-50"
      >
        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="max-w-[10rem] truncate">{active?.name ?? "Workspace"}</span>
        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Workspaces
        </DropdownMenuLabel>
        {workspaces.map((w) => (
          <DropdownMenuItem
            key={w.id}
            onClick={() => onSwitch(w.id)}
            className="flex items-center justify-between"
          >
            <span className="truncate">{w.name}</span>
            {w.id === active?.id && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onCreate}>
          <Plus className="mr-2 h-4 w-4" /> New workspace
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/workspaces">
            <Settings2 className="mr-2 h-4 w-4" /> Manage members
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
