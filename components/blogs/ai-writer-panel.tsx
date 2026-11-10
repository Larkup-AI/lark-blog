"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { Sparkles, X, ArrowUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type EditorState = {
  title: string;
  category: string;
  outline: string[];
  isEmpty: boolean;
  selection?: string;
};

type AiWriterPanelProps = {
  open: boolean;
  onClose: () => void;
  editor: Editor | null;
  onSetTitle: (value: string) => void;
  onSetCategory: (value: string) => void;
  getEditorState: () => EditorState;
};

/* ---------- inline markdown -> HTML (paragraphs & list items) ---------- */

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inlineMarkdown(value: string) {
  let out = escapeHtml(value);
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  out = out.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  );
  return out;
}

type MarkdownArticle = {
  title?: string;
  category?: string;
  html: string;
};

/** Converts a no-tools model's Markdown response into the editor's HTML. */
function parseMarkdownArticle(source: string): MarkdownArticle | null {
  const normalized = source
    .replace(/\r/g, "")
    .replace(/\*\*Title:\*\*/gi, "\nTitle:")
    .replace(/\*\*Category:\*\*/gi, "\nCategory:")
    .replace(/\*\*Body:\*\*/gi, "\n\n");
  const lines = normalized.split("\n");
  const blocks: string[] = [];
  let title: string | undefined;
  let category: string | undefined;
  let paragraph: string[] = [];

  const flushParagraph = () => {
    const text = paragraph.join(" ").trim();
    if (text) blocks.push(`<p>${inlineMarkdown(text)}</p>`);
    paragraph = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) {
      flushParagraph();
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    const labeledTitle = line.match(/^Title:\s*(.+)$/i);
    const labeledCategory = line.match(/^_?Category:\s*(.+?)_?$/i);
    if (heading?.[1].length === 1 || labeledTitle) {
      title = (heading?.[2] ?? labeledTitle?.[1] ?? "").trim();
      continue;
    }
    if (labeledCategory) {
      category = labeledCategory[1].trim();
      continue;
    }
    if (heading) {
      flushParagraph();
      blocks.push(`<h${heading[1].length}>${inlineMarkdown(heading[2])}</h${heading[1].length}>`);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      flushParagraph();
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(`<li>${inlineMarkdown(lines[index].trim().replace(/^[-*]\s+/, ""))}</li>`);
        index += 1;
      }
      index -= 1;
      blocks.push(`<ul>${items.join("")}</ul>`);
      continue;
    }
    if (/^\d+[.)]\s+/.test(line)) {
      flushParagraph();
      const items: string[] = [];
      while (index < lines.length && /^\d+[.)]\s+/.test(lines[index].trim())) {
        items.push(`<li>${inlineMarkdown(lines[index].trim().replace(/^\d+[.)]\s+/, ""))}</li>`);
        index += 1;
      }
      index -= 1;
      blocks.push(`<ol>${items.join("")}</ol>`);
      continue;
    }
    if (line.startsWith(">")) {
      flushParagraph();
      blocks.push(`<blockquote><p>${inlineMarkdown(line.replace(/^>\s?/, ""))}</p></blockquote>`);
      continue;
    }
    paragraph.push(line);
  }
  flushParagraph();

  // Do not insert ordinary conversational replies into the article.
  if (!title && blocks.length < 2) return null;
  return { title, category, html: blocks.join("") };
}

function isWritingRequest(text: string) {
  return /\b(write|draft|create|generate|compose|rewrite|edit|add|continue)\b/i.test(text);
}

/* ---------- friendly labels for tool activity ---------- */

const TOOL_LABELS: Record<string, string> = {
  setTitle: "Set title",
  setCategory: "Set category",
  clearDocument: "Cleared document",
  insertHeading: "Added heading",
  insertParagraph: "Wrote paragraph",
  insertBulletList: "Added bullet list",
  insertOrderedList: "Added numbered list",
  insertQuote: "Added quote",
  insertCallout: "Added callout",
  insertCodeBlock: "Added code block",
  insertDivider: "Added divider",
  replaceSelection: "Edited selection",
};

/** Lightweight Markdown → HTML for replacing a selected passage. */
function markdownToHtmlBlocks(source: string): string {
  const lines = source.replace(/\r/g, "").split("\n");
  const blocks: string[] = [];
  let para: string[] = [];
  const flush = () => {
    const t = para.join(" ").trim();
    if (t) blocks.push(`<p>${inlineMarkdown(t)}</p>`);
    para = [];
  };
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) { flush(); continue; }
    const h = line.match(/^(#{1,4})\s+(.+)$/);
    if (h) { flush(); blocks.push(`<h${h[1].length}>${inlineMarkdown(h[2])}</h${h[1].length}>`); continue; }
    if (/^[-*]\s+/.test(line)) {
      flush();
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(`<li>${inlineMarkdown(lines[i].trim().replace(/^[-*]\s+/, ""))}</li>`);
        i += 1;
      }
      i -= 1;
      blocks.push(`<ul>${items.join("")}</ul>`);
      continue;
    }
    if (/^\d+[.)]\s+/.test(line)) {
      flush();
      const items: string[] = [];
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i].trim())) {
        items.push(`<li>${inlineMarkdown(lines[i].trim().replace(/^\d+[.)]\s+/, ""))}</li>`);
        i += 1;
      }
      i -= 1;
      blocks.push(`<ol>${items.join("")}</ol>`);
      continue;
    }
    if (line.startsWith(">")) { flush(); blocks.push(`<blockquote><p>${inlineMarkdown(line.replace(/^>\s?/, ""))}</p></blockquote>`); continue; }
    para.push(line);
  }
  flush();
  return blocks.join("") || `<p>${inlineMarkdown(source.trim())}</p>`;
}

export function AiWriterPanel({
  open,
  onClose,
  editor,
  onSetTitle,
  onSetCategory,
  getEditorState,
}: AiWriterPanelProps) {
  const [input, setInput] = useState("");
  const [lengthSetting, setLengthSetting] = useState("medium");
  const [customWords, setCustomWords] = useState("");
  const [insertedFallbackIds, setInsertedFallbackIds] = useState<Set<string>>(
    () => new Set(),
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const fallbackStarts = useRef(new Map<string, string>());
  const completedFallbackMessages = useRef(new Set<string>());
  const router = useRouter();

  // Keep a fresh reference to editor state for every request (incl. auto follow-ups).
  const stateRef = useRef(getEditorState);
  stateRef.current = getEditorState;

  /** Append a node/HTML to the very end of the document. */
  const appendContent = (content: unknown) => {
    if (!editor) return;
    const end = editor.state.doc.content.size;
    editor
      .chain()
      .focus()
      .insertContentAt(end, content as never)
      .run();
  };

  const { messages, sendMessage, status, addToolOutput, error, stop } = useChat(
    {
      transport: new DefaultChatTransport({
        api: "/api/write-agent",
        prepareSendMessagesRequest: ({ messages }) => ({
          body: {
            messages,
            editorState: stateRef.current(),
            lengthSetting,
            customWords
          },
        }),
      }),
      sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
      onError: (err) => {
        try {
          const parsed = JSON.parse(err.message);
          if (parsed.code === "MISSING_GATEWAY_KEY" || parsed.error?.includes("Missing Vercel AI Gateway Key")) {
            toast.error("Vercel AI Gateway Key is missing", {
              description: "Please configure it in your settings.",
              action: {
                label: "Settings",
                onClick: () => router.push("/settings")
              },
              duration: 10000,
            });
            return;
          }
          toast.error(parsed.error || "An error occurred");
        } catch {
          if (err.message.includes("MISSING_GATEWAY_KEY") || err.message.includes("Missing Vercel AI Gateway Key")) {
            toast.error("Vercel AI Gateway Key is missing", {
              description: "Please configure it in your settings.",
              action: {
                label: "Settings",
                onClick: () => router.push("/settings")
              },
              duration: 10000,
            });
          } else {
            toast.error(err.message || "An error occurred");
          }
        }
      },
      onToolCall: ({ toolCall }) => {
        if (toolCall.dynamic) return;
        const input = toolCall.input as Record<string, unknown>;
        // Explicit `void` return type breaks the circular type inference between
        // onToolCall and addToolOutput. Do NOT await — avoids deadlocks with
        // sendAutomaticallyWhen.
        const respond = (output: string): void => {
          addToolOutput({
            tool: toolCall.toolName as never,
            toolCallId: toolCall.toolCallId,
            output: output as never,
          });
        };

        try {
          switch (toolCall.toolName) {
            case "setTitle":
              onSetTitle(String(input.title ?? ""));
              respond("ok");
              break;
            case "setCategory":
              onSetCategory(String(input.category ?? ""));
              respond("ok");
              break;
            case "clearDocument":
              editor?.chain().focus().clearContent(true).run();
              respond("cleared");
              break;
            case "insertHeading":
              appendContent(
                `<h${input.level ?? 2}>${escapeHtml(String(input.text ?? ""))}</h${input.level ?? 2}>`,
              );
              respond("ok");
              break;
            case "insertParagraph":
              appendContent(
                `<p>${inlineMarkdown(String(input.markdown ?? ""))}</p>`,
              );
              respond("ok");
              break;
            case "insertBulletList": {
              const items = (input.items as string[]) ?? [];
              appendContent(
                `<ul>${items.map((i) => `<li>${inlineMarkdown(i)}</li>`).join("")}</ul>`,
              );
              respond("ok");
              break;
            }
            case "insertOrderedList": {
              const items = (input.items as string[]) ?? [];
              appendContent(
                `<ol>${items.map((i) => `<li>${inlineMarkdown(i)}</li>`).join("")}</ol>`,
              );
              respond("ok");
              break;
            }
            case "insertQuote":
              appendContent(
                `<blockquote><p>${inlineMarkdown(String(input.text ?? ""))}</p></blockquote>`,
              );
              respond("ok");
              break;
            case "insertCallout":
              appendContent({
                type: "callout",
                attrs: { variant: input.variant ?? "info" },
                content: [
                  {
                    type: "paragraph",
                    content: input.text
                      ? [{ type: "text", text: String(input.text) }]
                      : [],
                  },
                ],
              });
              respond("ok");
              break;
            case "insertCodeBlock":
              appendContent({
                type: "codeBlock",
                attrs: { language: String(input.language ?? "plaintext") },
                content: input.code
                  ? [{ type: "text", text: String(input.code) }]
                  : [],
              });
              respond("ok");
              break;
            case "insertDivider":
              appendContent({ type: "horizontalRule" });
              respond("ok");
              break;
            case "replaceSelection": {
              const md = String(input.markdown ?? "");
              if (editor && !editor.state.selection.empty) {
                editor
                  .chain()
                  .focus()
                  .deleteSelection()
                  .insertContent(markdownToHtmlBlocks(md))
                  .run();
                respond("replaced");
              } else {
                // No live selection — append so the work isn't lost.
                appendContent(markdownToHtmlBlocks(md));
                respond("no selection; appended instead");
              }
              break;
            }
            default:
              respond("unknown tool");
          }
        } catch (err) {
          respond(
            `error: ${err instanceof Error ? err.message : "failed to apply edit"}`,
          );
        }
      },
    },
  );

  // Auto-scroll to the newest message.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, status]);

  // Dismiss on Escape, like a dialog.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const busy = status === "submitted" || status === "streaming";

  // Local models that cannot call editor tools return Markdown. Re-render the
  // generated portion as each text chunk arrives, so the article streams into
  // the editor rather than waiting in the chat panel.
  useEffect(() => {
    const message = messages.at(-1);
    if (!message || message.role !== "assistant") return;
    const hasTools = message.parts.some((part) => part.type.startsWith("tool-"));
    const text = message.parts
      .filter((part): part is { type: "text"; text: string } => part.type === "text")
      .map((part) => part.text)
      .join("");
    const userText = [...messages]
      .slice(0, -1)
      .reverse()
      .find((item) => item.role === "user")
      ?.parts.filter((part): part is { type: "text"; text: string } => part.type === "text")
      .map((part) => part.text)
      .join("") ?? "";
    if (hasTools || !isWritingRequest(userText)) return;

    const article = parseMarkdownArticle(text);
    if (!article) return;
    if (!fallbackStarts.current.has(message.id)) {
      fallbackStarts.current.set(message.id, editor?.getHTML() ?? "");
      setInsertedFallbackIds((current) => new Set(current).add(message.id));
    }
    if (article.title) onSetTitle(article.title);
    if (article.category) onSetCategory(article.category);
    if (article.html && editor) {
      editor.commands.setContent(
        `${fallbackStarts.current.get(message.id) ?? ""}${article.html}`,
      );
    }
    if (status === "ready" && !completedFallbackMessages.current.has(message.id)) {
      completedFallbackMessages.current.add(message.id);
      toast.success("Article added to the editor");
    }
  }, [messages, status, editor, onSetTitle, onSetCategory]);

  const submit = () => {
    const text = input.trim();
    if (!text || busy) return;
    sendMessage({ text });
    setInput("");
  };

  return (
    <>
      {/* Dismissible backdrop — makes the assistant read as a focused dialog. */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-foreground/5  transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden="true"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-background transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        )}
        aria-label="AI writing assistant"
        aria-hidden={!open}
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold leading-none text-foreground">
                Writing assistant
              </p>
              <p className="text-xs text-muted-foreground">
                Builds the article in your editor
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close assistant"
          >
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div
          ref={scrollRef}
          className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
        >
          {messages.length === 0 && (
            <div className="rounded-lg  p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Suggetions</p>
              <div className="mt-4 grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const text =
                      "Write a beginner guide to RAG (Retrieval-Augmented Generation) with a code example and a key-takeaways callout.";
                    sendMessage({ text });
                  }}
                  className="text-left rounded-md border border-border bg-background p-3 text-xs hover:bg-muted/50 transition-colors"
                >
                  <p className="font-semibold text-foreground">
                    Beginner guide to RAG
                  </p>
                  <p className="text-muted-foreground mt-1 line-clamp-2">
                    A 600-word introduction to Retrieval-Augmented Generation
                    with examples.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const text =
                      "Write an overview of the latest AI models and their capabilities with a comparison table.";
                    sendMessage({ text });
                  }}
                  className="text-left rounded-md border border-border bg-background p-3 text-xs hover:bg-muted/50 transition-colors"
                >
                  <p className="font-semibold text-foreground">
                    Latest AI Models Overview
                  </p>
                  <p className="text-muted-foreground mt-1 line-clamp-2">
                    Compare the latest large language models and their features.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const text =
                      "Write a tutorial on building AI agents with practical code snippets and a summary callout.";
                    sendMessage({ text });
                  }}
                  className="text-left rounded-md border border-border bg-background p-3 text-xs hover:bg-muted/50 transition-colors"
                >
                  <p className="font-semibold text-foreground">
                    Building AI Agents
                  </p>
                  <p className="text-muted-foreground mt-1 line-clamp-2">
                    A tutorial on how to build intelligent agents from scratch.
                  </p>
                </button>
              </div>
            </div>
          )}

          {messages.map((message) => {
            const textParts = message.parts
              .filter(
                (p): p is { type: "text"; text: string } => p.type === "text",
              )
              .map((p) => p.text)
              .join("");
            const toolParts = message.parts.filter((p) =>
              p.type.startsWith("tool-"),
            );

            return (
              <div key={message.id} className="space-y-2">
                {message.role === "user" ? (
                  <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
                    {textParts}
                  </div>
                ) : (
                  <>
                    {insertedFallbackIds.has(message.id) && (
                      <div className="w-fit rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm text-muted-foreground">
                        Article added to the editor.
                      </div>
                    )}
                    {toolParts.length > 0 && (
                      <ul className="space-y-1">
                        {toolParts.map((part, i) => {
                          const toolName = part.type.replace(/^tool-/, "");
                          const label = TOOL_LABELS[toolName] ?? toolName;
                          const detail =
                            part &&
                            typeof part === "object" &&
                            "input" in part &&
                            part.input &&
                            typeof part.input === "object"
                              ? ((part.input as Record<string, unknown>).text ??
                                (part.input as Record<string, unknown>).title ??
                                (part.input as Record<string, unknown>)
                                  .markdown ??
                                "")
                              : "";
                          return (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-xs text-muted-foreground"
                            >
                              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                              <span className="leading-relaxed">
                                <span className="font-medium text-foreground">
                                  {label}
                                </span>
                                {detail
                                  ? `: ${String(detail).slice(0, 80)}`
                                  : ""}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {textParts && !insertedFallbackIds.has(message.id) && (
                      <div className="w-fit max-w-[90%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm text-foreground">
                        {textParts}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}

          {busy && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Writing…
            </div>
          )}
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error.message || "Something went wrong. Please try again."}
            </p>
          )}
        </div>

        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-muted-foreground font-medium">
              Length:
            </span>
            <TooltipProvider delayDuration={0}>
              <Tabs
                value={lengthSetting}
                onValueChange={setLengthSetting}
                className="w-fit"
              >
                <TabsList className="h-7 p-0.5">
                  <TabsTrigger value="short" className="text-[10px] h-full p-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="w-full h-full flex items-center justify-center px-2 cursor-pointer">Short</span>
                      </TooltipTrigger>
                      <TooltipContent side="top">200 words</TooltipContent>
                    </Tooltip>
                  </TabsTrigger>

                  <TabsTrigger value="medium" className="text-[10px] h-full p-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="w-full h-full flex items-center justify-center px-2 cursor-pointer">Medium</span>
                      </TooltipTrigger>
                      <TooltipContent side="top">500 words</TooltipContent>
                    </Tooltip>
                  </TabsTrigger>

                  <TabsTrigger value="long" className="text-[10px] h-full p-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="w-full h-full flex items-center justify-center px-2 cursor-pointer">Long</span>
                      </TooltipTrigger>
                      <TooltipContent side="top">1000 words</TooltipContent>
                    </Tooltip>
                  </TabsTrigger>

                  <TabsTrigger value="custom" className="text-[10px] h-full p-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="w-full h-full flex items-center justify-center px-2 cursor-pointer">Custom</span>
                      </TooltipTrigger>
                      <TooltipContent side="top">Specify words</TooltipContent>
                    </Tooltip>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </TooltipProvider>
            {lengthSetting === "custom" && (
              <input
                type="number"
                placeholder="words"
                value={customWords}
                onChange={(e) => setCustomWords(e.target.value)}
                className="w-16 h-6 text-[10px] rounded-md border border-border bg-background px-2"
              />
            )}
          </div>
          <div className="flex items-end gap-2 rounded-xl border border-border bg-background p-2">
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                  e.currentTarget.style.height = "auto";
                }
              }}
              rows={1}
              placeholder="Describe the article you want…"
              className="max-h-40 flex-1 resize-none bg-transparent px-1 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            {status === "streaming" ? (
              <Button
                size="icon"
                onClick={stop}
                aria-label="Stop"
                variant="destructive"
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="icon"
                onClick={submit}
                disabled={!input.trim() || busy}
                aria-label="Send"
                className="shrink-0"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUp className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
          <p className="mt-1.5 px-1 text-[11px] text-muted-foreground">
            Content is inserted live into your editor. Review and edit before
            saving.
          </p>
        </div>
      </aside>
    </>
  );
}
