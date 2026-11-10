"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Globe, Loader2, CheckCircle2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getDomains,
  addCustomDomain,
  verifyCustomDomain,
  removeCustomDomain,
  type DomainListItem,
} from "@/app/actions/domains";

export function DomainsPanel() {
  const [domains, setDomains] = useState<DomainListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    try {
      setDomains(await getDomains());
    } catch {
      /* no workspace */
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
  }, []);

  async function add() {
    setBusy("add");
    try {
      await addCustomDomain(input);
      setInput("");
      await refresh();
      toast.success("Domain added — add the TXT record, then verify.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add domain");
    } finally {
      setBusy(null);
    }
  }

  async function verify(id: string) {
    setBusy(id);
    try {
      const { verified } = await verifyCustomDomain(id);
      if (verified) toast.success("Domain verified!");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    setBusy(id);
    try {
      await removeCustomDomain(id);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="border-t border-border pt-6">
      <h2 className="text-lg font-medium text-foreground">Custom domains</h2>
      <p className="mb-4 mt-1 text-sm text-muted-foreground">
        Serve this workspace&apos;s blog on your own domain. Add it, create the
        shown TXT record at your DNS provider, then verify. (Pro plan and above.)
      </p>

      <div className="flex gap-2">
        <Input
          className="h-10 bg-muted/40"
          placeholder="blog.example.com"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <Button onClick={add} disabled={busy !== null || !input.trim()} className="h-10">
          {busy === "add" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Add
        </Button>
      </div>

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : domains.length === 0 ? (
          <p className="text-sm text-muted-foreground">No custom domains yet.</p>
        ) : (
          domains.map((d) => (
            <div key={d.id} className="rounded-md border border-border bg-background p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm font-medium">{d.domain}</span>
                  {d.verified ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle2 className="h-3.5 w-3.5" /> verified
                    </span>
                  ) : (
                    <span className="text-xs text-amber-600">pending</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {!d.verified && (
                    <Button size="sm" variant="outline" onClick={() => verify(d.id)} disabled={busy === d.id}>
                      {busy === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => remove(d.id)} disabled={busy === d.id}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {!d.verified && (
                <div className="mt-2 rounded bg-muted/40 p-2 font-mono text-xs text-muted-foreground">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">TXT {d.txtName} → {d.txtValue}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(d.txtValue);
                        toast.success("Copied");
                      }}
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
