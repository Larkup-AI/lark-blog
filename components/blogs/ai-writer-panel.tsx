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
import { cn } from "@/lib/utils";

type EditorState = {
  title: string;
  category: string;
  outline: string[];
  isEmpty: boolean;
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
};

export function AiWriterPanel({
  open,
  onClose,
  editor,
  onSetTitle,
  onSetCategory,
  getEditorState,
}: AiWriterPanelProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const { messages, sendMessage, status, addToolOutput, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/write-agent",
      prepareSendMessagesRequest: ({ messages }) => ({
        body: { messages, editorState: stateRef.current() },
      }),
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
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
          default:
            respond("unknown tool");
        }
      } catch (err) {
        respond(
          `error: ${err instanceof Error ? err.message : "failed to apply edit"}`,
        );
      }
    },
  });

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
          "fixed inset-0 z-40 bg-foreground/20 transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden="true"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-card shadow-xl transition-transform duration-300",
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
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">
                Tell me what to write.
              </p>
              <p className="mt-1 leading-relaxed">
                e.g. &ldquo;Write a 600-word beginner guide to vector databases
                with a code example and a key-takeaways callout.&rdquo;
                I&apos;ll set the title, and build the whole article right here
                in the editor.
              </p>
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
                    {textParts && (
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
          <div className="flex items-end gap-2 rounded-xl border border-border bg-background p-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={2}
              placeholder="Describe the article you want…"
              className="max-h-40 flex-1 resize-none bg-transparent px-1 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
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
