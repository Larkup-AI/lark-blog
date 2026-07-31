"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Copy,
  RefreshCw,
  Save,
  Eye,
  EyeOff,
  Check,
  CheckCircle2,
} from "lucide-react";
import { Settings } from "@/lib/db/schema";
import {
  updateSettings,
  generateApiKey,
  verifyLocalModel,
} from "@/app/actions/settings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function SettingsForm({
  initialSettings,
}: {
  initialSettings: Settings & { vercelAiGatewayKey?: string };
}) {
  const [activeTab, setActiveTab] = useState<"ai" | "connection">("ai");

  const [previewUrl, setPreviewUrl] = useState(
    initialSettings?.previewUrl || "",
  );
  const [apiKey, setApiKey] = useState(initialSettings?.apiKey || "");

  const [aiProvider, setAiProvider] = useState(
    initialSettings?.aiProvider || "vercel",
  );
  const [vercelAiGatewayKey, setVercelAiGatewayKey] = useState(
    initialSettings?.vercelAiGatewayKey || "",
  );
  const [customAiUrl, setCustomAiUrl] = useState(
    initialSettings?.customAiUrl || "",
  );
  const [customAiKey, setCustomAiKey] = useState(
    initialSettings?.customAiKey || "",
  );
  const [customAiModel, setCustomAiModel] = useState(
    initialSettings?.customAiModel || "",
  );

  const [showCustomKey, setShowCustomKey] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (aiProvider === "custom") {
        const verify = await verifyLocalModel(
          customAiUrl,
          customAiKey,
          customAiModel,
        );
        if (!verify.success) {
          toast.error(verify.error || "Verification failed");
          setIsSaving(false);
          return;
        }
        setIsVerified(true);
      }

      await updateSettings(
        previewUrl,
        aiProvider,
        customAiUrl,
        customAiKey,
        customAiModel,
        vercelAiGatewayKey,
      );
      toast.success("Settings saved successfully");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerify = async () => {
    if (!customAiUrl || !customAiModel) {
      toast.error("URL and Model are required for verification");
      return;
    }
    setIsVerifying(true);
    try {
      const verify = await verifyLocalModel(
        customAiUrl,
        customAiKey,
        customAiModel,
      );
      if (verify.success) {
        toast.success("Connection verified successfully!");
        setIsVerified(true);
      } else {
        toast.error(verify.error || "Verification failed");
        setIsVerified(false);
      }
    } catch (error: any) {
      toast.error("Verification error: " + error.message);
      setIsVerified(false);
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text");
    if (!pasted) return;

    let urlFound = customAiUrl;
    let keyFound = customAiKey;
    let modelFound = customAiModel;
    let updated = false;

    const urlMatch =
      pasted.match(
        /(?:BASE_URL|OLLAMA_HOST|OPENAI_BASE_URL|API_URL|URL)\s*=\s*(https?:\/\/[^\s"'`]+)/i,
      ) || pasted.match(/https?:\/\/[^\s"'`]+/);
    if (urlMatch) {
      urlFound = urlMatch[urlMatch.length > 1 ? 1 : 0];
      updated = true;
    }

    const keyPatternMatch =
      pasted.match(/(?:API_KEY|OPENAI_API_KEY|TOKEN|KEY)\s*=\s*([^\s"'`]+)/i) ||
      pasted.match(/sk-[a-zA-Z0-9_-]+/);
    if (keyPatternMatch) {
      const candidate = keyPatternMatch[keyPatternMatch.length > 1 ? 1 : 0];
      if (candidate && !candidate.startsWith("http")) {
        keyFound = candidate;
        updated = true;
      }
    }

    const modelPatternMatch =
      pasted.match(/(?:MODEL_NAME|MODEL|CHAT_MODEL)\s*=\s*([^\s"'`]+)/i) ||
      pasted.match(
        /(llama|mistral|deepseek|qwen|gemma|phi|mixtral|claude|gpt|gemini|dolphin|wizard|solar|neural|hermes)[a-zA-Z0-9_.:/-]*/i,
      );
    if (modelPatternMatch) {
      modelFound = modelPatternMatch[modelPatternMatch.length > 1 ? 1 : 0];
      updated = true;
    } else {
      const fallbackModel = pasted
        .split(/[\s\n]+/)
        .find(
          (word) =>
            word.length > 3 &&
            (word.includes("-") || word.includes(":")) &&
            !word.startsWith("http") &&
            !word.startsWith("sk-") &&
            !/[=]/.test(word),
        );
      if (fallbackModel && !urlFound.includes(fallbackModel)) {
        modelFound = fallbackModel;
        updated = true;
      }
    }

    if (updated) {
      e.preventDefault();
      setCustomAiUrl(urlFound);
      setCustomAiKey(keyFound);
      setCustomAiModel(modelFound);
      setIsVerified(false);
      toast.success("Fields auto-filled from pasted text ✓");
    }
  };

  const handleGenerateKey = async () => {
    setIsGenerating(true);
    try {
      const newKey = await generateApiKey();
      setApiKey(newKey);
      toast.success("New API key generated and team notified!");
    } catch (error) {
      toast.error("Failed to generate API key");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 w-full">
      {/* Sidebar */}
      <aside className="w-full md:w-64 shrink-0">
        <nav className="flex md:flex-col space-x-2 md:space-x-0 md:space-y-1 bg-muted/30 p-2 rounded-xl border border-border">
          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            className={cn(
              "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
              activeTab === "ai"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            AI Provider
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("connection")}
            className={cn(
              "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
              activeTab === "connection"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            Team Connection
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 max-w-2xl">
        <form
          onSubmit={handleSave}
          className="space-y-6 bg-background p-6 rounded-xl border border-border"
        >
          {activeTab === "ai" && (
            <div>
              <h2 className="text-lg font-medium text-foreground mb-4">
                AI Provider Settings
              </h2>
              <div className="space-y-6">
                <RadioGroup
                  value={aiProvider}
                  onValueChange={(val) => {
                    setAiProvider(val);
                    setIsVerified(false);
                  }}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="vercel" id="vercel" />
                    <Label htmlFor="vercel" className="cursor-pointer">
                      Vercel AI Gateway (Default)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="custom" id="custom" />
                    <Label htmlFor="custom" className="cursor-pointer">
                      Custom Local AI Model
                    </Label>
                  </div>
                </RadioGroup>

                {aiProvider === "vercel" && (
                  <div className="space-y-4 p-4 border border-dashed border-border rounded-lg bg-muted/30">
                    <div className="space-y-2">
                      <Label htmlFor="vercelAiGatewayKey">
                        Vercel AI Gateway API Key{" "}
                        <span className="text-muted-foreground font-normal">
                          (Personal)
                        </span>
                      </Label>
                      <Input
                        id="vercelAiGatewayKey"
                        type="password"
                        className="h-9 bg-muted/50"
                        placeholder="vck_..."
                        value={vercelAiGatewayKey}
                        onChange={(e) => setVercelAiGatewayKey(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        This key is saved securely for your account and is used
                        to authenticate with your Vercel AI Gateway.
                      </p>
                    </div>
                  </div>
                )}

                {aiProvider === "custom" && (
                  <div
                    className="space-y-4 p-4 border border-dashed border-border rounded-lg bg-muted/30 relative group"
                    onPaste={handlePaste}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        💡 Tip: Copy and paste any text containing URL, API Key
                        or model name
                      </span>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="custom-ai-url">Base URL</Label>
                      <Input
                        id="custom-ai-url"
                        name="custom-ai-url"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        placeholder="http://localhost:11434/v1"
                        className="h-9 bg-muted/50"
                        value={customAiUrl}
                        onPaste={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          setCustomAiUrl(e.target.value);
                          setIsVerified(false);
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="custom-ai-model">Model Name</Label>
                      <Input
                        id="custom-ai-model"
                        name="custom-ai-model"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        placeholder="llama3"
                        className="h-9 bg-muted/50"
                        value={customAiModel}
                        onPaste={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          setCustomAiModel(e.target.value);
                          setIsVerified(false);
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="custom-ai-key">
                        API Key{" "}
                        <span className="text-muted-foreground font-normal">
                          (Optional)
                        </span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="custom-ai-key"
                          name="custom-ai-key"
                          type={showCustomKey ? "text" : "password"}
                          autoComplete="new-password"
                          autoCorrect="off"
                          autoCapitalize="off"
                          spellCheck={false}
                          placeholder="sk-..."
                          className="h-9 bg-muted/50"
                          value={customAiKey}
                          onPaste={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            setCustomAiKey(e.target.value);
                            setIsVerified(false);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowCustomKey(!showCustomKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showCustomKey ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "connection" && (
            <div className="space-y-8">
              <div>
                <h2 className="text-lg font-medium text-foreground mb-4">
                  General Connection Settings
                </h2>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="previewUrl">
                      Consumer Website Base URL (for Previews)
                    </Label>
                    <Input
                      id="previewUrl"
                      className="h-9 bg-muted/50"
                      type="url"
                      placeholder="https://larkup.com"
                      value={previewUrl}
                      onChange={(e) => setPreviewUrl(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      The URL of your main website where blogs will be
                      displayed. This is used for generating preview links and
                      is shared across your team.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <h2 className="text-lg font-medium text-foreground mb-4">
                  API Access
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Use this API key to fetch your published blogs and draft
                  previews from your consumer website. Changing this notifies
                  all admins.
                </p>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Studio API Key</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={showKey ? "text" : "password"}
                          value={apiKey || "No API key generated yet"}
                          className="h-9 bg-muted/50 pr-10 font-mono"
                          onChange={(e) => setApiKey(e.target.value)}
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
                      <button
                        type="button"
                        onClick={copyToClipboard}
                        disabled={!apiKey}
                        className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 h-9 w-9 text-sm font-medium transition-colors hover:bg-secondary/50 disabled:opacity-50"
                      >
                        {isCopied ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                      {apiKey ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              type="button"
                              disabled={isGenerating}
                              className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 h-9 w-9 text-sm font-medium transition-colors hover:bg-secondary/50 disabled:opacity-50"
                            >
                              {isGenerating ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <RefreshCw className="h-4 w-4" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Generate New Key
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Revoke existing API key?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently revoke your current API
                                key. Any services or applications using it will
                                lose access immediately. All admins will be
                                notified. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleGenerateKey}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Revoke & generate
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={handleGenerateKey}
                                disabled={isGenerating}
                                className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 h-9 w-9 text-sm font-medium transition-colors hover:bg-secondary/50 disabled:opacity-50"
                              >
                                {isGenerating ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4" />
                                )}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>Generate New Key</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-6 mt-6 border-t border-border">
            <div>
              {activeTab === "ai" && aiProvider === "custom" && (
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={isVerifying}
                  className={cn(
                    "inline-flex cursor-pointer items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary/50 disabled:opacity-50",
                    "h-10",
                    !isVerifying && "bg-background",
                  )}
                >
                  {isVerifying ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : isVerified ? (
                    <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                  ) : null}
                  {isVerified ? "Verified" : "Verify Connection"}
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex cursor-pointer items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isSaving ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
