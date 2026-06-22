"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, RefreshCw, Save, Eye, EyeOff, Check } from "lucide-react";
import { Settings } from "@/lib/db/schema";
import { updateSettings, generateApiKey } from "@/app/actions/settings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export function SettingsForm({
  initialSettings,
}: {
  initialSettings: Settings;
}) {
  const [previewUrl, setPreviewUrl] = useState(
    initialSettings?.previewUrl || "",
  );
  const [apiKey, setApiKey] = useState(initialSettings?.apiKey || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateSettings(previewUrl);
      toast.success("Settings saved successfully");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateKey = async () => {
    setIsGenerating(true);
    try {
      const newKey = await generateApiKey();
      setApiKey(newKey);
      toast.success("New API key generated");
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
    <div className="space-y-8 max-w-2xl">
      <form
        onSubmit={handleSave}
        className="space-y-6 bg-card p-6 rounded-xl border border-border"
      >
        <div>
          <h2 className="text-lg font-medium text-foreground mb-4">
            General Settings
          </h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="previewUrl">
                Consumer Website Base URL (for Previews)
              </Label>
              <Input
                id="previewUrl"
                type="url"
                placeholder="https://larkup.com"
                value={previewUrl}
                onChange={(e) => setPreviewUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The URL of your main website where blogs will be displayed. This
                is used for generating preview links.
              </p>
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50"
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

      <div className="space-y-6 bg-card p-6 rounded-xl border border-border">
        <div>
          <h2 className="text-lg font-medium text-foreground mb-4">
            API Access
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Use this API key to fetch your published blogs and draft previews
            from your consumer website.
          </p>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Studio API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showKey ? "text" : "password"}
                    value={apiKey || "No API key generated yet"}
                    className="pr-10 font-mono"
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
                  className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary/50 disabled:opacity-50"
                >
                  {isCopied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {apiKey ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    disabled={isGenerating}
                    className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary/50 disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      "Generate New Key"
                    )}
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Revoke existing API key?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently revoke your current API key. Any
                      services or applications using it will lose access
                      immediately. This action cannot be undone.
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
              <button
                type="button"
                onClick={handleGenerateKey}
                disabled={isGenerating}
                className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary/50 disabled:opacity-50"
              >
                {isGenerating ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Generate New Key"
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
