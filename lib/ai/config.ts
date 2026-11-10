/**
 * Resolve a user's/workspace's AI configuration from the `settings` + `user`
 * rows into a concrete, ready-to-use model. Handles:
 *   - the new multi-provider fields (aiProvider / aiModel / aiApiKey / aiBaseUrl)
 *   - legacy 'vercel' (Vercel AI Gateway, key on user.vercelAiGatewayKey)
 *   - legacy 'custom' (OpenAI-compatible: customAiUrl / customAiKey / customAiModel)
 * Keys are stored encrypted and decrypted here.
 */
import type { LanguageModel } from "ai";
import { decryptSecret } from "@/lib/crypto";
import {
  AI_PROVIDERS,
  resolveModel,
  type ProviderId,
} from "./providers";

export type ResolvedAiConfig = {
  model: LanguageModel;
  providerId: ProviderId;
  modelId: string;
  /** Whether the chosen provider/model reliably supports tool-calling. */
  supportsTools: boolean;
};

export type AiConfigError = {
  error: string;
  code: "MISSING_GATEWAY_KEY" | "MISSING_AI_CONFIG" | "UNSUPPORTED_PROVIDER";
};

type SettingsRow = {
  aiProvider?: string | null;
  aiModel?: string | null;
  aiApiKey?: string | null;
  aiBaseUrl?: string | null;
  customAiUrl?: string | null;
  customAiKey?: string | null;
  customAiModel?: string | null;
};

type UserRow = { vercelAiGatewayKey?: string | null };

export function resolveAiConfig(
  settings: SettingsRow | undefined,
  user: UserRow | undefined
): ResolvedAiConfig | AiConfigError {
  const raw = (settings?.aiProvider || "gateway").toLowerCase();

  // ---- Legacy: Vercel AI Gateway --------------------------------------------
  if (raw === "vercel" || raw === "gateway") {
    const key = decryptSecret(user?.vercelAiGatewayKey) || "";
    if (!key) {
      return {
        error:
          "Missing Vercel AI Gateway key. Add it in Settings, or switch to another provider.",
        code: "MISSING_GATEWAY_KEY",
      };
    }
    const modelId =
      settings?.aiModel || AI_PROVIDERS.gateway.defaultModels[0].id;
    return {
      model: resolveModel({ provider: "gateway", model: modelId, apiKey: key }),
      providerId: "gateway",
      modelId,
      supportsTools: true,
    };
  }

  // ---- Legacy: custom OpenAI-compatible -------------------------------------
  if (raw === "custom") {
    const baseURL = settings?.aiBaseUrl || settings?.customAiUrl || "";
    const modelId = settings?.aiModel || settings?.customAiModel || "";
    const apiKey =
      decryptSecret(settings?.aiApiKey) ||
      decryptSecret(settings?.customAiKey) ||
      "";
    if (!baseURL || !modelId) {
      return {
        error: "Custom AI provider needs a base URL and a model name.",
        code: "MISSING_AI_CONFIG",
      };
    }
    return {
      model: resolveModel({ provider: "custom", model: modelId, apiKey, baseURL }),
      providerId: "custom",
      modelId,
      // Most self-hosted/local servers can't tool-call reliably.
      supportsTools: false,
    };
  }

  // ---- Registry providers ----------------------------------------------------
  const spec = AI_PROVIDERS[raw as ProviderId];
  if (!spec) {
    return { error: `Unsupported AI provider "${raw}".`, code: "UNSUPPORTED_PROVIDER" };
  }
  const modelId = settings?.aiModel || spec.defaultModels[0]?.id || "";
  const apiKey = decryptSecret(settings?.aiApiKey) || "";
  const baseURL = settings?.aiBaseUrl || spec.baseURL || undefined;

  if (!modelId) {
    return {
      error: `Select a model for ${spec.label} in Settings.`,
      code: "MISSING_AI_CONFIG",
    };
  }
  if (spec.requiresKey && !apiKey) {
    return {
      error: `Add your ${spec.label} API key in Settings.`,
      code: "MISSING_AI_CONFIG",
    };
  }

  return {
    model: resolveModel({ provider: spec.id, model: modelId, apiKey, baseURL }),
    providerId: spec.id,
    modelId,
    supportsTools: spec.supportsTools,
  };
}

export function isAiConfigError(
  v: ResolvedAiConfig | AiConfigError
): v is AiConfigError {
  return (v as AiConfigError).code !== undefined;
}
