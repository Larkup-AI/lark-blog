import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";

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
};

type EditorState = {
  title?: string;
  category?: string;
  outline?: string[];
  isEmpty?: boolean;
};

export async function POST(req: Request) {
  const {
    messages,
    editorState,
  }: { messages: UIMessage[]; editorState?: EditorState } = await req.json();

  const stateSummary = editorState
    ? [
        `Current title: ${editorState.title || "(empty)"}`,
        `Current category: ${editorState.category || "(empty)"}`,
        `Body is currently ${editorState.isEmpty ? "empty" : "not empty"}.`,
        editorState.outline?.length
          ? `Existing headings:\n${editorState.outline.map((h) => `- ${h}`).join("\n")}`
          : "No headings yet.",
      ].join("\n")
    : "No editor state provided.";

  const result = streamText({
    model: "openai/gpt-5.2",
    stopWhen: stepCountIs(40),
    tools: editorTools,
    system: `You are an expert blog writing assistant embedded inside a rich-text editor. You write and edit articles directly in the editor by calling the provided tools — you do NOT just print the article in chat.

How to work:
- When the user asks you to write an article, build it directly using the tools: set a strong title, an appropriate category, then compose the body section by section.
- Prefer many tool calls. You may emit several tool calls together. Insert content in reading order (top to bottom) — tools append to the end of the body.
- Use insertHeading (level 2 for main sections, level 3 for sub-sections), insertParagraph for prose, insertBulletList/insertOrderedList for lists, insertCallout for tips/warnings, insertCodeBlock for code, insertQuote for notable quotes, and insertDivider sparingly.
- Write in clear, engaging, well-structured prose. Vary paragraph length. Be accurate and concrete.
- If the body already has content and the user asks to continue or add a section, append to it. Only call clearDocument when the user explicitly wants to start over.
- Inline formatting in paragraphs/list items uses markdown: **bold**, *italic*, \`code\`, [text](url).
- After you finish building or editing, reply with a brief (1-2 sentence) summary of what you did. Keep chat replies short — the real output goes into the editor.

Current editor state:
${stateSummary}`,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
