"use client";

import { useEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import hljs from "highlight.js";
import { ChartRenderer, decodeChartConfig } from "./chart-renderer";
import { CODE_LANGUAGES } from "@/components/blogs/extensions/lowlight";

const LANG_LABEL = new Map(CODE_LANGUAGES.map((l) => [l.value, l.label]));

/**
 * Renders stored article HTML and progressively enhances it:
 *  - mounts live Recharts charts into `<div data-chart>` placeholders
 *  - wraps `<pre><code>` blocks in an IDE-style window (title bar, language
 *    label, copy button, line-number gutter) and syntax-highlights them
 * Used on the public article page and inside the editor's live preview, so both
 * stay perfectly in sync. Re-runs whenever the HTML changes.
 */
export function ArticleContent({
  html,
  id,
  className,
}: {
  html: string;
  id?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const roots: Root[] = [];
    el.querySelectorAll("div[data-chart]").forEach((node) => {
      const host = node as HTMLElement;
      const cfg = decodeChartConfig(host.getAttribute("data-chart") || "");
      if (!cfg) return;
      host.innerHTML = "";
      const root = createRoot(host);
      root.render(<ChartRenderer config={cfg} />);
      roots.push(root);
    });

    const cleanups: Array<() => void> = [];

    el.querySelectorAll("pre").forEach((pre) => {
      const preEl = pre as HTMLElement;
      // Skip if this <pre> is already inside an enhanced window.
      if (preEl.closest(".code-window")) return;

      const code = preEl.querySelector("code") as HTMLElement | null;

      // Highlight only if not already tokenized (lowlight pre-tokenizes in the
      // editor; re-running hljs would double-wrap and warn).
      const alreadyTokenized =
        !!code && code.querySelector('[class*="hljs-"]') !== null;
      if (code && code.dataset.highlighted !== "yes" && !alreadyTokenized) {
        try {
          if (code.classList.contains("language-plaintext")) {
            code.classList.remove("language-plaintext");
          }
          hljs.highlightElement(code);
        } catch (e) {
          console.error("hljs error:", e);
          /* unknown language — leave as plain text */
        }
      }

      // Resolve a language for the label.
      const cls = code?.className ?? "";
      const langMatch = cls.match(/language-([\w-]+)/);
      const langValue = langMatch?.[1] ?? "plaintext";
      const label = LANG_LABEL.get(langValue) ?? langValue;

      // Build the window shell around the existing <pre>.
      const win = document.createElement("div");
      win.className = "code-window group";

      const header = document.createElement("div");
      header.className = "code-window-header";
      header.innerHTML =
        '<span class="code-window-dots" aria-hidden="true">' +
        '<span style="background:#ff5f56"></span>' +
        '<span style="background:#ffbd2e"></span>' +
        '<span style="background:#27c93f"></span>' +
        "</span>" +
        `<span class="code-window-lang">${label}</span>`;

      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "code-copy-btn";
      copyBtn.setAttribute("aria-label", "Copy code");
      const setLabel = (t: string) => (copyBtn.innerHTML = `<span>${t}</span>`);
      setLabel("Copy");
      const onCopy = async () => {
        try {
          await navigator.clipboard.writeText(code?.textContent ?? "");
          setLabel("Copied");
          setTimeout(() => setLabel("Copy"), 1500);
        } catch {
          /* no-op */
        }
      };
      copyBtn.addEventListener("click", onCopy);
      cleanups.push(() => copyBtn.removeEventListener("click", onCopy));
      header.appendChild(copyBtn);

      const body = document.createElement("div");
      body.className = "code-window-body";

      const lineCount = Math.max(
        1,
        (code?.textContent ?? "").replace(/\n$/, "").split("\n").length,
      );
      const gutter = document.createElement("div");
      gutter.className = "code-gutter";
      gutter.setAttribute("aria-hidden", "true");
      gutter.innerHTML = Array.from(
        { length: lineCount },
        (_, i) => `<span>${i + 1}</span>`,
      ).join("");

      // Insert the window where the <pre> was, then move <pre> inside it.
      preEl.replaceWith(win);
      body.appendChild(gutter);
      body.appendChild(preEl);
      win.appendChild(header);
      win.appendChild(body);
    });

    return () => {
      roots.forEach((r) => r.unmount());
      cleanups.forEach((fn) => fn());
    };
  }, [html]);

  return (
    <div
      ref={ref}
      id={id}
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
