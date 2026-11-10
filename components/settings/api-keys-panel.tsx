"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Check, Plus, Trash2, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  listApiKeys,
  createApiKey,
  revokeApiKey,
  type ApiKeyListItem,
} from "@/app/actions/api-keys";
import type { ApiKeyType } from "@/lib/api-keys";

export function ApiKeysPanel() {
  const [keys, setKeys] = useState<ApiKeyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<ApiKeyType>("publishable");
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function refresh() {
    try {
      setKeys(await listApiKeys());
    } catch {
      /* unauthenticated / no workspace — leave empty */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate() {
    setCreating(true);
    try {
      const created = await createApiKey(type, name || undefined);
      setFreshKey(created.key);
      setName("");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create key");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    try {
      await revokeApiKey(id);
      toast.success("Key revoked");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to revoke key");
    }
  }

  function copyFresh() {
    if (!freshKey) return;
    navigator.clipboard.writeText(freshKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="border-t border-border pt-6">
      <h2 className="text-lg font-medium text-foreground">API keys</h2>
      <p className="mb-4 mt-1 text-sm text-muted-foreground">
        <span className="font-mono">pk_</span> publishable keys read published
        posts only and are safe in a browser or embed script.{" "}
        <span className="font-mono">sk_</span> secret keys can also read drafts —
        keep them server-side. Keys are hashed; the full value is shown once.
      </p>

      {/* Create */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as ApiKeyType)}>
            <SelectTrigger className="h-10 w-full sm:w-44 bg-muted/40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="publishable">Publishable (pk_)</SelectItem>
              <SelectItem value="secret">Secret (sk_)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 space-y-1">
          <Label>Name (optional)</Label>
          <Input
            className="h-10 bg-muted/40"
            placeholder="e.g. Website, Mobile app"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <Button onClick={handleCreate} disabled={creating} className="h-10">
          {creating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          Create key
        </Button>
      </div>

      {/* Freshly created key (shown once) */}
      {freshKey && (
        <div className="mt-4 rounded-md border border-border bg-muted/30 p-3">
          <p className="mb-2 text-xs text-muted-foreground">
            Copy this key now — you won&apos;t be able to see it again.
          </p>
          <div className="flex gap-2">
            <Input readOnly value={freshKey} className="h-10 bg-background font-mono text-xs" />
            <Button variant="outline" size="icon" className="h-10 w-10" onClick={copyFresh}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="mt-6 space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : keys.length === 0 ? (
          <p className="text-sm text-muted-foreground">No API keys yet.</p>
        ) : (
          keys.map((k) => (
            <div
              key={k.id}
              className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2"
            >
              <div className="flex items-center gap-3 min-w-0">
                <KeyRound className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {k.name}
                  </p>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {k.prefix}…{k.lastFour} ·{" "}
                    {k.type === "publishable" ? "publishable" : "secret"}
                    {k.lastUsedAt
                      ? ` · last used ${new Date(k.lastUsedAt).toLocaleDateString()}`
                      : " · never used"}
                  </p>
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Revoke this key?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Integrations using <span className="font-mono">{k.prefix}…{k.lastFour}</span>{" "}
                      will lose access immediately. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleRevoke(k.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Revoke
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
