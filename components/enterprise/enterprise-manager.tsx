"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Shield,
  KeyRound,
  Users,
  ScrollText,
  Plus,
  Trash2,
  Loader2,
  Copy,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createRole,
  deleteRole,
  createOidcConnection,
  setSsoEnabled,
  removeSsoConnection,
  createScimTokenAction,
  deleteScimToken,
} from "@/app/actions/ee";

type Features = {
  customRoles: boolean;
  sso: boolean;
  scim: boolean;
  auditLog: boolean;
};

export function EnterpriseManager({
  workspaceName,
  features,
  permissions,
  presets,
  initialRoles,
  initialSso,
  initialScimTokens,
  initialAudit,
  scimBaseUrl,
}: {
  workspaceName: string;
  features: Features;
  permissions: string[];
  presets: Record<string, string[]>;
  initialRoles: any[];
  initialSso: any[];
  initialScimTokens: any[];
  initialAudit: { events: any[]; actions: string[]; enabled: boolean };
  scimBaseUrl: string;
}) {
  return (
    <Tabs defaultValue="roles" className="w-full">
      <TabsList>
        <TabsTrigger value="roles">
          <Shield className="mr-2 h-4 w-4" /> Roles
        </TabsTrigger>
        <TabsTrigger value="sso">
          <KeyRound className="mr-2 h-4 w-4" /> SSO
        </TabsTrigger>
        <TabsTrigger value="scim">
          <Users className="mr-2 h-4 w-4" /> SCIM
        </TabsTrigger>
        <TabsTrigger value="audit">
          <ScrollText className="mr-2 h-4 w-4" /> Audit log
        </TabsTrigger>
      </TabsList>

      <TabsContent value="roles" className="mt-6">
        <RolesTab
          enabled={features.customRoles}
          permissions={permissions}
          presets={presets}
          initialRoles={initialRoles}
        />
      </TabsContent>
      <TabsContent value="sso" className="mt-6">
        <SsoTab enabled={features.sso} initialSso={initialSso} />
      </TabsContent>
      <TabsContent value="scim" className="mt-6">
        <ScimTab
          enabled={features.scim}
          initialTokens={initialScimTokens}
          scimBaseUrl={scimBaseUrl}
        />
      </TabsContent>
      <TabsContent value="audit" className="mt-6">
        <AuditTab enabled={features.auditLog} initialAudit={initialAudit} />
      </TabsContent>
    </Tabs>
  );
}

function UpgradeNotice({ feature }: { feature: string }) {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-dashed border-border bg-muted/40 p-4">
      <Lock className="mt-0.5 h-4 w-4 text-muted-foreground" />
      <div className="text-sm">
        <p className="font-medium">{feature} is an Enterprise feature</p>
        <p className="text-muted-foreground">
          Set a valid <code className="text-xs">LICENSE_KEY</code> to enable it.
          You can still see how it works below; changes are disabled.
        </p>
      </div>
    </div>
  );
}

/* --------------------------------- Roles --------------------------------- */

function RolesTab({
  enabled,
  permissions,
  presets,
  initialRoles,
}: {
  enabled: boolean;
  permissions: string[];
  presets: Record<string, string[]>;
  initialRoles: any[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function applyPreset(p: string) {
    setSelected(new Set(presets[p] ?? []));
  }

  function togglePerm(p: string) {
    const next = new Set(selected);
    next.has(p) ? next.delete(p) : next.add(p);
    setSelected(next);
  }

  function submit() {
    if (!name.trim()) return toast.error("Role name is required.");
    startTransition(async () => {
      const res = await createRole({
        name,
        description,
        permissions: [...selected],
      });
      if ((res as any).error) {
        toast.error((res as any).error);
        return;
      }
      toast.success("Role created.");
      setOpen(false);
      setName("");
      setDescription("");
      setSelected(new Set());
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm("Delete this role? Members keep their base role.")) return;
    startTransition(async () => {
      const res = await deleteRole(id);
      if ((res as any).error) {
        toast.error((res as any).error);
        return;
      }
      toast.success("Role deleted.");
      router.refresh();
    });
  }

  return (
    <div>
      {!enabled && <UpgradeNotice feature="Custom roles / RBAC" />}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Define custom roles with fine-grained permissions on top of the core
          owner / admin / member roles.
        </p>
        <Button size="sm" onClick={() => setOpen(true)} disabled={!enabled}>
          <Plus className="mr-2 h-4 w-4" /> New role
        </Button>
      </div>

      {initialRoles.length === 0 ? (
        <p className="text-sm text-muted-foreground">No custom roles yet.</p>
      ) : (
        <div className="space-y-3">
          {initialRoles.map((r) => (
            <div
              key={r.id}
              className="flex items-start justify-between rounded-lg border border-border p-4"
            >
              <div>
                <p className="font-medium">{r.name}</p>
                {r.description && (
                  <p className="text-sm text-muted-foreground">
                    {r.description}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-1">
                  {((r.permissions as string[]) ?? []).map((p) => (
                    <Badge key={p} variant="secondary" className="text-xs">
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => remove(r.id)}
                disabled={!enabled || pending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New custom role</DialogTitle>
            <DialogDescription>
              Start from a preset, then adjust permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.keys(presets).map((p) => (
                <Button
                  key={p}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset(p)}
                >
                  {p}
                </Button>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label>Permissions</Label>
              <div className="grid grid-cols-2 gap-2">
                {permissions.map((p) => (
                  <label
                    key={p}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={selected.has(p)}
                      onCheckedChange={() => togglePerm(p)}
                    />
                    <span className="font-mono text-xs">{p}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={pending}>
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------------------------- SSO ---------------------------------- */

function SsoTab({ enabled, initialSso }: { enabled: boolean; initialSso: any[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    label: "",
    domain: "",
    discoveryUrl: "",
    clientId: "",
    clientSecret: "",
  });

  function submit() {
    if (!form.discoveryUrl || !form.clientId)
      return toast.error("Discovery URL and Client ID are required.");
    startTransition(async () => {
      const res = await createOidcConnection(form);
      if ((res as any).error) {
        toast.error((res as any).error);
        return;
      }
      toast.success("OIDC connection added. Enable it to start using it.");
      setOpen(false);
      setForm({ label: "", domain: "", discoveryUrl: "", clientId: "", clientSecret: "" });
      router.refresh();
    });
  }

  function toggle(id: string, next: boolean) {
    startTransition(async () => {
      const res = await setSsoEnabled(id, next);
      if ((res as any).error) {
        toast.error((res as any).error);
        return;
      }
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm("Delete this SSO connection?")) return;
    startTransition(async () => {
      const res = await removeSsoConnection(id);
      if ((res as any).error) {
        toast.error((res as any).error);
        return;
      }
      toast.success("Connection deleted.");
      router.refresh();
    });
  }

  return (
    <div>
      {!enabled && <UpgradeNotice feature="SSO (SAML / OIDC)" />}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Let members sign in through your identity provider via OIDC
          (Okta, Azure AD, Google Workspace, Auth0). Routed by email domain.
        </p>
        <Button size="sm" onClick={() => setOpen(true)} disabled={!enabled}>
          <Plus className="mr-2 h-4 w-4" /> Add OIDC
        </Button>
      </div>

      {initialSso.length === 0 ? (
        <p className="text-sm text-muted-foreground">No SSO connections yet.</p>
      ) : (
        <div className="space-y-3">
          {initialSso.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-lg border border-border p-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{c.label}</span>
                  <Badge variant="outline" className="uppercase text-xs">
                    {c.type}
                  </Badge>
                  {c.enabled ? (
                    <Badge>enabled</Badge>
                  ) : (
                    <Badge variant="secondary">disabled</Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {c.domain ? `@${c.domain}` : "no domain"} · {c.issuer}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={c.enabled}
                  onCheckedChange={(v) => toggle(c.id, v)}
                  disabled={!enabled || pending}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(c.id)}
                  disabled={!enabled || pending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add OIDC connection</DialogTitle>
            <DialogDescription>
              The connection is tested against the discovery document before it
              is saved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Label</Label>
              <Input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="Okta"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email domain</Label>
              <Input
                value={form.domain}
                onChange={(e) => setForm({ ...form, domain: e.target.value })}
                placeholder="acme.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Discovery URL (issuer)</Label>
              <Input
                value={form.discoveryUrl}
                onChange={(e) =>
                  setForm({ ...form, discoveryUrl: e.target.value })
                }
                placeholder="https://acme.okta.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Client ID</Label>
              <Input
                value={form.clientId}
                onChange={(e) => setForm({ ...form, clientId: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Client secret</Label>
              <Input
                type="password"
                value={form.clientSecret}
                onChange={(e) =>
                  setForm({ ...form, clientSecret: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={pending}>
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Test & save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------------------------- SCIM --------------------------------- */

function ScimTab({
  enabled,
  initialTokens,
  scimBaseUrl,
}: {
  enabled: boolean;
  initialTokens: any[];
  scimBaseUrl: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [newToken, setNewToken] = useState<string | null>(null);

  function create() {
    startTransition(async () => {
      const res = await createScimTokenAction(name || "SCIM token");
      if ((res as any).error) {
        toast.error((res as any).error);
        return;
      }
      setNewToken((res as any).token);
      setName("");
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm("Revoke this SCIM token?")) return;
    startTransition(async () => {
      const res = await deleteScimToken(id);
      if ((res as any).error) {
        toast.error((res as any).error);
        return;
      }
      toast.success("Token revoked.");
      router.refresh();
    });
  }

  return (
    <div>
      {!enabled && <UpgradeNotice feature="SCIM provisioning" />}
      <p className="mb-4 text-sm text-muted-foreground">
        Point your IdP's SCIM 2.0 integration at this base URL and authenticate
        with a token below.
      </p>
      <div className="mb-6 flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-3">
        <code className="flex-1 truncate text-sm">{scimBaseUrl}</code>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            navigator.clipboard.writeText(scimBaseUrl);
            toast.success("Copied.");
          }}
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>

      <div className="mb-4 flex items-end gap-2">
        <div className="flex-1 space-y-1.5">
          <Label>New token name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Okta production"
            disabled={!enabled}
          />
        </div>
        <Button onClick={create} disabled={!enabled || pending}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create token
        </Button>
      </div>

      {newToken && (
        <div className="mb-6 rounded-lg border border-border bg-muted/40 p-3">
          <p className="mb-1 text-sm font-medium">
            Copy this token now — it won't be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate text-sm">{newToken}</code>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                navigator.clipboard.writeText(newToken);
                toast.success("Copied.");
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {initialTokens.length === 0 ? (
        <p className="text-sm text-muted-foreground">No SCIM tokens yet.</p>
      ) : (
        <div className="space-y-2">
          {initialTokens.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-lg border border-border p-3"
            >
              <div>
                <p className="text-sm font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t.lastUsedAt
                    ? `Last used ${new Date(t.lastUsedAt).toLocaleString()}`
                    : "Never used"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => remove(t.id)}
                disabled={pending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* --------------------------------- Audit --------------------------------- */

function AuditTab({
  enabled,
  initialAudit,
}: {
  enabled: boolean;
  initialAudit: { events: any[]; actions: string[] };
}) {
  return (
    <div>
      {!enabled && <UpgradeNotice feature="Audit log" />}
      <p className="mb-4 text-sm text-muted-foreground">
        An append-only record of who did what, when. Secrets are never recorded.
      </p>
      {initialAudit.events.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {enabled ? "No audit events yet." : "Enable the audit log to start recording events."}
        </p>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border">
          {initialAudit.events.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
            >
              <div className="min-w-0">
                <span className="font-mono text-xs">{e.action}</span>
                <span className="ml-2 text-muted-foreground">
                  {e.actorEmail || e.actorId || "system"}
                  {e.targetType ? ` → ${e.targetType}:${e.targetId}` : ""}
                </span>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {new Date(e.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
