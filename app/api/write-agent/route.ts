import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  tool,
  type UIMessage,
} from "ai";
import { db } from "@/lib/db";
import { settings, user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAdminUserId } from "@/lib/admin";
import { z } from "zod";
import { resolveAiConfig, isAiConfigError } from "@/lib/ai/config";

export const maxDuration = 60;

const editorTools = {
  setTitle: tool({
    description: "Set the article title (the H1 shown at the top of the post).",
    inputSchema: z.object({ title: z.string().describe("The article title") }),
  }),
  setCategory: tool({
    description: "Set the article category/topic label.",
    inputSchema: z.object({ category: z.string() }),
  }),
  clearDocument: tool({
    description:
      "Erase all existing body content so the article can be written fresh. Use only when the user wants to start over.",
    inputSchema: z.object({}),
  }),
  insertHeading: tool({
    description: "Append a section heading to the article body.",
    inputSchema: z.object({
      level: z
        .number()
        .int()
        .min(2)
        .max(3)
        .describe("2 for a section, 3 for a sub-section"),
      text: z.string(),
    }),
  }),
  insertParagraph: tool({
    description:
      "Append a paragraph of body text. Supports inline markdown: **bold**, *italic*, `code`, and [links](url).",
    inputSchema: z.object({ markdown: z.string() }),
  }),
  insertBulletList: tool({
    description:
      "Append an unordered (bullet) list. Each item supports inline markdown.",
    inputSchema: z.object({ items: z.array(z.string()).min(1) }),
  }),
  insertOrderedList: tool({
    description:
      "Append an ordered (numbered) list. Each item supports inline markdown.",
    inputSchema: z.object({ items: z.array(z.string()).min(1) }),
  }),
  insertQuote: tool({
    description: "Append a blockquote (pull quote).",
    inputSchema: z.object({ text: z.string() }),
  }),
  insertCallout: tool({
    description:
      "Append a highlighted callout/aside box for tips, warnings, or key notes.",
    inputSchema: z.object({
      variant: z.enum(["info", "success", "warning"]),
      text: z.string(),
    }),
  }),
  insertCodeBlock: tool({
    description: "Append a syntax-highlighted code block.",
    inputSchema: z.object({
      language: z
        .string()
        .describe(
          'Language id, e.g. "ts", "js", "python", "bash", "json", "plaintext"',
        ),
      code: z.string(),
    }),
  }),
  insertDivider: tool({
    description: "Append a horizontal divider between sections.",
    inputSchema: z.object({}),
  }),
  replaceSelection: tool({
    description:
      "Replace the text the user currently has SELECTED in the editor with new content. Use this when the user asks to rewrite, shorten, expand, fix, translate, or change the tone of the selected passage. The content is Markdown (headings, paragraphs, lists, quotes, code). If nothing is selected, do not call this — append instead.",
    inputSchema: z.object({
      markdown: z
        .string()
        .describe("The replacement content as Markdown. Replaces the selection exactly."),
    }),
  }),
};

type EditorState = {
  title?: string;
  category?: string;
  outline?: string[];
  isEmpty?: boolean;
  /** Text the user currently has highlighted, if any. */
  selection?: string;
};

export async function POST(req: Request) {
  const {
    messages,
    editorState,
    lengthSetting,
    customWords,
  }: {
    messages: UIMessage[];
    editorState?: EditorState;
    lengthSetting?: string;
    customWords?: string;
  } = await req.json();

  const stateSummary = editorState
    ? [
        `Current title: ${editorState.title || "(empty)"}`,
        `Current category: ${editorState.category || "(empty)"}`,
        `Body is currently ${editorState.isEmpty ? "empty" : "not empty"}.`,
        editorState.outline?.length
          ? `Existing headings:\n${editorState.outline.map((h) => `- ${h}`).join("\n")}`
          : "No headings yet.",
        editorState.selection
          ? `The user currently has this text SELECTED (prefer replaceSelection to edit it):\n"""\n${editorState.selection.slice(0, 4000)}\n"""`
          : "No text is currently selected.",
      ].join("\n")
    : "No editor state provided.";

  const adminUserId = await getAdminUserId();
  if (!adminUserId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const [userSettings] = await db
    .select()
    .from(settings)
    .where(eq(settings.userId, adminUserId));

  const [currentUser] = await db
    .select()
    .from(user)
    .where(eq(user.id, adminUserId));

  // Resolve the configured provider + model from the registry. Supports OpenAI,
  // Anthropic, Google, xAI, DeepSeek, Mistral, Groq, OpenRouter, the Vercel AI
  // Gateway, and any OpenAI-compatible endpoint. Keys are decrypted internally.
  const resolved = resolveAiConfig(userSettings, currentUser);
  if (isAiConfigError(resolved)) {
    return new Response(JSON.stringify(resolved), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const aiModel = resolved.model;
  // Models without reliable tool-calling (many local/self-hosted) fall back to
  // returning Markdown that the client inserts into the editor.
  const usesMarkdownEditorFallback = !resolved.supportsTools;

  const lengthPrompt = lengthSetting
    ? lengthSetting === "custom" && customWords
      ? `\n\nWhen writing new content, aim for approximately ${customWords} words.`
      : lengthSetting !== "custom"
        ? `\n\nWhen writing new content, aim for a ${lengthSetting} length.`
        : ""
    : "";

  const result = streamText({
    model: aiModel as any,
    ...(usesMarkdownEditorFallback
      ? {}
      : { stopWhen: stepCountIs(40), tools: editorTools }),
    system: `You are an expert blog writing assistant embedded inside a rich-text editor. You write and edit articles directly in the editor by calling the provided tools.
IMPORTANT: ONLY write or edit when the user EXPLICITLY asks you to write, generate, or edit content. If the user is just chatting (e.g. saying "hi", asking a question), respond conversationally.${lengthPrompt}

${usesMarkdownEditorFallback ? `This editor connection does not support function calling. When the user asks you to write or edit, return the finished content as Markdown only—do not describe what you are about to do. Use this exact shape:
# Article title
_Category: A concise category_

Opening paragraph.

## Section heading
Body paragraph.

Use normal Markdown headings, paragraphs, bullet/numbered lists, quotes, and fenced code where useful. The editor will insert this Markdown automatically. For non-writing questions, answer normally without this format.` : `How to work:
- When the user asks you to write an article, build it directly using the tools: set a strong title, an appropriate category, then compose the body section by section.
- Prefer many tool calls. You may emit several tool calls together. Insert content in reading order (top to bottom) — tools append to the end of the body.
- Use insertHeading (level 2 for main sections, level 3 for sub-sections), insertParagraph for prose, insertBulletList/insertOrderedList for lists, insertCallout for tips/warnings, insertCodeBlock for code, insertQuote for notable quotes, and insertDivider sparingly.
- Write in clear, engaging, well-structured prose. Vary paragraph length. Be accurate and concrete.
- If the body already has content and the user asks to continue or add a section, append to it. Only call clearDocument when the user explicitly wants to start over.
- TARGETED EDITS: if the user has text selected and asks to rewrite/shorten/expand/fix/translate/change tone, call replaceSelection with the improved Markdown instead of appending. Keep the surrounding meaning; only change what was asked.
- Inline formatting in paragraphs/list items uses markdown: **bold**, *italic*, \`code\`, [text](url).
- After you finish building or editing, reply with a brief (1-2 sentence) summary of what you did. Keep chat replies short — the real output goes into the editor.`}

Current editor state:
${stateSummary}`,
    messages: await convertToModelMessages(messages),
    // Stop generating (and billing) on the server as soon as the client aborts
    // the request — this is what makes the "Stop" button actually stop the model.
    abortSignal: req.signal,
  });

  return result.toUIMessageStreamResponse();
}
