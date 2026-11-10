/**
 * AI provider registry.
 *
 * Design goal: support OpenAI, Anthropic, Google (Gemini), xAI (Grok), DeepSeek,
 * Mistral, Groq, OpenRouter, the Vercel AI Gateway, and any OpenAI-compatible
 * endpoint (Ollama / LM Studio / vLLM / custom) — WITHOUT a separate SDK package
 * per vendor. Almost every major vendor now exposes an OpenAI-compatible
 * `/chat/completions` + `/models` surface, so we drive them all through
 * `@ai-sdk/openai-compatible`, and route "just give me everything" setups through
 * the Vercel AI Gateway (`createGateway`, bundled with `ai`).
 *
 * To add a first-class native provider later (e.g. `@ai-sdk/anthropic` for prompt
 * caching), install it and branch in `resolveModel`. The registry shape stays.
 */
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createGateway } from "ai";
import type { LanguageModel } from "ai";

export type ProviderId =
  | "gateway"
  | "openrouter"
  | "openai"
  | "anthropic"
  | "google"
  | "xai"
  | "deepseek"
  | "mistral"
  | "groq"
  | "ollama"
  | "lmstudio"
  | "custom";

export type ProviderSpec = {
  id: ProviderId;
  label: string;
  /** OpenAI-compatible base URL. `null` means it is handled specially (gateway). */
  baseURL: string | null;
  /** Needs an API key from the user. */
  requiresKey: boolean;
  /** Function-calling support (needed for the structured editor agent). */
  supportsTools: boolean;
  /** Whether it can be used with a user-supplied base URL. */
  allowsCustomBaseURL?: boolean;
  /** Dashboard for keys. */
  keysUrl?: string;
  /** Curated fallback models if the provider has no reachable /models endpoint. */
  defaultModels: { id: string; label: string; vision?: boolean }[];
  hint?: string;
};

export const AI_PROVIDERS: Record<ProviderId, ProviderSpec> = {
  gateway: {
    id: "gateway",
    label: "Vercel AI Gateway",
    baseURL: null,
    requiresKey: true,
    supportsTools: true,
    keysUrl: "https://vercel.com/docs/ai-gateway",
    hint: "One key, every model. Best default for cloud deployments.",
    defaultModels: [
      { id: "anthropic/claude-sonnet-4.5", label: "Claude Sonnet 4.5", vision: true },
      { id: "openai/gpt-5", label: "GPT-5", vision: true },
      { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", vision: true },
      { id: "xai/grok-4", label: "Grok 4" },
      { id: "deepseek/deepseek-v3", label: "DeepSeek V3" },
    ],
  },
  openrouter: {
    id: "openrouter",
    label: "OpenRouter",
    baseURL: "https://openrouter.ai/api/v1",
    requiresKey: true,
    supportsTools: true,
    keysUrl: "https://openrouter.ai/keys",
    hint: "One key, 300+ models across vendors.",
    defaultModels: [
      { id: "anthropic/claude-sonnet-4.5", label: "Claude Sonnet 4.5", vision: true },
      { id: "openai/gpt-5", label: "GPT-5", vision: true },
      { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", vision: true },
      { id: "deepseek/deepseek-chat", label: "DeepSeek Chat" },
    ],
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    baseURL: "https://api.openai.com/v1",
    requiresKey: true,
    supportsTools: true,
    keysUrl: "https://platform.openai.com/api-keys",
    defaultModels: [
      { id: "gpt-5", label: "GPT-5", vision: true },
      { id: "gpt-5-mini", label: "GPT-5 mini", vision: true },
      { id: "gpt-4.1", label: "GPT-4.1", vision: true },
      { id: "gpt-4o-mini", label: "GPT-4o mini", vision: true },
    ],
  },
  anthropic: {
    id: "anthropic",
    label: "Anthropic (Claude)",
    // Anthropic exposes an OpenAI-compatible surface at /v1/.
    baseURL: "https://api.anthropic.com/v1",
    requiresKey: true,
    supportsTools: true,
    keysUrl: "https://console.anthropic.com/settings/keys",
    defaultModels: [
      { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5", vision: true },
      { id: "claude-opus-4-1", label: "Claude Opus 4.1", vision: true },
      { id: "claude-haiku-4-5", label: "Claude Haiku 4.5", vision: true },
    ],
  },
  google: {
    id: "google",
    label: "Google (Gemini)",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    requiresKey: true,
    supportsTools: true,
    keysUrl: "https://aistudio.google.com/apikey",
    defaultModels: [
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", vision: true },
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", vision: true },
    ],
  },
  xai: {
    id: "xai",
    label: "xAI (Grok)",
    baseURL: "https://api.x.ai/v1",
    requiresKey: true,
    supportsTools: true,
    keysUrl: "https://console.x.ai",
    defaultModels: [
      { id: "grok-4", label: "Grok 4", vision: true },
      { id: "grok-3-mini", label: "Grok 3 mini" },
    ],
  },
  deepseek: {
    id: "deepseek",
    label: "DeepSeek",
    baseURL: "https://api.deepseek.com/v1",
    requiresKey: true,
    supportsTools: true,
    keysUrl: "https://platform.deepseek.com/api_keys",
    defaultModels: [
      { id: "deepseek-chat", label: "DeepSeek Chat (V3)" },
      { id: "deepseek-reasoner", label: "DeepSeek Reasoner (R1)" },
    ],
  },
  mistral: {
    id: "mistral",
    label: "Mistral",
    baseURL: "https://api.mistral.ai/v1",
    requiresKey: true,
    supportsTools: true,
    keysUrl: "https://console.mistral.ai/api-keys",
    defaultModels: [
      { id: "mistral-large-latest", label: "Mistral Large" },
      { id: "mistral-small-latest", label: "Mistral Small" },
    ],
  },
  groq: {
    id: "groq",
    label: "Groq",
    baseURL: "https://api.groq.com/openai/v1",
    requiresKey: true,
    supportsTools: true,
    keysUrl: "https://console.groq.com/keys",
    defaultModels: [
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
      { id: "moonshotai/kimi-k2-instruct", label: "Kimi K2" },
    ],
  },
  ollama: {
    id: "ollama",
    label: "Ollama (local)",
    baseURL: "http://localhost:11434/v1",
    requiresKey: false,
    supportsTools: false,
    allowsCustomBaseURL: true,
    hint: "Runs models on your machine. Many local models don't support tool-calling — the editor uses a Markdown fallback.",
    defaultModels: [
      { id: "llama3.1", label: "Llama 3.1" },
      { id: "qwen2.5", label: "Qwen 2.5" },
    ],
  },
  lmstudio: {
    id: "lmstudio",
    label: "LM Studio (local)",
    baseURL: "http://localhost:1234/v1",
    requiresKey: false,
    supportsTools: false,
    allowsCustomBaseURL: true,
    defaultModels: [],
  },
  custom: {
    id: "custom",
    label: "Custom (OpenAI-compatible)",
    baseURL: null,
    requiresKey: false,
    supportsTools: false,
    allowsCustomBaseURL: true,
    hint: "Any server exposing /chat/completions and /models (vLLM, TGI, LiteLLM, …).",
    defaultModels: [],
  },
};

export const PROVIDER_LIST = Object.values(AI_PROVIDERS);

function normalizeBaseURL(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export type ResolveModelArgs = {
  provider: ProviderId;
  model: string;
  apiKey?: string | null;
  /** Overrides the registry base URL (custom / local / self-hosted gateways). */
  baseURL?: string | null;
};

/** Build an AI SDK LanguageModel for the given provider + model. */
export function resolveModel(args: ResolveModelArgs): LanguageModel {
  const { provider, model, apiKey, baseURL } = args;

  if (provider === "gateway") {
    const gateway = createGateway({ apiKey: apiKey || undefined });
    return gateway(model);
  }

  const spec = AI_PROVIDERS[provider];
  const resolvedBase = normalizeBaseURL(baseURL || spec?.baseURL || "");
  if (!resolvedBase) {
    throw new Error(`No base URL configured for provider "${provider}".`);
  }
  const compat = createOpenAICompatible({
    name: provider,
    baseURL: resolvedBase,
    apiKey: apiKey || undefined,
  });
  return compat(model) as unknown as LanguageModel;
}

/**
 * List available models for a provider. Tries the live `/models` endpoint and
 * falls back to the curated list. Returns `[]` only when both fail.
 */
export async function listModels(
  provider: ProviderId,
  apiKey?: string | null,
  baseURL?: string | null
): Promise<{ id: string; label: string }[]> {
  const spec = AI_PROVIDERS[provider];
  const base = normalizeBaseURL(baseURL || spec?.baseURL || "");
  const curated = (spec?.defaultModels ?? []).map((m) => ({
    id: m.id,
    label: m.label,
  }));

  if (provider === "gateway" || !base) return curated;

  try {
    const res = await fetch(`${base}/models`, {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
      // keep the settings page snappy
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return curated;
    const json: any = await res.json();
    const rows: any[] = Array.isArray(json?.data)
      ? json.data
      : Array.isArray(json?.models)
        ? json.models
        : [];
    const live = rows
      .map((r) => (typeof r === "string" ? r : r.id || r.name))
      .filter(Boolean)
      .map((id: string) => ({ id, label: id }));
    return live.length ? live : curated;
  } catch {
    return curated;
  }
}
