"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  RefreshCw,
  Save,
  Eye,
  EyeOff,
  CheckCircle2,
  Sparkles,
  Plug,
} from "lucide-react";
import { Settings } from "@/lib/db/schema";
import {
  updateSettings,
  verifyLocalModel,
  getProviderModels,
} from "@/app/actions/settings";
import { AI_PROVIDERS, PROVIDER_LIST, type ProviderId } from "@/lib/ai/providers";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ApiKeysPanel } from "@/components/settings/api-keys-panel";
import { DomainsPanel } from "@/components/settings/domains-panel";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ModelOption = { id: string; label: string };

// 'vercel' is the historical value for the Vercel AI Gateway.
function normalizeProvider(value?: string | null): ProviderId {
  if (!value || value === "vercel") return "gateway";
  return (AI_PROVIDERS[value as ProviderId] ? value : "gateway") as ProviderId;
}

export function SettingsForm({
  initialSettings,
}: {
  initialSettings: Settings & {
    vercelAiGatewayKey?: string;
    aiApiKey?: string;
    customAiKey?: string;
  };
}) {
  const [activeTab, setActiveTab] = useState<"ai" | "connection">("ai");

  const [previewUrl, setPreviewUrl] = useState(initialSettings?.previewUrl || "");

  const [provider, setProvider] = useState<ProviderId>(
    normalizeProvider(initialSettings?.aiProvider)
  );
  const spec = AI_PROVIDERS[provider];

  // Unified key / model / baseURL across providers. Seed from whichever legacy
  // field had a value so existing installs keep working.
  const [aiApiKey, setAiApiKey] = useState(
    initialSettings?.aiApiKey ||
      initialSettings?.vercelAiGatewayKey ||
      initialSettings?.customAiKey ||
      ""
  );
  const [aiModel, setAiModel] = useState(
    initialSettings?.aiModel || initialSettings?.customAiModel || ""
  );
  const [aiBaseUrl, setAiBaseUrl] = useState(
    initialSettings?.aiBaseUrl || initialSettings?.customAiUrl || ""
  );

  const [models, setModels] = useState<ModelOption[]>(spec.defaultModels);
  const [loadingModels, setLoadingModels] = useState(false);

  const [showKey, setShowKey] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  // Seed the model list whenever the provider changes.
  useEffect(() => {
    setModels(AI_PROVIDERS[provider].defaultModels);
    if (!AI_PROVIDERS[provider].defaultModels.some((m) => m.id === aiModel)) {
      setAiModel(AI_PROVIDERS[provider].defaultModels[0]?.id || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  const refreshModels = async () => {
    setLoadingModels(true);
    try {
      const list = await getProviderModels(
        provider,
        aiApiKey,
        aiBaseUrl || spec.baseURL
      );
      if (list.length) {
        setModels(list);
        if (!list.some((m) => m.id === aiModel)) setAiModel(list[0].id);
        toast.success(`Loaded ${list.length} models`);
      } else {
        toast.message("No models returned — using the built-in list.");
      }
    } finally {
      setLoadingModels(false);
    }
  };

  const needsBaseUrl = provider === "custom" || spec.allowsCustomBaseURL;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateSettings({
        previewUrl,
        aiProvider: provider,
        aiModel,
        aiApiKey,
        aiBaseUrl: aiBaseUrl || spec.baseURL || null,
        // keep legacy columns populated for the custom provider
        customAiUrl: provider === "custom" ? aiBaseUrl : null,
        customAiModel: provider === "custom" ? aiModel : null,
        customAiKey: provider === "custom" ? aiApiKey : null,
        // gateway key still lives on the user row
        vercelAiGatewayKey: provider === "gateway" ? aiApiKey : null,
      });
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerify = async () => {
    const base = aiBaseUrl || spec.baseURL;
    if (!base || !aiModel) {
      toast.error("Base URL and model are required to verify.");
      return;
    }
    setIsVerifying(true);
    try {
      const verify = await verifyLocalModel(base, aiApiKey, aiModel);
      if (verify.success) {
        toast.success("Connection verified");
        setIsVerified(true);
      } else {
        toast.error(verify.error || "Verification failed");
        setIsVerified(false);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 w-full">
      <aside className="w-full md:w-60 shrink-0">
        <nav className="flex md:flex-col gap-1 rounded-xl border border-border bg-muted/30 p-2">
          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              activeTab === "ai"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Sparkles className="h-4 w-4" /> AI Provider
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("connection")}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              activeTab === "connection"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Plug className="h-4 w-4" /> Connection & API
          </button>
        </nav>
      </aside>

      <div className="flex-1 max-w-2xl">
        <form
          onSubmit={handleSave}
          className="space-y-6 rounded-xl border border-border bg-background p-6"
        >
          {activeTab === "ai" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium text-foreground">AI provider</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose who powers the writing agent. Keys are encrypted at rest.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Provider</Label>
                <Select
                  value={provider}
                  onValueChange={(v) => {
                    setProvider(v as ProviderId);
                    setIsVerified(false);
                  }}
                >
                  <SelectTrigger className="h-10 bg-muted/40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDER_LIST.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {spec.hint && (
                  <p className="text-xs text-muted-foreground">{spec.hint}</p>
                )}
              </div>

              {needsBaseUrl && (
                <div className="space-y-2">
                  <Label htmlFor="ai-base-url">Base URL</Label>
                  <Input
                    id="ai-base-url"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder={spec.baseURL || "http://localhost:11434/v1"}
                    className="h-10 bg-muted/40"
                    value={aiBaseUrl}
                    onChange={(e) => {
                      setAiBaseUrl(e.target.value);
                      setIsVerified(false);
                    }}
                  />
                </div>
              )}

              {spec.requiresKey && (
                <div className="space-y-2">
                  <Label htmlFor="ai-key">
                    API key{" "}
                    {spec.keysUrl && (
                      <a
                        href={spec.keysUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-normal text-accent underline-offset-2 hover:underline"
                      >
                        get one ↗
                      </a>
                    )}
                  </Label>
                  <div className="relative">
                    <Input
                      id="ai-key"
                      type={showKey ? "text" : "password"}
                      autoComplete="new-password"
                      spellCheck={false}
                      placeholder="sk-..."
                      className="h-10 bg-muted/40 pr-10"
                      value={aiApiKey}
                      onChange={(e) => {
                        setAiApiKey(e.target.value);
                        setIsVerified(false);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="ai-model">Model</Label>
                  <button
                    type="button"
                    onClick={refreshModels}
                    disabled={loadingModels}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                  >
                    <RefreshCw
                      className={cn("h-3 w-3", loadingModels && "animate-spin")}
                    />
                    Refresh list
                  </button>
                </div>
                {models.length > 0 ? (
                  <Select value={aiModel} onValueChange={setAiModel}>
                    <SelectTrigger className="h-10 bg-muted/40">
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="ai-model"
                    className="h-10 bg-muted/40"
                    placeholder="model-name"
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                  />
                )}
                {!spec.supportsTools && (
                  <p className="text-xs text-muted-foreground">
                    This provider may not support tool-calling. The editor will use
                    a Markdown fallback for AI writing.
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === "connection" && (
            <div className="space-y-8">
              <div>
                <h2 className="text-lg font-medium text-foreground">
                  Website connection
                </h2>
                <div className="mt-4 space-y-2">
                  <Label htmlFor="previewUrl">Consumer website base URL</Label>
                  <Input
                    id="previewUrl"
                    className="h-10 bg-muted/40"
                    type="url"
                    placeholder="https://example.com"
                    value={previewUrl}
                    onChange={(e) => setPreviewUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Where your blog is published. Used for preview links and
                    on-publish revalidation.
                  </p>
                </div>
              </div>

              <ApiKeysPanel />

              <DomainsPanel />
            </div>
          )}

          <div className="mt-6 flex items-center justify-between border-t border-border pt-6">
            <div>
              {activeTab === "ai" && needsBaseUrl && (
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={isVerifying}
                  className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary/50 disabled:opacity-50"
                >
                  {isVerifying ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : isVerified ? (
                    <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                  ) : null}
                  {isVerified ? "Verified" : "Verify connection"}
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isSaving ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
