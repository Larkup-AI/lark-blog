"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Heading = { id: string; text: string; level: number };

export function ArticleToc() {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const article = document.getElementById("article-body");
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

    // On scroll, find the last heading that has passed the top of the viewport
    const onScroll = () => {
      const scrollY = window.scrollY + 120; // offset for sticky header
      let current = nodes[0]?.id ?? "";

      for (const node of nodes) {
        if (node.getBoundingClientRect().top + window.scrollY <= scrollY) {
          current = node.id;
        }
      }

      setActiveId(current);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // set initial active on mount

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
  }, []);

  if (headings.length === 0) return null;

  return (
    <nav aria-label="Table of contents" className="flex flex-col gap-3">
      <span className="font-mono text-[0.7rem] uppercase tracking-widest text-muted-foreground">
        On this page
      </span>
      <ul className="flex flex-col gap-2.5 border-l border-border">
        {headings.map((h) => (
          <li key={h.id} className={cn(h.level === 3 && "ml-3")}>
            <a
              href={`#${h.id}`}
              onClick={(e) => {
                e.preventDefault();
                document
                  .getElementById(h.id)
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className={cn(
                "-ml-px block border-l-2 pl-4 text-sm leading-snug transition-colors",
                activeId === h.id
                  ? "border-foreground text-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
