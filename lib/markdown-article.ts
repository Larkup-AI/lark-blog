export type MarkdownArticle = { title?: string; category?: string; html: string };

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inlineMarkdown(value: string) {
  let html = escapeHtml(value);
  html = html.replace(/!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g, '<img src="$2" alt="$1" />');
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return html.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

export function looksLikeMarkdownDocument(value: string) {
  return /(^---\s*$|^#\s+|^##\s+|^```|^\*\*Title:\*\*)/m.test(value);
}

/** Converts the portable Markdown/MDX requested by the Studio prompt to editor HTML. */
export function parseMarkdownArticle(source: string): MarkdownArticle {
  let input = source.replace(/\r/g, "").trim();
  let title: string | undefined;
  let category: string | undefined;
  const frontmatter = input.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (frontmatter) {
    title = frontmatter[1].match(/^title:\s*["']?(.+?)["']?\s*$/mi)?.[1];
    category = frontmatter[1].match(/^(?:category|categories):\s*["']?(.+?)["']?\s*$/mi)?.[1];
    input = input.slice(frontmatter[0].length);
  }
  const blocks: string[] = [];
  const lines = input.split("\n");
  let paragraph: string[] = [];
  const flush = () => {
    const text = paragraph.join(" ").trim();
    if (text) blocks.push(`<p>${inlineMarkdown(text)}</p>`);
    paragraph = [];
  };
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) { flush(); continue; }
    if (/^(import|export)\s/.test(line) || /^<\/?[A-Z][\w.]*[^>]*>$/.test(line)) continue;
    const code = line.match(/^```([^\s]*)/);
    if (code) {
      flush(); const body: string[] = []; i += 1;
      while (i < lines.length && !lines[i].trim().startsWith("```")) body.push(lines[i++]);
      blocks.push(`<pre><code class="language-${escapeHtml(code[1] || "plaintext")}">${escapeHtml(body.join("\n"))}</code></pre>`); continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flush();
      if (heading[1].length === 1 && !title) title = heading[2].trim();
      else blocks.push(`<h${heading[1].length}>${inlineMarkdown(heading[2])}</h${heading[1].length}>`);
      continue;
    }
    const categoryLine = line.match(/^_?Category:\s*(.+?)_?$/i);
    if (categoryLine && !category) { category = categoryLine[1].trim(); continue; }
    if (/^(---|\*\*\*|___)$/.test(line)) { flush(); blocks.push("<hr />"); continue; }
    if (/^[-*]\s+/.test(line) || /^\d+[.)]\s+/.test(line)) {
      flush(); const ordered = /^\d+[.)]\s+/.test(line); const pattern = ordered ? /^\d+[.)]\s+/ : /^[-*]\s+/; const items: string[] = [];
      while (i < lines.length && pattern.test(lines[i].trim())) items.push(`<li>${inlineMarkdown(lines[i++].trim().replace(pattern, ""))}</li>`);
      i -= 1; blocks.push(`<${ordered ? "ol" : "ul"}>${items.join("")}</${ordered ? "ol" : "ul"}>`); continue;
    }
    if (line.startsWith(">")) { flush(); blocks.push(`<blockquote><p>${inlineMarkdown(line.replace(/^>\s?/, ""))}</p></blockquote>`); continue; }
    paragraph.push(line);
  }
  flush();
  return { title, category, html: blocks.join("") };
}
