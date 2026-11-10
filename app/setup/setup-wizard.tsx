"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Check,
  Database,
  HardDrive,
  Mail,
  Sparkles,
  UserCog,
  Loader2,
  ArrowRight,
  PartyPopper,
} from "lucide-react";
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
import { brand } from "@/lib/config";
import { cn } from "@/lib/utils";
import type { SetupState } from "@/lib/setup-types";
import {
  testDatabaseConnection,
  runMigrations,
  createFirstAdmin,
  saveStorageStep,
  testStorageStep,
  saveEmailStep,
  saveAiStep,
  completeSetup,
} from "@/app/actions/setup";

/* Lightweight provider catalogs (kept client-side to avoid pulling server AI deps). */
const STORAGE_PROVIDERS = [
  { id: "uploadthing", label: "UploadThing", hint: "Zero-config hosted uploads" },
  { id: "s3", label: "S3-compatible", hint: "AWS S3, R2, MinIO, Spaces, Neon…" },
  { id: "vercel-blob", label: "Vercel Blob", hint: "Vercel-native object store" },
  { id: "local", label: "Local disk", hint: "Dev / single-server only" },
] as const;

const EMAIL_PROVIDERS = [
  { id: "resend", label: "Resend", hint: "API-key transactional email" },
  { id: "smtp", label: "SMTP", hint: "Any SMTP server (nodemailer)" },
  { id: "none", label: "None", hint: "Disable email — use copyable links" },
] as const;

const AI_PROVIDERS = [
  { id: "gateway", label: "Vercel AI Gateway", key: true, base: false },
  { id: "openai", label: "OpenAI", key: true, base: false },
  { id: "anthropic", label: "Anthropic (Claude)", key: true, base: false },
  { id: "google", label: "Google (Gemini)", key: true, base: false },
  { id: "openrouter", label: "OpenRouter", key: true, base: false },
  { id: "xai", label: "xAI (Grok)", key: true, base: false },
  { id: "deepseek", label: "DeepSeek", key: true, base: false },
  { id: "mistral", label: "Mistral", key: true, base: false },
  { id: "groq", label: "Groq", key: true, base: false },
  { id: "ollama", label: "Ollama (local)", key: false, base: true },
  { id: "lmstudio", label: "LM Studio (local)", key: false, base: true },
  { id: "custom", label: "Custom (OpenAI-compatible)", key: true, base: true },
] as const;

type StepDef = { id: string; label: string; icon: React.ElementType };

export function SetupWizard({ initialState }: { initialState: SetupState }) {
  const router = useRouter();
  const needsAdmin = !initialState.hasAdmin;

  const steps: StepDef[] = [
    { id: "db", label: "Database", icon: Database },
    ...(needsAdmin
      ? [{ id: "admin", label: "Admin", icon: UserCog }]
      : []),
    { id: "storage", label: "Storage", icon: HardDrive },
    { id: "email", label: "Email", icon: Mail },
    { id: "ai", label: "AI", icon: Sparkles },
    { id: "done", label: "Finish", icon: PartyPopper },
  ];

  const [stepIdx, setStepIdx] = useState(0);
  const step = steps[stepIdx];
  const next = () => setStepIdx((i) => Math.min(i + 1, steps.length - 1));

  return (
    <main className="min-h-svh bg-background">
      <div className="mx-auto flex max-w-3xl flex-col px-6 py-12">
        {/* Brand */}
        <div className="mb-8 flex items-center gap-2">
          <span className="font-serif text-2xl tracking-tight text-foreground">
            {brand.shortName}
          </span>
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Setup
          </span>
        </div>

        {/* Stepper */}
        <ol className="mb-10 flex flex-wrap items-center gap-x-2 gap-y-3">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const active = i === stepIdx;
            const done = i < stepIdx;
            return (
              <li key={s.id} className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border text-xs transition-colors",
                    active && "border-foreground bg-foreground text-background",
                    done && "border-emerald-500 bg-emerald-500 text-white",
                    !active && !done && "border-border text-muted-foreground",
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {s.label}
                </span>
                {i < steps.length - 1 && (
                  <span className="mx-1 h-px w-5 bg-border" />
                )}
              </li>
            );
          })}
        </ol>

        <div className="rounded-xl border border-border p-6">
          {step.id === "db" && (
            <DatabaseStep initialDbOk={initialState.dbOk} onNext={next} />
          )}
          {step.id === "admin" && <AdminStep onNext={next} />}
          {step.id === "storage" && <StorageStep onNext={next} />}
          {step.id === "email" && <EmailStep onNext={next} />}
          {step.id === "ai" && <AiStep onNext={next} />}
          {step.id === "done" && (
            <FinishStep
              onDone={async () => {
                const r = await completeSetup();
                if (r.ok) {
                  toast.success("Setup complete");
                  router.push("/");
                  router.refresh();
                } else {
                  toast.error(r.error || "Could not finish setup");
                }
              }}
            />
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          You can change any of these later in Settings. Secrets are encrypted at
          rest.
        </p>
      </div>
    </main>
  );
}

/* --------------------------------- shared --------------------------------- */
function StepHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-medium tracking-tight text-foreground">
        {title}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function useBusy() {
  const [busy, setBusy] = useState(false);
  async function run<T>(fn: () => Promise<T>) {
    setBusy(true);
    try {
      return await fn();
    } finally {
      setBusy(false);
    }
  }
  return { busy, run };
}

/* -------------------------------- DB step -------------------------------- */
function DatabaseStep({
  initialDbOk,
  onNext,
}: {
  initialDbOk: boolean;
  onNext: () => void;
}) {
  const { busy, run } = useBusy();
  const [dbOk, setDbOk] = useState(initialDbOk);
  const [migrated, setMigrated] = useState(false);

  return (
    <div>
      <StepHeader
        title="Database"
        desc="Postgres is configured through DATABASE_URL. Test the connection, then apply the schema migrations."
      />
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <Database className="h-4 w-4 text-muted-foreground" />
            Connection
            {dbOk && <Check className="h-4 w-4 text-emerald-500" />}
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() =>
              run(async () => {
                const r = await testDatabaseConnection();
                setDbOk(r.ok);
                r.ok
                  ? toast.success("Database reachable")
                  : toast.error(r.error || "Connection failed");
              })
            }
          >
            Test connection
          </Button>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            Schema migrations
            {migrated && <Check className="h-4 w-4 text-emerald-500" />}
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={busy || !dbOk}
            onClick={() =>
              run(async () => {
                const r = await runMigrations();
                setMigrated(r.ok);
                r.ok
                  ? toast.success("Migrations applied")
                  : toast.error(r.error || "Migration failed");
              })
            }
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Run migrations"}
          </Button>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={onNext} disabled={!dbOk}>
          Continue <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------- Admin step ------------------------------- */
function AdminStep({ onNext }: { onNext: () => void }) {
  const { busy, run } = useBusy();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div>
      <StepHeader
        title="Create your admin account"
        desc="This first account is the workspace owner and full administrator."
      />
      <div className="space-y-4">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Password (8+ characters)">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
      </div>
      <div className="mt-6 flex justify-end">
        <Button
          disabled={busy}
          onClick={() =>
            run(async () => {
              const r = await createFirstAdmin({ name, email, password });
              if (r.ok) {
                toast.success("Admin account created");
                onNext();
              } else {
                toast.error(r.error || "Could not create account");
              }
            })
          }
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------ Storage step ------------------------------ */
function StorageStep({ onNext }: { onNext: () => void }) {
  const { busy, run } = useBusy();
  const [provider, setProvider] = useState<string>("uploadthing");
  const [cfg, setCfg] = useState<Record<string, string>>({});
  const set = (k: string, v: string) => setCfg((c) => ({ ...c, [k]: v }));

  return (
    <div>
      <StepHeader
        title="Object storage"
        desc="Where uploaded images and videos are stored. One S3 adapter covers AWS S3, Cloudflare R2, MinIO, DigitalOcean Spaces, Supabase and Neon Object Storage."
      />
      <ProviderGrid
        options={STORAGE_PROVIDERS as any}
        value={provider}
        onChange={setProvider}
      />

      {provider === "s3" && (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Bucket">
            <Input value={cfg.bucket || ""} onChange={(e) => set("bucket", e.target.value)} />
          </Field>
          <Field label="Region">
            <Input value={cfg.region || ""} onChange={(e) => set("region", e.target.value)} placeholder="auto / us-east-1" />
          </Field>
          <Field label="Endpoint (S3-compatible)">
            <Input value={cfg.endpoint || ""} onChange={(e) => set("endpoint", e.target.value)} placeholder="https://… (R2/MinIO/Neon)" />
          </Field>
          <Field label="Public base URL (CDN, optional)">
            <Input value={cfg.publicBaseUrl || ""} onChange={(e) => set("publicBaseUrl", e.target.value)} />
          </Field>
          <Field label="Access key ID">
            <Input value={cfg.accessKeyId || ""} onChange={(e) => set("accessKeyId", e.target.value)} />
          </Field>
          <Field label="Secret access key">
            <Input type="password" value={cfg.secretAccessKey || ""} onChange={(e) => set("secretAccessKey", e.target.value)} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={cfg.forcePathStyle === "true"}
              onChange={(e) => set("forcePathStyle", e.target.checked ? "true" : "false")}
            />
            Force path-style (MinIO & most S3-compatible stores)
          </label>
        </div>
      )}

      <div className="mt-6 flex justify-between">
        {provider === "s3" ? (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              run(async () => {
                const r = await testStorageStep({ provider: "s3", config: cfg });
                r.ok ? toast.success("Credentials OK") : toast.error(r.error || "Test failed");
              })
            }
          >
            Test credentials
          </Button>
        ) : (
          <span />
        )}
        <Button
          disabled={busy}
          onClick={() =>
            run(async () => {
              const r = await saveStorageStep({ provider: provider as any, config: provider === "s3" ? cfg : undefined });
              if (r.ok) onNext();
              else toast.error(r.error || "Could not save");
            })
          }
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save & continue"}
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------- Email step ------------------------------- */
function EmailStep({ onNext }: { onNext: () => void }) {
  const { busy, run } = useBusy();
  const [provider, setProvider] = useState<string>("none");
  const [cfg, setCfg] = useState<Record<string, string>>({});
  const set = (k: string, v: string) => setCfg((c) => ({ ...c, [k]: v }));

  return (
    <div>
      <StepHeader
        title="Email"
        desc="Used for invitations and password resets. Choose 'None' to run without email — invites become copyable links."
      />
      <ProviderGrid
        options={EMAIL_PROVIDERS as any}
        value={provider}
        onChange={setProvider}
      />

      {provider === "resend" && (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Resend API key">
            <Input type="password" value={cfg.apiKey || ""} onChange={(e) => set("apiKey", e.target.value)} />
          </Field>
          <Field label="From address">
            <Input value={cfg.from || ""} onChange={(e) => set("from", e.target.value)} placeholder="Name <noreply@domain.com>" />
          </Field>
        </div>
      )}
      {provider === "smtp" && (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Host"><Input value={cfg.host || ""} onChange={(e) => set("host", e.target.value)} /></Field>
          <Field label="Port"><Input value={cfg.port || ""} onChange={(e) => set("port", e.target.value)} placeholder="587" /></Field>
          <Field label="User"><Input value={cfg.user || ""} onChange={(e) => set("user", e.target.value)} /></Field>
          <Field label="Password"><Input type="password" value={cfg.pass || ""} onChange={(e) => set("pass", e.target.value)} /></Field>
          <Field label="From address"><Input value={cfg.from || ""} onChange={(e) => set("from", e.target.value)} /></Field>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={cfg.secure === "true"} onChange={(e) => set("secure", e.target.checked ? "true" : "false")} />
            Use TLS (port 465)
          </label>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <Button
          disabled={busy}
          onClick={() =>
            run(async () => {
              const r = await saveEmailStep({ provider: provider as any, config: cfg });
              if (r.ok) onNext();
              else toast.error(r.error || "Could not save");
            })
          }
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save & continue"}
        </Button>
      </div>
    </div>
  );
}

/* --------------------------------- AI step -------------------------------- */
function AiStep({ onNext }: { onNext: () => void }) {
  const { busy, run } = useBusy();
  const [provider, setProvider] = useState<string>("gateway");
  const spec = AI_PROVIDERS.find((p) => p.id === provider)!;
  const [cfg, setCfg] = useState<Record<string, string>>({});
  const set = (k: string, v: string) => setCfg((c) => ({ ...c, [k]: v }));

  return (
    <div>
      <StepHeader
        title="AI provider"
        desc="Powers the writing assistant. Pick a default here; each author can override it in Settings. Keys are encrypted at rest."
      />
      <Field label="Provider">
        <Select value={provider} onValueChange={(v) => { setProvider(v); setCfg({}); }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {AI_PROVIDERS.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {spec.key && (
          <Field label="API key">
            <Input type="password" value={cfg.apiKey || ""} onChange={(e) => set("apiKey", e.target.value)} />
          </Field>
        )}
        {spec.base && (
          <Field label="Base URL">
            <Input value={cfg.baseUrl || ""} onChange={(e) => set("baseUrl", e.target.value)} placeholder="http://localhost:11434/v1" />
          </Field>
        )}
        <Field label="Default model (optional)">
          <Input value={cfg.model || ""} onChange={(e) => set("model", e.target.value)} placeholder="leave blank for provider default" />
        </Field>
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          disabled={busy}
          onClick={() =>
            run(async () => {
              const r = await saveAiStep({ provider, config: cfg });
              if (r.ok) onNext();
              else toast.error(r.error || "Could not save");
            })
          }
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save & continue"}
        </Button>
      </div>
    </div>
  );
}

/* -------------------------------- Finish step ------------------------------ */
function FinishStep({ onDone }: { onDone: () => void }) {
  const { busy, run } = useBusy();
  return (
    <div className="text-center">
      <PartyPopper className="mx-auto h-10 w-10 text-foreground" />
      <h2 className="mt-4 text-lg font-medium tracking-tight text-foreground">
        You&apos;re all set
      </h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        Your workspace is configured. Head to the dashboard to write your first
        post. You can revisit any provider in Settings.
      </p>
      <Button className="mt-6" disabled={busy} onClick={() => run(onDone)}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Go to dashboard"}
      </Button>
    </div>
  );
}

/* -------------------------------- primitives ------------------------------- */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ProviderGrid({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string; hint: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            "rounded-lg border px-4 py-3 text-left transition-colors",
            value === o.id
              ? "border-foreground bg-secondary"
              : "border-border hover:bg-secondary/50",
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">{o.label}</span>
            {value === o.id && <Check className="h-4 w-4 text-foreground" />}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{o.hint}</p>
        </button>
      ))}
    </div>
  );
}
