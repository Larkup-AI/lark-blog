"use client";

import { useRef, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { AlignLeft, AlignCenter, AlignRight, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Align = "left" | "center" | "right";

const JUSTIFY: Record<Align, string> = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
};

export function ResizableImageView({
  node,
  updateAttributes,
  selected,
}: NodeViewProps) {
  const { src, alt, width, align } = node.attrs as {
    src: string;
    alt: string | null;
    width: string | null;
    align: Align;
  };
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const startResize = (event: React.PointerEvent) => {
    event.preventDefault();
    const container = wrapperRef.current?.parentElement;
    if (!container) return;
    const containerWidth = container.getBoundingClientRect().width;
    const startX = event.clientX;
    const startWidth =
      wrapperRef.current?.querySelector("img")?.getBoundingClientRect().width ??
      containerWidth;

    setDragging(true);

    const onMove = (e: PointerEvent) => {
      const delta = e.clientX - startX;
      const next = Math.min(
        100,
        Math.max(25, ((startWidth + delta) / containerWidth) * 100),
      );
      updateAttributes({ width: `${Math.round(next)}%` });
    };
    const onUp = () => {
      setDragging(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const currentAlign: Align = (align as Align) ?? "center";

  return (
    <NodeViewWrapper
      data-align={currentAlign}
      className={cn("my-6 flex", JUSTIFY[currentAlign])}
    >
      <div
        ref={wrapperRef}
        className={cn(
          "group relative inline-block max-w-full",
          selected && " outline-2 outline-offset-2 outline-accent",
        )}
        style={{ width: width ?? "auto" }}
      >
        {/* Alignment controls */}
        {selected && (
          <div className="absolute -top-11 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-lg border border-border bg-popover p-1 ">
            {(["left", "center", "right"] as Align[]).map((a) => {
              const Icon =
                a === "left"
                  ? AlignLeft
                  : a === "center"
                    ? AlignCenter
                    : AlignRight;
              return (
                <button
                  key={a}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => updateAttributes({ align: a })}
                  aria-label={`Align ${a}`}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-md text-foreground/70 hover:bg-secondary hover:text-foreground",
                    currentAlign === a && "bg-secondary text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
            <span className="mx-0.5 h-5 w-px bg-border" />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => updateAttributes({ width: "100%" })}
              aria-label="Full width"
              className="flex h-7 w-7 items-center justify-center rounded-md text-foreground/70 hover:bg-secondary hover:text-foreground"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src || "/placeholder.svg"}
          alt={alt ?? ""}
          draggable={false}
          className="block w-full rounded-lg border border-border"
        />

        {/* Resize handle */}
        <span
          onPointerDown={startResize}
          className={cn(
            "absolute -right-1.5 top-1/2 h-12 w-3 -translate-y-1/2 cursor-ew-resize rounded-full border border-border bg-popover opacity-0  transition-opacity group-hover:opacity-100",
            (selected || dragging) && "opacity-100",
          )}
          aria-hidden="true"
        />
      </div>
    </NodeViewWrapper>
  );
}
