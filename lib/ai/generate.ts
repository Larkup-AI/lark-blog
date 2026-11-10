/**
 * Server-side article generation, shared by the cron scheduler (and reusable by
 * any future "generate a draft" button). It reuses the same provider registry
 * and per-workspace AI configuration as the interactive write-agent, but runs
 * headless: it asks the model for a complete Markdown article, then converts
 * that to Tiptap JSON + HTML via `lib/markdown`.
 *
 * It does NOT use the editor's client-executed tools (those apply edits to a
 * live Tiptap instance). Headless generation produces a whole document at once,
 * which is the right shape for an unattended job.
 */
import { generateText } from "ai";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { settings, user, workspaceMember } from "@/lib/db/schema";
import { resolveAiConfig, isAiConfigError } from "@/lib/ai/config";
import { markdownToContent } from "@/lib/markdown";
import { incrementUsage } from "@/lib/usage";

export type GenerateInput = {
  workspaceId: string;
  /** The brief / instruction. */
  prompt: string;
  /** Optional specific topic to focus this run on. */
  topic?: string | null;
  length?: string | null;
  category?: string | null;
  /** Prefer this user's AI settings; falls back to the workspace owner. */
  preferUserId?: string | null;
};

export type GenerateResult = {
  title: string;
  category: string | null;
  markdown: string;
  content: { type: "doc"; content: any[] };
  contentHtml: string;
  modelId: string;
};

/** Resolve the AI config to use for a workspace (creator, else owner). */
async function resolveWorkspaceAi(
  workspaceId: string,
  preferUserId?: string | null,
) {
  const candidates: string[] = [];
  if (preferUserId) candidates.push(preferUserId);

  const [owner] = await db
    .select({ userId: workspaceMember.userId })
    .from(workspaceMember)
    .where(
      and(
        eq(workspaceMember.workspaceId, workspaceId),
        eq(workspaceMember.role, "owner"),
      ),
    )
    .limit(1);
  if (owner?.userId) candidates.push(owner.userId);

  for (const userId of candidates) {
    const [userSettings] = await db
      .select()
      .from(settings)
      .where(eq(settings.userId, userId))
      .limit(1);
    const [currentUser] = await db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);
    const resolved = resolveAiConfig(userSettings, currentUser);
    if (!isAiConfigError(resolved)) return resolved;
  }
  return null;
}

const LENGTH_GUIDE: Record<string, string> = {
  short: "about 400–600 words",
  medium: "about 800–1200 words",
  long: "about 1500–2200 words",
};

export async function generateArticle(
  input: GenerateInput,
): Promise<GenerateResult> {
  const resolved = await resolveWorkspaceAi(
    input.workspaceId,
    input.preferUserId,
  );
  if (!resolved) {
    throw new Error(
      "No usable AI configuration for this workspace. Configure a provider in Settings.",
    );
  }

  const lengthHint =
    (input.length && LENGTH_GUIDE[input.length]) ||
    (input.length ? `about ${input.length}` : LENGTH_GUIDE.medium);

  const topicLine = input.topic
    ? `\n\nFocus this article specifically on: ${input.topic}`
    : "";
  const categoryLine = input.category
    ? `\n\nThe article's category is "${input.category}".`
    : "";

  const system = `You are an expert blog writer. Produce ONE complete, publication-ready article in GitHub-Flavored Markdown.

Rules:
- Start with a single H1 title line ("# Title").
- Then the body using ## / ### headings, paragraphs, bullet and numbered lists, blockquotes, and fenced code blocks where useful.
- Write engaging, accurate, well-structured prose. Vary paragraph length.
- Target ${lengthHint}.
- Output ONLY the Markdown article — no preamble, no explanation, no surrounding code fences.`;

  const user_prompt = `${input.prompt}${topicLine}${categoryLine}`;

  const { text, usage } = await generateText({
    model: resolved.model as any,
    system,
    prompt: user_prompt,
  });

  // Cloud: meter AI token usage against the plan (no-op on self-host).
  const totalTokens = (usage as { totalTokens?: number })?.totalTokens;
  if (input.workspaceId && typeof totalTokens === "number") {
    await incrementUsage(input.workspaceId, "ai_tokens", totalTokens).catch(() => {});
  }

  const markdown = stripWrappingFence(text.trim());
  const parsed = markdownToContent(markdown);

  const title =
    parsed.title ||
    deriveTitleFromMarkdown(markdown) ||
    (input.topic ?? "Untitled");

  return {
    title,
    category: input.category ?? null,
    markdown,
    content: parsed.json,
    contentHtml: parsed.html,
    modelId: resolved.modelId,
  };
}

/** Some models wrap the whole answer in a ```markdown fence — strip it. */
function stripWrappingFence(text: string): string {
  const m = /^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/.exec(text.trim());
  return m ? m[1] : text;
}

function deriveTitleFromMarkdown(markdown: string): string | null {
  for (const line of markdown.split("\n")) {
    const h = /^#\s+(.*)$/.exec(line.trim());
    if (h) return h[1].trim();
    if (line.trim()) return line.trim().slice(0, 120);
  }
  return null;
}
