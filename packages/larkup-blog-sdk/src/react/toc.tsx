"use client";

import React, { useEffect, useState } from "react";
import { Heading } from "./types";

// ─── Desktop TOC (sidebar) ──────────────────────────────────────────────
export function LarkupToc({
  contentRef,
  onNavigate,
  classNames,
}: {
  contentRef: React.RefObject<HTMLDivElement>;
  onNavigate?: () => void;
  classNames?: { tocTitle?: string };
}) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const article = contentRef.current;
    if (!article) return;

    const updateHeadings = () => {
      const nodes = Array.from(
        article.querySelectorAll("h1, h2, h3"),
      ) as HTMLElement[];
      const items: Heading[] = nodes.map((node, i) => {
        if (!node.id) {
          node.id =
            node.textContent
              ?.toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/(^-|-$)/g, "") || `section-${i}`;
        }
        return {
          id: node.id,
          text: node.textContent ?? "",
          level: node.tagName === "H1" ? 1 : node.tagName === "H3" ? 3 : 2,
        };
      });
      setHeadings(items);
      return nodes;
    };

    let nodes = updateHeadings();

    const onScroll = () => {
      const scrollY = window.scrollY + 120;
      let current = nodes[0]?.id ?? "";
      for (const node of nodes) {
        if (node.getBoundingClientRect().top + window.scrollY <= scrollY) {
          current = node.id;
        }
      }
      setActiveId(current);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const mutationObserver = new MutationObserver(() => {
      nodes = updateHeadings();
      onScroll();
    });

    mutationObserver.observe(article, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      window.removeEventListener("scroll", onScroll);
      mutationObserver.disconnect();
    };
  }, [contentRef]);

  if (headings.length === 0) return null;

  return (
    <nav aria-label="Table of contents">
      <span
        className={[
          "larkup-toc-title",
          classNames?.tocTitle,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        On this page
      </span>
      <ul className="larkup-toc-list">
        {headings.map((h) => (
          <li
            key={h.id}
            className={[
              "larkup-toc-item",
              h.level === 3 ? "larkup-toc-item-level-3" : undefined,
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <a
              href={`#${h.id}`}
              onClick={(e) => {
                e.preventDefault();
                document
                  .getElementById(h.id)
                  ?.scrollIntoView({ behavior: "smooth" });
                onNavigate?.();
              }}
              className={[
                "larkup-toc-link",
                activeId === h.id ? "larkup-toc-link-active" : undefined,
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ─── Mobile TOC (slide-over sheet) ──────────────────────────────────────
export function LarkupMobileToc({
  contentRef,
}: {
  contentRef: React.RefObject<HTMLDivElement>;
}) {
  const [open, setOpen] = useState(false);
  const [hasHeadings, setHasHeadings] = useState(false);

  useEffect(() => {
    const article = contentRef.current;
    if (!article) return;

    const check = () => {
      const nodes = article.querySelectorAll("h1, h2, h3");
      setHasHeadings(nodes.length > 0);
    };
    check();

    const observer = new MutationObserver(check);
    observer.observe(article, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => observer.disconnect();
  }, [contentRef]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!hasHeadings) return null;

  return (
    <>
      <button
        type="button"
        className="larkup-mobile-toc-btn"
        onClick={() => setOpen(true)}
        aria-label="Open table of contents"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M16 12H3" />
          <path d="M16 6H3" />
          <path d="M10 18H3" />
          <path d="M21 6l-3 6 3 6" />
        </svg>
        Contents
      </button>

      <div
        className={[
          "larkup-mobile-toc-overlay",
          open ? "larkup-mobile-toc-overlay-open" : undefined,
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() => setOpen(false)}
      />
      <div
        className={[
          "larkup-mobile-toc-panel",
          open ? "larkup-mobile-toc-panel-open" : undefined,
        ]
          .filter(Boolean)
          .join(" ")}
        role="dialog"
        aria-modal="true"
        aria-label="Table of contents"
      >
        <button
          type="button"
          className="larkup-mobile-toc-close"
          onClick={() => setOpen(false)}
          aria-label="Close"
        >
          ✕
        </button>
        <p className="larkup-mobile-toc-heading">On this page</p>
        <LarkupToc contentRef={contentRef} onNavigate={() => setOpen(false)} />
      </div>
    </>
  );
}
