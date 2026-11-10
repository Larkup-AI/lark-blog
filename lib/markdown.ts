/**
 * Minimal, dependency-free Markdown → (Tiptap JSON + HTML) converter.
 *
 * Used by server-side generation (the cron worker) to turn an AI-produced
 * Markdown article into the two representations a post needs:
 *   - `content`     : ProseMirror/Tiptap JSON (what the editor re-opens)
 *   - `contentHtml` : rendered HTML (what the public blog serves)
 *
 * It intentionally supports the subset the editor's StarterKit uses: headings
 * (h1–h3), paragraphs, bullet/ordered lists, blockquotes, fenced code blocks,
 * horizontal rules, and the inline marks **bold**, *italic*, `code`, [links](url).
 * Node names match Tiptap StarterKit so generated drafts open cleanly.
 */

/* ------------------------------- inline marks ------------------------------ */

type TextNode = { type: "text"; text: string; marks?: any[] };

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, "&quot;");
}

/**
 * Parse inline markdown into Tiptap text nodes. Order matters: code first (its
 * content is literal), then links, bold, italic.
 */
function parseInline(input: string): TextNode[] {
  const nodes: TextNode[] = [];

  // Tokenise by the first special construct we find, left to right.
  let rest = input;
  // Combined regex; we re-scan each iteration for simplicity/correctness.
  const re =
    /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*|_[^_]+_)|(\[[^\]]+\]\([^)]+\))/;

  while (rest.length) {
    const m = re.exec(rest);
    if (!m) {
      pushText(nodes, rest, []);
      break;
    }
    if (m.index > 0) pushText(nodes, rest.slice(0, m.index), []);
    const token = m[0];
    if (token.startsWith("`")) {
      pushText(nodes, token.slice(1, -1), [{ type: "code" }]);
    } else if (token.startsWith("**")) {
      pushText(nodes, token.slice(2, -2), [{ type: "bold" }]);
    } else if (token.startsWith("*") || token.startsWith("_")) {
      pushText(nodes, token.slice(1, -1), [{ type: "italic" }]);
    } else {
      // [text](href)
      const lm = /\[([^\]]+)\]\(([^)]+)\)/.exec(token);
      if (lm) {
        pushText(nodes, lm[1], [
          { type: "link", attrs: { href: lm[2], target: "_blank", rel: "noopener noreferrer nofollow" } },
        ]);
      } else {
        pushText(nodes, token, []);
      }
    }
    rest = rest.slice(m.index + token.length);
  }

  return nodes;
}

function pushText(nodes: TextNode[], text: string, marks: any[]) {
  if (!text) return;
  const node: TextNode = { type: "text", text };
  if (marks.length) node.marks = marks;
  nodes.push(node);
}

function inlineToHtml(input: string): string {
  const nodes = parseInline(input);
  return nodes
    .map((n) => {
      let html = escapeHtml(n.text);
      for (const mark of n.marks ?? []) {
        if (mark.type === "bold") html = `<strong>${html}</strong>`;
        else if (mark.type === "italic") html = `<em>${html}</em>`;
        else if (mark.type === "code") html = `<code>${html}</code>`;
        else if (mark.type === "link")
          html = `<a href="${escapeAttr(mark.attrs.href)}" target="_blank" rel="noopener noreferrer nofollow">${html}</a>`;
      }
      return html;
    })
    .join("");
}

/* ------------------------------ block parsing ----------------------------- */

export type MarkdownResult = {
  /** Tiptap "doc" JSON. */
  json: { type: "doc"; content: any[] };
  /** Rendered HTML. */
  html: string;
  /** First H1 found, if any (used as the post title). */
  title: string | null;
};

export function markdownToContent(markdown: string): MarkdownResult {
  const lines = (markdown ?? "").replace(/\r\n/g, "\n").split("\n");
  const content: any[] = [];
  const htmlParts: string[] = [];
  let title: string | null = null;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Blank line → skip.
    if (!line.trim()) {
      i++;
      continue;
    }

    // Fenced code block.
    const fence = /^```(\w+)?\s*$/.exec(line);
    if (fence) {
      const language = fence[1] || null;
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // closing fence
      const code = codeLines.join("\n");
      content.push({
        type: "codeBlock",
        attrs: { language },
        content: code ? [{ type: "text", text: code }] : [],
      });
      htmlParts.push(
        `<pre><code${language ? ` class="language-${escapeAttr(language)}"` : ""}>${escapeHtml(code)}</code></pre>`,
      );
      continue;
    }

    // Horizontal rule.
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      content.push({ type: "horizontalRule" });
      htmlParts.push("<hr>");
      i++;
      continue;
    }

    // Heading.
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = Math.min(heading[1].length, 3);
      const text = heading[2].trim();
      if (heading[1].length === 1 && !title) title = text;
      content.push({
        type: "heading",
        attrs: { level },
        content: parseInline(text),
      });
      htmlParts.push(`<h${level}>${inlineToHtml(text)}</h${level}>`);
      i++;
      continue;
    }

    // Blockquote (one or more consecutive `>` lines).
    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      const text = quoteLines.join(" ").trim();
      content.push({
        type: "blockquote",
        content: [{ type: "paragraph", content: parseInline(text) }],
      });
      htmlParts.push(`<blockquote><p>${inlineToHtml(text)}</p></blockquote>`);
      continue;
    }

    // Bullet list.
    if (/^[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*+]\s+/, ""));
        i++;
      }
      content.push({
        type: "bulletList",
        content: items.map((it) => ({
          type: "listItem",
          content: [{ type: "paragraph", content: parseInline(it) }],
        })),
      });
      htmlParts.push(
        `<ul>${items.map((it) => `<li>${inlineToHtml(it)}</li>`).join("")}</ul>`,
      );
      continue;
    }

    // Ordered list.
    if (/^\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+[.)]\s+/, ""));
        i++;
      }
      content.push({
        type: "orderedList",
        attrs: { start: 1 },
        content: items.map((it) => ({
          type: "listItem",
          content: [{ type: "paragraph", content: parseInline(it) }],
        })),
      });
      htmlParts.push(
        `<ol>${items.map((it) => `<li>${inlineToHtml(it)}</li>`).join("")}</ol>`,
      );
      continue;
    }

    // Paragraph: gather consecutive non-blank, non-structural lines.
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,6}\s|>\s?|[-*+]\s+|\d+[.)]\s+|```|(-{3,}|\*{3,}|_{3,})\s*$)/.test(
        lines[i],
      )
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }
    const text = paraLines.join(" ");
    content.push({ type: "paragraph", content: parseInline(text) });
    htmlParts.push(`<p>${inlineToHtml(text)}</p>`);
  }

  if (content.length === 0) {
    content.push({ type: "paragraph" });
  }

  return {
    json: { type: "doc", content },
    html: htmlParts.join("\n"),
    title,
  };
}
