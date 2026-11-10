"use client";

import type { Editor } from "@tiptap/react";
import { useRef, useState, useEffect, useCallback } from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code2,
  Info,
  Minus,
  Link as LinkIcon,
  ImageIcon,
  Video,
  Table as TableIcon,
  BarChart3,
  Loader2,
  AlignVerticalSpaceAround,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUploadThing } from "@/lib/uploadthing";
import { uploadViaStorage } from "@/lib/upload-client";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Layout constants ────────────────────────────────────────────────────────

const BTN_W = 32; // h-8 w-8
const DIV_W = 1; // divider is 1px wide; spacing handled by gap
const MAX_GAP = 4; // px — normal comfortable gap
const MIN_GAP = 0.01; // px — minimum gap before we start collapsing
const MORE_W = 36; //

// ─── Btn ─────────────────────────────────────────────────────────────────────

function Btn({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-8 w-8 shrink-0 items-center cursor-pointer justify-center rounded-md",
        "text-foreground/70 transition-colors",
        "hover:bg-muted hover:text-foreground disabled:opacity-40",
        active && "bg-muted text-foreground",
      )}
    >
      {children}
    </button>
  );
}

// Divider — no margin; gap on the parent handles spacing
const ToolbarDivider = () => (
  <span className="h-5 w-px shrink-0 bg-border/70" />
);

const YtIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-4 w-4"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.5v-7l6.3 3.5z" />
  </svg>
);

// ─── Item types ───────────────────────────────────────────────────────────────

type BtnItem = {
  kind: "btn";
  id: string;
  label: string;
  icon: () => React.ReactNode;
  isActive?: (editor: Editor) => boolean;
  run: (editor: Editor) => void;
  disabled?: (uploading: boolean) => boolean;
};
type DividerItem = { kind: "divider"; id: string };
type SpacingItem = { kind: "spacing"; id: string };
type ToolbarItem = BtnItem | DividerItem | SpacingItem;

// ─── Width of a single item in the flat item list ────────────────────────────
function itemWidth(item: ToolbarItem): number {
  if (item.kind === "divider") return DIV_W;
  return BTN_W; // btn & spacing both render as 32px
}

// ─── Total width of a slice of items at a given gap ──────────────────────────
function totalWidth(items: ToolbarItem[], gap: number): number {
  if (items.length === 0) return 0;
  return (
    items.reduce((sum, it) => sum + itemWidth(it), 0) + (items.length - 1) * gap
  );
}

// ─── EditorToolbar ────────────────────────────────────────────────────────────

export function EditorToolbar({
  editor,
  lineSpacing = 1.3,
  setLineSpacing,
}: {
  editor: Editor | null;
  lineSpacing?: number;
  setLineSpacing?: (v: number) => void;
}) {
  const imageInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [uploading, setUploading] = useState(false);
  // Layout state: current gap and how many items are visible
  const [layout, setLayout] = useState<{ gap: number; count: number }>({
    gap: MAX_GAP,
    count: 999,
  });

  const { startUpload: startImage } = useUploadThing("imageUploader");
  const { startUpload: startVideo } = useUploadThing("videoUploader");

  const onImagePick = async (file: File) => {
    if (!editor) return;
    setUploading(true);
    let url: string | null | undefined;
    try {
      // Try the active storage provider (S3 etc.) first, fall back to UploadThing.
      url = await uploadViaStorage(file);
      if (!url) {
        const res = await startImage([file]);
        url = res?.[0]?.ufsUrl ?? res?.[0]?.url;
      }
    } finally {
      setUploading(false);
    }
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  const onVideoPick = async (file: File) => {
    if (!editor) return;
    setUploading(true);
    let url: string | null | undefined;
    try {
      url = await uploadViaStorage(file);
      if (!url) {
        const res = await startVideo([file]);
        url = res?.[0]?.ufsUrl ?? res?.[0]?.url;
      }
    } finally {
      setUploading(false);
    }
    if (url)
      editor
        .chain()
        .focus()
        .insertContent(
          `<video controls src="${url}" style="width:100%;border-radius:0.5rem"></video><p></p>`,
        )
        .run();
  };

  const addLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href;
    const url = window.prompt("Link URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const addYoutube = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("YouTube URL");
    if (url) editor.commands.setYoutubeVideo({ src: url });
  }, [editor]);

  const addTable = useCallback(() => {
    editor
      ?.chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  }, [editor]);

  const addChart = useCallback(() => {
    editor?.chain().focus().setChart("").run();
  }, [editor]);

  // ── Ordered items (priority: left = stays visible longest) ───────────────
  const items: ToolbarItem[] = [
    {
      kind: "btn",
      id: "bold",
      label: "Bold",
      icon: () => <Bold className="h-4 w-4" />,
      isActive: (e) => e.isActive("bold"),
      run: (e) => e.chain().focus().toggleBold().run(),
    },
    {
      kind: "btn",
      id: "italic",
      label: "Italic",
      icon: () => <Italic className="h-4 w-4" />,
      isActive: (e) => e.isActive("italic"),
      run: (e) => e.chain().focus().toggleItalic().run(),
    },
    {
      kind: "btn",
      id: "under",
      label: "Underline",
      icon: () => <UnderlineIcon className="h-4 w-4" />,
      isActive: (e) => e.isActive("underline"),
      run: (e) => e.chain().focus().toggleUnderline().run(),
    },
    {
      kind: "btn",
      id: "strike",
      label: "Strikethrough",
      icon: () => <Strikethrough className="h-4 w-4" />,
      isActive: (e) => e.isActive("strike"),
      run: (e) => e.chain().focus().toggleStrike().run(),
    },
    { kind: "divider", id: "d1" },
    {
      kind: "btn",
      id: "h2",
      label: "Heading 2",
      icon: () => <Heading2 className="h-4 w-4" />,
      isActive: (e) => e.isActive("heading", { level: 2 }),
      run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      kind: "btn",
      id: "h3",
      label: "Heading 3",
      icon: () => <Heading3 className="h-4 w-4" />,
      isActive: (e) => e.isActive("heading", { level: 3 }),
      run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      kind: "btn",
      id: "ul",
      label: "Bullet list",
      icon: () => <List className="h-4 w-4" />,
      isActive: (e) => e.isActive("bulletList"),
      run: (e) => e.chain().focus().toggleBulletList().run(),
    },
    {
      kind: "btn",
      id: "ol",
      label: "Numbered list",
      icon: () => <ListOrdered className="h-4 w-4" />,
      isActive: (e) => e.isActive("orderedList"),
      run: (e) => e.chain().focus().toggleOrderedList().run(),
    },
    {
      kind: "btn",
      id: "quote",
      label: "Quote",
      icon: () => <Quote className="h-4 w-4" />,
      isActive: (e) => e.isActive("blockquote"),
      run: (e) => e.chain().focus().toggleBlockquote().run(),
    },
    {
      kind: "btn",
      id: "code",
      label: "Code block",
      icon: () => <Code2 className="h-4 w-4" />,
      isActive: (e) => e.isActive("codeBlock"),
      run: (e) => e.chain().focus().toggleCodeBlock().run(),
    },
    {
      kind: "btn",
      id: "callout",
      label: "Callout",
      icon: () => <Info className="h-4 w-4" />,
      isActive: (e) => e.isActive("callout"),
      run: (e) => e.chain().focus().toggleCallout("info").run(),
    },
    {
      kind: "btn",
      id: "hr",
      label: "Divider",
      icon: () => <Minus className="h-4 w-4" />,
      run: (e) => e.chain().focus().setHorizontalRule().run(),
    },
    { kind: "divider", id: "d2" },
    {
      kind: "btn",
      id: "link",
      label: "Link",
      icon: () => <LinkIcon className="h-4 w-4" />,
      isActive: (e) => e.isActive("link"),
      run: () => addLink(),
    },
    {
      kind: "btn",
      id: "image",
      label: "Insert image",
      icon: () =>
        uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImageIcon className="h-4 w-4" />
        ),
      disabled: () => uploading,
      run: () => imageInput.current?.click(),
    },
    {
      kind: "btn",
      id: "video",
      label: "Upload video",
      icon: () => <Video className="h-4 w-4" />,
      disabled: () => uploading,
      run: () => videoInput.current?.click(),
    },
    {
      kind: "btn",
      id: "yt",
      label: "Embed YouTube",
      icon: () => <YtIcon />,
      run: () => addYoutube(),
    },
    { kind: "divider", id: "d3" },
    {
      kind: "btn",
      id: "table",
      label: "Insert table",
      icon: () => <TableIcon className="h-4 w-4" />,
      run: () => addTable(),
    },
    {
      kind: "btn",
      id: "chart",
      label: "Insert chart",
      icon: () => <BarChart3 className="h-4 w-4" />,
      run: () => addChart(),
    },
    ...(setLineSpacing ? [{ kind: "spacing" as const, id: "spacing" }] : []),
  ];

  // ── Compute layout whenever container resizes ─────────────────────────────
  const recompute = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    // available = container inner width minus padding (px-2 = 8px each side = 16)
    const available = el.clientWidth - 16;
    const allWidth = totalWidth(items, MAX_GAP);

    // Phase 1: all fit at normal gap?
    if (allWidth <= available) {
      setLayout({ gap: MAX_GAP, count: items.length });
      return;
    }

    // Phase 2: all fit at min gap?
    const allWidthMin = totalWidth(items, MIN_GAP);
    if (allWidthMin <= available) {
      // Interpolate: find the exact gap that fills available space
      // gap = (available - sumWidths) / (n - 1)
      const sumW = items.reduce((s, it) => s + itemWidth(it), 0);
      const exactGap =
        items.length > 1
          ? Math.max(
              MIN_GAP,
              Math.min(MAX_GAP, (available - sumW) / (items.length - 1)),
            )
          : MAX_GAP;
      setLayout({ gap: Math.round(exactGap * 10) / 10, count: items.length });
      return;
    }

    // Phase 3: too narrow even at min gap → collapse from the right
    // Reserve space for the More button
    const budget = available - MORE_W;
    let used = 0;
    let count = 0;
    for (const item of items) {
      const w = itemWidth(item);
      const next = used + w + (count > 0 ? MIN_GAP : 0);
      if (next > budget) break;
      used = next;
      count++;
    }
    setLayout({ gap: MIN_GAP, count });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploading, setLineSpacing, addLink, addYoutube, addTable, addChart]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => recompute());
    ro.observe(el);
    recompute();
    return () => ro.disconnect();
  }, [recompute]);

  if (!editor) return null;

  // ── Split into visible / overflow ─────────────────────────────────────────
  const visibleItems = items.slice(0, layout.count);
  const overflowItems = items.slice(layout.count);

  // Clean trailing dividers from visible slice
  const cleanVisible = [...visibleItems];
  while (
    cleanVisible.length > 0 &&
    cleanVisible[cleanVisible.length - 1].kind === "divider"
  ) {
    cleanVisible.pop();
  }

  // Clean leading/consecutive/trailing dividers from overflow
  const cleanOverflow = overflowItems.reduce<ToolbarItem[]>((acc, cur) => {
    if (cur.kind === "divider") {
      if (acc.length === 0 || acc[acc.length - 1].kind === "divider")
        return acc;
    }
    return [...acc, cur];
  }, []);
  while (
    cleanOverflow.length > 0 &&
    cleanOverflow[cleanOverflow.length - 1].kind === "divider"
  ) {
    cleanOverflow.pop();
  }

  const hasOverflow = cleanOverflow.some((i) => i.kind !== "divider");

  // ── Render helpers ────────────────────────────────────────────────────────
  const renderVisible = (item: ToolbarItem) => {
    if (item.kind === "divider") return <ToolbarDivider key={item.id} />;
    if (item.kind === "spacing") {
      return (
        <Popover key="spacing">
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
              title="Paragraph Spacing"
            >
              <AlignVerticalSpaceAround className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-3" align="center">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Paragraph Spacing
                </span>
                <span className="text-xs font-mono font-semibold tabular-nums text-foreground">
                  {lineSpacing.toFixed(1)}
                </span>
              </div>
              <Slider
                value={[lineSpacing]}
                onValueChange={([v]) => setLineSpacing!(v)}
                min={0.04}
                max={3}
                step={0.01}
              />
            </div>
          </PopoverContent>
        </Popover>
      );
    }
    return (
      <Btn
        key={item.id}
        label={item.label}
        active={item.isActive?.(editor)}
        disabled={item.disabled?.(uploading)}
        onClick={() => item.run(editor)}
      >
        {item.icon()}
      </Btn>
    );
  };

  const renderOverflow = (item: ToolbarItem) => {
    if (item.kind === "divider") return <DropdownMenuSeparator key={item.id} />;
    if (item.kind === "spacing") {
      return (
        <div key="spacing" className="px-2 py-1.5 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <AlignVerticalSpaceAround className="h-3.5 w-3.5" /> Paragraph Spacing
            </span>
            <span className="text-xs font-mono font-semibold tabular-nums">
              {lineSpacing.toFixed(1)}
            </span>
          </div>
          <Slider
            value={[lineSpacing]}
            onValueChange={([v]) => setLineSpacing!(v)}
            min={0.04}
            max={3}
            step={0.01}
          />
        </div>
      );
    }
    return (
      <DropdownMenuItem
        key={item.id}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => item.run(editor)}
        disabled={item.disabled?.(uploading)}
        className="gap-2 cursor-pointer text-sm"
      >
        <span className="shrink-0 opacity-70 [&>svg]:h-3.5 [&>svg]:w-3.5">
          {item.icon()}
        </span>
        {item.label}
      </DropdownMenuItem>
    );
  };

  return (
    <div
      ref={containerRef}
      className="sticky top-0 z-10 flex items-center bg-background/80 px-2 py-1.5 backdrop-blur rounded-lg border border-border/50 overflow-hidden"
      style={{ gap: `${layout.gap}px` }}
    >
      {cleanVisible.map(renderVisible)}

      {hasOverflow && (
        <div className="ml-auto shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-md text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
                title="More"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side="bottom"
              className="w-48"
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              {cleanOverflow.map(renderOverflow)}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <input
        ref={imageInput}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onImagePick(f);
          e.target.value = "";
        }}
      />
      <input
        ref={videoInput}
        type="file"
        accept="video/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onVideoPick(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
