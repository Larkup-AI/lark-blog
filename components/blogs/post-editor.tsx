"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExt from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Youtube from "@tiptap/extension-youtube";
import Underline from "@tiptap/extension-underline";
import { TableKit } from "@tiptap/extension-table";
import { CustomTableCell } from "@/components/blogs/extensions/custom-table-cell";
import { CustomTableHeader } from "@/components/blogs/extensions/custom-table-header";
import { TableGripOverlay } from "@/components/blogs/table-grip-overlay";
import {
  ArrowLeft,
  Check,
  Loader2,
  PanelRightOpen,
  PanelRightClose,
  ExternalLink,
  ImagePlus,
  Trash2,
  ListTree,
  Save,
  Eye,
  EyeOff,
  Sparkles,
  X,
  Globe,
  SettingsIcon,
  MoreHorizontal,
  ZoomIn,
  Move,
  Pin,
} from "lucide-react";
import { toast } from "sonner";
import { EditorToolbar } from "@/components/blogs/editor-toolbar";
import { AiWriterPanel } from "@/components/blogs/ai-writer-panel";
import { ResizableImage } from "@/components/blogs/extensions/resizable-image";
import { Callout } from "@/components/blogs/extensions/callout";
import { CodeBlock } from "@/components/blogs/extensions/code-block";
import { Chart } from "@/components/blogs/extensions/chart";
import { ArticleContent } from "@/components/blog/article-content";
import { ArticleToc } from "@/components/blog/article-toc";
import { TocSheet } from "@/components/blog/toc-sheet";
import GlobalDragHandle from "tiptap-extension-global-drag-handle";
import AutoJoiner from "tiptap-extension-auto-joiner";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useUploadThing } from "@/lib/uploadthing";
import { useSession } from "@/lib/auth-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { savePost, setPublished, deletePost } from "@/app/actions/posts";
import type { Post } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { useEditorStore } from "./use-editor-store";
import { Settings } from "@/lib/db/schema";

type SaveState = "idle" | "saving" | "saved";

// ─── Cover image helper ────────────────────────────────────────────────────────
/**
 * Renders a cover image with zoom + pan support.
 * - `fit`  → "cover" | "contain"
 * - `zoom` → 1–3 multiplier applied via transform: scale()
 * - `x/y`  → 0–100 percent, drives both object-position and transformOrigin
 *            so the zoom anchor matches the visible crop point.
 */
function CoverPreview({
  src,
  fit,
  zoom = 1,
  x = 50,
  y = 50,
  className,
}: {
  src: string | null;
  fit: string;
  zoom?: number;
  x?: number;
  y?: number;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src || "/placeholder.svg"}
        alt="Cover"
        style={{
          width: "100%",
          height: "100%",
          objectFit: fit === "contain" ? "contain" : "cover",
          objectPosition: `${x}% ${y}%`,
          transform: `scale(${zoom})`,
          transformOrigin: `${x}% ${y}%`,
        }}
      />
    </div>
  );
}

// ─── Slider helper ─────────────────────────────────────────────────────────────
function ControlSlider({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs text-muted-foreground">{label}</label>
        <span className="text-xs font-mono text-muted-foreground">
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-foreground disabled:opacity-40 cursor-pointer"
      />
    </div>
  );
}

// ─── Image utilities ───────────────────────────────────────────────────────────
async function compressImage(file: File, maxDim = 1920): Promise<File> {
  if (file.type === "image/svg+xml" || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const hasAlpha = file.type === "image/png";
    const mime = hasAlpha ? "image/png" : "image/jpeg";
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, mime, hasAlpha ? undefined : 0.85),
    );
    if (!blob || blob.size >= file.size) return file;
    const ext = hasAlpha ? "png" : "jpg";
    const name = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${name}.${ext}`, { type: mime });
  } catch {
    return file;
  }
}

function replaceImageSrc(editor: Editor, from: string, to: string) {
  const { state, view } = editor;
  let tr = state.tr;
  let changed = false;
  state.doc.descendants((node, pos) => {
    if (node.type.name === "image" && node.attrs.src === from) {
      tr = tr.setNodeMarkup(pos, undefined, { ...node.attrs, src: to });
      changed = true;
    }
  });
  if (changed) view.dispatch(tr.setMeta("addToHistory", false));
}

function removeImageBySrc(editor: Editor, src: string) {
  const { state, view } = editor;
  let tr = state.tr;
  let changed = false;
  const targets: Array<{ from: number; size: number }> = [];
  state.doc.descendants((node, pos) => {
    if (node.type.name === "image" && node.attrs.src === src) {
      targets.push({ from: pos, size: node.nodeSize });
    }
  });
  for (const t of targets.reverse()) {
    tr = tr.delete(t.from, t.from + t.size);
    changed = true;
  }
  if (changed) view.dispatch(tr.setMeta("addToHistory", false));
}

// ─── Main component ────────────────────────────────────────────────────────────
export function PostEditor({
  post,
  settings,
}: {
  post: Post;
  settings?: Settings;
}) {
  const router = useRouter();
  const { data: session } = useSession();

  const {
    title,
    setTitle,
    category,
    setCategory,
    authorName,
    setAuthorName,
    coverImage,
    setCoverImage,
    showCover,
    setShowCover,
    coverSize,
    setCoverSize,
    coverFit,
    setCoverFit,
    // NEW: zoom + pan
    coverZoom,
    setCoverZoom,
    coverX,
    setCoverX,
    coverY,
    setCoverY,
    showToc,
    setShowToc,
    isMain,
    setIsMain,
    published,
    setPublished: setPublishedState,
    showPreview,
    setShowPreview,
    lineSpacing,
    setLineSpacing,
    initialize,
  } = useEditorStore();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    initialize(post, session?.user?.name);
  }, [post, session?.user?.name, initialize]);

  // SSR-safe fallbacks
  const currentTitle = mounted
    ? title
    : post.title === "Untitled"
      ? ""
      : post.title;
  const currentCategory = mounted ? category : (post.category ?? "");
  const currentAuthorName = mounted
    ? authorName
    : (post.authorName ?? session?.user?.name ?? "Admin");
  const currentCoverImage = mounted ? coverImage : post.coverImage;
  const currentShowCover = mounted ? showCover : (post.showCover ?? false);
  const currentCoverSize = mounted ? coverSize : (post.coverSize ?? "medium");
  const currentCoverFit = mounted ? coverFit : (post.coverFit ?? "contain");
  const currentCoverZoom = mounted ? coverZoom : (post.coverZoom ?? 1);
  const currentCoverX = mounted ? coverX : (post.coverX ?? 50);
  const currentCoverY = mounted ? coverY : (post.coverY ?? 50);
  const currentShowToc = mounted ? showToc : (post.showToc ?? true);
  const currentShowPreview = mounted ? showPreview : true;
  const currentLineSpacing = mounted ? lineSpacing : 1.3;

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [coverUploading, setCoverUploading] = useState(false);
  const [pasteUploading, setPasteUploading] = useState(false);
  const [docVersion, setDocVersion] = useState(0);
  const [aiOpen, setAiOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState(
    (post.contentHtml as string) ?? "",
  );
  const dirtyRef = useRef(false);
  const coverInput = useRef<HTMLInputElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const inFlightUploadsRef = useRef(0);

  const { startUpload } = useUploadThing("imageUploader");

  const uploadRef = useRef<(files: File[], pos?: number) => void>(() => {});
  uploadRef.current = async (files, pos) => {
    const ed = editorRef.current;
    if (!ed) return;
    for (const file of files) {
      const tempUrl = URL.createObjectURL(file);
      const node = {
        type: "image",
        attrs: { src: tempUrl, width: "70%", align: "center" },
      };
      if (typeof pos === "number") {
        ed.chain().focus().insertContentAt(pos, node).run();
      } else {
        ed.chain().focus().insertContent(node).run();
      }
      setPasteUploading(true);
      inFlightUploadsRef.current++;
      try {
        const compressed = await compressImage(file);
        const res = await startUpload([compressed]);
        const url = res?.[0]?.ufsUrl ?? res?.[0]?.url;
        if (url) {
          replaceImageSrc(ed, tempUrl, url);
        } else {
          removeImageBySrc(ed, tempUrl);
          toast.error("Image upload failed", {
            description:
              "The image could not be uploaded. Check that image storage (UploadThing) is configured.",
          });
        }
      } catch (err) {
        removeImageBySrc(ed, tempUrl);
        toast.error("Image upload failed", {
          description:
            err instanceof Error ? err.message : "Unexpected upload error.",
        });
      } finally {
        inFlightUploadsRef.current = Math.max(
          0,
          inFlightUploadsRef.current - 1,
        );
        setPasteUploading(inFlightUploadsRef.current > 0);
        URL.revokeObjectURL(tempUrl);
        dirtyRef.current = true;
        setDocVersion((v) => v + 1);
      }
    }
  };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
      }),
      GlobalDragHandle.configure({
        dragHandleWidth: 24,
        scrollTreshold: 100,
        dragHandleSelector: ".drag-handle",
      }),
      AutoJoiner,
      Underline,
      LinkExt.configure({ openOnClick: false, autolink: true }),
      ResizableImage.configure({ inline: false }),
      Callout,
      CodeBlock,
      Chart,
      TableKit.configure({ table: { resizable: true } }),
      CustomTableCell,
      CustomTableHeader,
      Youtube.configure({ width: 720, height: 405, nocookie: true }),
      Placeholder.configure({
        placeholder: "Type '/'… or just start writing. Use # for headings.",
      }),
    ],
    content: (post.content as object) ?? "",
    onUpdate: ({ editor }) => {
      dirtyRef.current = true;
      setDocVersion((v) => v + 1);
      setPreviewHtml(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose-editorial max-w-none min-h-[55vh] focus:outline-none px-6 md:px-8 py-8",
      },
      handlePaste: (_view, event) => {
        const items = Array.from(event.clipboardData?.items ?? []);
        const files = items
          .filter((i) => i.type.startsWith("image/"))
          .map((i) => i.getAsFile())
          .filter((f): f is File => !!f);
        if (files.length) {
          event.preventDefault();
          uploadRef.current(files);
          return true;
        }
        return false;
      },
      handleDrop: (view, event, _slice, moved) => {
        if (moved) return false;
        const files = Array.from(event.dataTransfer?.files ?? []).filter((f) =>
          f.type.startsWith("image/"),
        );
        if (files.length) {
          event.preventDefault();
          const coords = view.posAtCoords({
            left: event.clientX,
            top: event.clientY,
          });
          uploadRef.current(files, coords?.pos);
          return true;
        }
        return false;
      },
    },
  });

  useEffect(() => {
    editorRef.current = editor;
    if (editor) setPreviewHtml(editor.getHTML());
  }, [editor]);

  const doSave = useCallback(async () => {
    if (!editor) return;
    if (inFlightUploadsRef.current > 0) {
      dirtyRef.current = true;
      return;
    }
    const blobSrcs: string[] = [];
    editor.state.doc.descendants((node) => {
      if (
        node.type.name === "image" &&
        typeof node.attrs.src === "string" &&
        node.attrs.src.startsWith("blob:")
      ) {
        blobSrcs.push(node.attrs.src);
      }
    });
    if (blobSrcs.length) {
      blobSrcs.forEach((src) => removeImageBySrc(editor, src));
      toast.warning("Some images were still uploading", {
        description:
          "Unsaved images were removed. Re-add them once image storage is configured.",
      });
    }
    setSaveState("saving");
    try {
      await savePost({
        id: post.id,
        title,
        category,
        authorName,
        coverImage,
        showCover,
        coverSize,
        coverFit,
        coverZoom,
        coverX,
        coverY,
        showToc,
        isMain,
        content: editor.getJSON(),
        contentHtml: editor.getHTML(),
      });
      dirtyRef.current = false;
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1500);
      router.refresh();
    } catch {
      setSaveState("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    editor,
    post.id,
    title,
    category,
    authorName,
    coverImage,
    showCover,
    coverSize,
    coverFit,
    coverZoom,
    coverX,
    coverY,
    showToc,
  ]);

  const doSaveRef = useRef(doSave);
  useEffect(() => {
    doSaveRef.current = doSave;
  }, [doSave]);

  useEffect(() => {
    const handleBlur = () => {
      if (dirtyRef.current) doSaveRef.current();
    };
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("blur", handleBlur);
      if (dirtyRef.current) doSaveRef.current();
    };
  }, []);

  useEffect(() => {
    if (!editor) return;
    const timer = setTimeout(() => {
      if (dirtyRef.current) doSave();
    }, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    title,
    category,
    authorName,
    coverImage,
    showCover,
    coverSize,
    coverFit,
    coverZoom,
    coverX,
    coverY,
    showToc,
    docVersion,
  ]);

  useEffect(() => {
    dirtyRef.current = true;
  }, [
    title,
    category,
    authorName,
    coverImage,
    showCover,
    coverSize,
    coverFit,
    coverZoom,
    coverX,
    coverY,
    showToc,
  ]);

  const onCoverPick = async (file: File) => {
    setCoverUploading(true);
    inFlightUploadsRef.current++;
    try {
      const compressed = await compressImage(file);
      const res = await startUpload([compressed]);
      const url = res?.[0]?.ufsUrl ?? res?.[0]?.url;
      if (url) {
        setCoverImage(url);
        setShowCover(true);
        // Reset zoom/pan on new image upload
        setCoverZoom(1);
        setCoverX(50);
        setCoverY(50);
        toast.success("Cover image uploaded");
      } else {
        toast.error("Cover upload failed", {
          description:
            "The cover could not be uploaded. Check that image storage (UploadThing) is configured.",
        });
      }
    } catch (err) {
      toast.error("Cover upload failed", {
        description:
          err instanceof Error ? err.message : "Unexpected upload error.",
      });
    } finally {
      inFlightUploadsRef.current = Math.max(0, inFlightUploadsRef.current - 1);
      setCoverUploading(false);
    }
  };

  const togglePublish = async () => {
    await doSave();
    const next = !published;
    await setPublished(post.id, next);
    setPublishedState(next);
    router.refresh();
  };

  const onDelete = async () => {
    await deletePost(post.id);
    router.push("/");
    router.refresh();
  };

  const busy = saveState === "saving" || pasteUploading;

  // Shared aspect-ratio classes for the cover based on size setting
  const coverAspectClass = cn(
    currentCoverSize === "small" && "aspect-[3/1]",
    currentCoverSize === "medium" && "aspect-[2/1]",
    currentCoverSize === "large" && "aspect-[16/10]",
  );

  return (
    <div className="h-svh flex flex-col overflow-hidden bg-background">
      <input
        ref={coverInput}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onCoverPick(file);
          e.target.value = "";
        }}
      />

      {/* ── Top bar ── */}
      <div className="sticky top-0 z-30 bg-background border-b border-border/10">
        <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-4 flex-1">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground whitespace-nowrap"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Link>

            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post title"
              className="max-w-md placeholder:text-muted-foreground/50 placeholder:text-[14px] border-border/60 bg-muted focus-visible:ring-0 text-foreground font-medium px-2 h-8 text-base"
            />

            {/* Cover image popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                  title="Cover Image"
                >
                  <ImagePlus className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 bg-background" align="start">
                <Tabs defaultValue="upload" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 h-7.5">
                    <TabsTrigger value="upload">Upload</TabsTrigger>
                    <TabsTrigger value="link">Link</TabsTrigger>
                  </TabsList>

                  {/* Upload tab */}
                  <TabsContent
                    value="upload"
                    className="pt-4 flex flex-col gap-4"
                  >
                    <>
                      <div
                        className={cn(
                          "relative w-full overflow-hidden rounded-md border border-border",
                          coverAspectClass,
                        )}
                      >
                        <CoverPreview
                          src={coverImage}
                          fit={coverFit}
                          zoom={coverZoom}
                          x={coverX}
                          y={coverY}
                          className="h-full w-full"
                        />
                        <Button
                          size="icon"
                          variant="destructive"
                          className="absolute right-2 top-2 h-6 w-6 rounded-full"
                          onClick={() => {
                            setCoverImage(null);
                            setShowCover(false);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      {/* ── Zoom + Pan sliders ── */}
                      <div className="rounded-lg border border-border bg-muted/30 p-3 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Zoom &amp; Position
                          </p>
                          <select
                            value={coverFit}
                            onChange={(e) => setCoverFit(e.target.value)}
                            className="h-6 rounded-md border border-border bg-background px-1.5 text-[10px] text-muted-foreground focus:ring-0"
                          >
                            <option value="cover">Cover</option>
                            <option value="contain">Contain</option>
                          </select>
                        </div>
                        <ControlSlider
                          label="Zoom"
                          value={coverZoom}
                          min={1}
                          max={3}
                          step={0.05}
                          display={`${Math.round(coverZoom * 100)}%`}
                          onChange={setCoverZoom}
                        />
                        <ControlSlider
                          label="Horizontal"
                          value={coverX}
                          min={0}
                          max={100}
                          step={1}
                          display={`${coverX}%`}
                          onChange={setCoverX}
                        />
                        <ControlSlider
                          label="Vertical"
                          value={coverY}
                          min={0}
                          max={100}
                          step={1}
                          display={`${coverY}%`}
                          onChange={setCoverY}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setCoverZoom(1);
                            setCoverX(50);
                            setCoverY(50);
                          }}
                          className="self-start text-xs text-muted-foreground underline-offset-2 hover:underline hover:text-foreground"
                        >
                          Reset
                        </button>
                      </div>
                    </>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={coverUploading}
                        onClick={() => coverInput.current?.click()}
                        className="flex-1"
                      >
                        {coverUploading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <ImagePlus className="mr-2 h-4 w-4" />
                        )}
                        Upload Image
                      </Button>
                      {coverImage && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setShowCover(!currentShowCover)}
                          title={
                            showCover ? "Hide on article" : "Show on article"
                          }
                        >
                          {showCover ? (
                            <Eye className="h-4 w-4 text-accent" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      )}
                    </div>
                  </TabsContent>

                  {/* Link tab */}
                  <TabsContent
                    value="link"
                    className="pt-4 flex flex-col gap-4"
                  >
                    <div className="flex flex-col gap-2">
                      <Input
                        placeholder="https://..."
                        value={coverImage || ""}
                        onChange={(e) => {
                          setCoverImage(e.target.value);
                          setShowCover(true);
                        }}
                      />
                    </div>
                    {coverImage && (
                      <>
                        <div
                          className={cn(
                            "relative w-full overflow-hidden rounded-md border border-border",
                            coverAspectClass,
                          )}
                        >
                          <CoverPreview
                            src={coverImage}
                            fit={coverFit}
                            zoom={coverZoom}
                            x={coverX}
                            y={coverY}
                            className="h-full w-full"
                          />
                        </div>
                        {/* ── Zoom + Pan sliders ── */}
                        <div className="rounded-lg border border-border bg-muted/30 p-3 flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Zoom &amp; Position
                            </p>
                            <select
                              value={coverFit}
                              onChange={(e) => setCoverFit(e.target.value)}
                              className="h-6 rounded-md border border-border bg-background px-1.5 text-[10px] text-muted-foreground focus:ring-0"
                            >
                              <option value="cover">Cover</option>
                              <option value="contain">Contain</option>
                            </select>
                          </div>
                          <ControlSlider
                            label="Zoom"
                            value={coverZoom}
                            min={1}
                            max={3}
                            step={0.05}
                            display={`${Math.round(coverZoom * 100)}%`}
                            onChange={setCoverZoom}
                          />
                          <ControlSlider
                            label="Horizontal"
                            value={coverX}
                            min={0}
                            max={100}
                            step={1}
                            display={`${coverX}%`}
                            onChange={setCoverX}
                          />
                          <ControlSlider
                            label="Vertical"
                            value={coverY}
                            min={0}
                            max={100}
                            step={1}
                            display={`${coverY}%`}
                            onChange={setCoverY}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setCoverZoom(1);
                              setCoverX(50);
                              setCoverY(50);
                            }}
                            className="self-start text-xs text-muted-foreground underline-offset-2 hover:underline hover:text-foreground"
                          >
                            Reset
                          </button>
                        </div>
                      </>
                    )}
                  </TabsContent>
                </Tabs>
              </PopoverContent>
            </Popover>
          </div>

          {/* Right-side controls */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
              {busy && (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {pasteUploading ? "Uploading" : "Saving"}
                </>
              )}
              {saveState === "saved" && !pasteUploading && (
                <>
                  <Check className="h-3.5 w-3.5 text-accent" /> All changes
                  saved
                </>
              )}
              {saveState === "idle" && !busy && dirtyRef.current && (
                <>Unsaved changes</>
              )}
            </span>

            {settings?.previewUrl ? (
              <Link
                href={`${settings.previewUrl.replace(/\/$/, "")}/blog/${post.slug}${!published ? `?preview=true&key=${settings.apiKey}` : ""}`}
                target="_blank"
                className={cn(
                  buttonVariants({ variant: "secondary" }),
                  "inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground h-7",
                )}
              >
                {published ? "View on Site" : "Preview on Site"}{" "}
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            ) : published ? (
              <Link
                href={`/blog/${post.slug}`}
                target="_blank"
                className={cn(
                  buttonVariants({ variant: "secondary" }),
                  "inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground h-7",
                )}
              >
                View <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            ) : null}

            <Button
              variant="outline"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              className="h-7 w-7 shrink-0"
              title="Post settings"
            >
              <SettingsIcon className="h-4 w-4 text-muted-foreground" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setAiOpen(true)}
              className="h-7 px-3 text-sm flex items-center gap-1.5 shrink-0"
            >
              <Sparkles className="h-3.5 w-3.5 text-accent" /> AI write
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  title="More Options"
                  className="h-7 w-7"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-48">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    setShowPreview(!currentShowPreview);
                  }}
                  className="hidden md:flex cursor-pointer justify-between"
                >
                  <span className="flex items-center">
                    <PanelRightOpen className="mr-2 h-4 w-4" /> Preview
                  </span>
                  <Switch checked={showPreview} className="scale-[0.8] origin-right" />
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    setShowToc(!currentShowToc);
                  }}
                  className="cursor-pointer justify-between"
                >
                  <span className="flex items-center">
                    <ListTree className="mr-2 h-4 w-4" /> Table of contents
                  </span>
                  <Switch checked={showToc} className="scale-[0.8] origin-right" />
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    setIsMain(!isMain);
                  }}
                  className="cursor-pointer"
                >
                  <Pin
                    className="mr-2 h-4 w-4"
                    fill={isMain ? "currentColor" : "none"}
                  />
                  {isMain ? "Unpin as main post" : "Pin as main post"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setDeleteOpen(true)}
                  className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950"
                >
                  <Trash2 className="mr-2 h-4 w-4 text-red-600" /> Delete post
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Delete dialog */}
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    this post.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Post settings dialog */}
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogContent className="sm:max-w-[460px] max-h-[85vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>Post Settings</DialogTitle>
                </DialogHeader>
                <div className="grid gap-5 py-4 overflow-y-auto pr-1">
                  {/* Author */}
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Author</label>
                    <Input
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="Author name"
                    />
                  </div>

                  {/* Category */}
                  {(() => {
                    const PRESET_CATEGORIES = [
                      "Engineering",
                      "Research",
                      "Product",
                      "Education",
                      "Tutorials",
                    ];
                    const isCustom =
                      !!category && !PRESET_CATEGORIES.includes(category);
                    const selectValue = isCustom
                      ? "__custom__"
                      : (category ?? "");
                    return (
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Category</label>
                        <select
                          value={selectValue}
                          onChange={(e) => {
                            if (e.target.value === "__custom__") {
                              setCategory("");
                            } else {
                              setCategory(e.target.value);
                            }
                          }}
                          className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="">None</option>
                          {PRESET_CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                          <option value="__custom__">Custom…</option>
                        </select>
                        {(selectValue === "__custom__" || isCustom) && (
                          <Input
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            placeholder="Enter custom category"
                            autoFocus
                          />
                        )}
                      </div>
                    );
                  })()}

                  {/* Cover image section */}
                  <div className="grid gap-3">
                    <label className="text-sm font-medium">Cover Image</label>

                    {coverImage ? (
                      <>
                        {/* Live preview with current zoom/pan */}
                        <div
                          className={cn(
                            "relative w-full overflow-hidden rounded-xl border border-border",
                            coverAspectClass,
                          )}
                        >
                          <CoverPreview
                            src={coverImage}
                            fit={coverFit}
                            zoom={coverZoom}
                            x={coverX}
                            y={coverY}
                            className="h-full w-full"
                          />
                        </div>

                        {/* Visibility + size + fit row */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowCover(!currentShowCover)}
                            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border border-border px-2 text-xs text-muted-foreground hover:text-foreground"
                            title={
                              showCover ? "Hide on article" : "Show on article"
                            }
                          >
                            {showCover ? (
                              <>
                                <Eye className="h-3.5 w-3.5" /> Shown
                              </>
                            ) : (
                              <>
                                <EyeOff className="h-3.5 w-3.5" /> Hidden
                              </>
                            )}
                          </button>
                          <select
                            value={coverSize}
                            onChange={(e) => setCoverSize(e.target.value)}
                            disabled={!showCover}
                            className="h-9 rounded-md border border-border bg-background px-1.5 text-xs disabled:opacity-50"
                            title="Cover height"
                          >
                            <option value="small">S</option>
                            <option value="medium">M</option>
                            <option value="large">L</option>
                          </select>
                          <select
                            value={coverFit}
                            onChange={(e) => setCoverFit(e.target.value)}
                            disabled={!showCover}
                            className="h-9 rounded-md border border-border bg-background px-1.5 text-xs disabled:opacity-50"
                            title="Cover fit"
                          >
                            <option value="cover">Cover</option>
                            <option value="contain">Contain</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => coverInput.current?.click()}
                            disabled={coverUploading}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground disabled:opacity-50"
                            aria-label="Replace cover"
                            title="Replace image"
                          >
                            {coverUploading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <ImagePlus className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCoverImage(null);
                              setShowCover(false);
                            }}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-destructive"
                            aria-label="Remove cover"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* ── Zoom + Pan sliders ── */}
                        <div className="rounded-lg border border-border bg-muted/30 p-3 flex flex-col gap-3">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Zoom &amp; Position
                          </p>

                          <ControlSlider
                            label="Zoom"
                            value={coverZoom}
                            min={1}
                            max={3}
                            step={0.05}
                            display={`${Math.round(coverZoom * 100)}%`}
                            onChange={setCoverZoom}
                            disabled={!showCover}
                          />
                          <ControlSlider
                            label="Horizontal"
                            value={coverX}
                            min={0}
                            max={100}
                            step={1}
                            display={`${coverX}%`}
                            onChange={setCoverX}
                            disabled={!showCover}
                          />
                          <ControlSlider
                            label="Vertical"
                            value={coverY}
                            min={0}
                            max={100}
                            step={1}
                            display={`${coverY}%`}
                            onChange={setCoverY}
                            disabled={!showCover}
                          />

                          {/* Reset button */}
                          <button
                            type="button"
                            onClick={() => {
                              setCoverZoom(1);
                              setCoverX(50);
                              setCoverY(50);
                            }}
                            className="self-start text-xs text-muted-foreground underline-offset-2 hover:underline hover:text-foreground"
                          >
                            Reset zoom &amp; position
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => coverInput.current?.click()}
                        disabled={coverUploading}
                        className="flex h-9 w-full items-center justify-center gap-2 rounded-md border border-dashed border-border text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                      >
                        {coverUploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ImagePlus className="h-4 w-4" />
                        )}
                        Upload Cover Image
                      </button>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              size="sm"
              onClick={doSave}
              disabled={busy}
              className="px-1!"
            >
              {saveState === "saving" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saveState === "saved" ? (
                <Check className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
            </Button>

            <Button
              className="h-7 px-4!"
              size="default"
              onClick={togglePublish}
            >
              <Globe className="h-4 w-4 mr-0" />{" "}
              {published ? "Unpublish" : "Publish"}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Editor + Preview panels ── */}
      <ResizablePanelGroup dir="horizontal" className="h-full items-stretch">
        <ResizablePanel
          defaultSize={showPreview ? 50 : 100}
          minSize={30}
          className="flex flex-col relative bg-transparent"
        >
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-4xl px-4 pb-6 pt-1 sm:px-8">
              <div className="min-w-0 flex flex-col gap-2">
                <div className="sticky top-0 z-10 bg-background pb-2 pt-2">
                  <EditorToolbar
                    editor={editor}
                    lineSpacing={lineSpacing}
                    setLineSpacing={setLineSpacing}
                  />
                </div>
                <div
                  className="min-w-0 pb-20"
                  style={
                    { "--line-spacing": lineSpacing } as React.CSSProperties
                  }
                >
                  <EditorContent editor={editor} />
                  {editor && <TableGripOverlay editor={editor} />}
                </div>
              </div>
            </div>
          </div>
        </ResizablePanel>

        {showPreview && (
          <>
            <ResizableHandle className="w-0.5 max-h-[95%] bg-transparent hover:bg-muted/50 rounded-2xl active:bg-muted transition-colors" />
            <ResizablePanel
              defaultSize={50}
              minSize={30}
              className="bg-transparent"
            >
              <div className="h-full w-full rounded-tl-xl border border-border/50 bg-[#FAFAFA] shadow-sm flex flex-col overflow-hidden">
                <div className="flex items-center justify-between border-b border-border/50 bg-[#FAFAFA] px-4 py-3 relative">
                  <div />
                  <div className="flex flex-col items-start w-full pl-3 absolute left-1/2 -translate-x-1/2 text-start">
                    <span className="font-semibold text-sm">Preview</span>
                    <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
                      /blog/{post.slug}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 rounded-full relative z-10"
                    onClick={() => setShowPreview(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div
                  className="flex-1 overflow-y-auto bg-[#FAFAFA] relative"
                  style={
                    {
                      "--line-spacing": currentLineSpacing,
                    } as React.CSSProperties
                  }
                >
                  <div className="px-6 md:px-8 py-8 mx-auto max-w-4xl">
                    {/* Category */}
                    <div className="flex w-full justify-center items-center">
                      <span className="font-mono text-center w-fit text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Blog{currentCategory ? ` / ${currentCategory}` : ""}
                      </span>
                    </div>

                    {/* Title */}
                    <h1 className="mt-4 text-balance text-center font-sans text-2xl font-bold leading-[1.1] tracking-tight text-foreground md:text-3xl">
                      {currentTitle || "Untitled"}
                    </h1>

                    {/* Author */}
                    <div className="mt-5 flex items-center gap-2.5">
                      <span
                        aria-hidden="true"
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-[10px] font-semibold text-background"
                      >
                        {(currentAuthorName || "A").charAt(0).toUpperCase()}
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {currentAuthorName || "Admin"}
                      </span>
                    </div>

                    {/* Meta row */}
                    <div className="mt-6 flex items-center justify-between border-b border-border pb-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        Preview mode
                      </span>
                      <span>Just now</span>
                    </div>

                    {/* Cover image — uses CoverPreview so preview matches settings */}
                    {currentCoverImage && currentShowCover && (
                      <div
                        className={cn(
                          "mt-6 w-full overflow-hidden rounded-xl",
                          coverAspectClass,
                        )}
                      >
                        <CoverPreview
                          src={currentCoverImage}
                          fit={currentCoverFit}
                          zoom={currentCoverZoom}
                          x={currentCoverX}
                          y={currentCoverY}
                          className="h-full w-full"
                        />
                      </div>
                    )}

                    {/* Article body */}
                    <ArticleContent
                      key={post.id}
                      id="article-body"
                      html={previewHtml}
                      className="prose-editorial mt-6"
                    />
                  </div>

                  {currentShowToc && (
                    <TocSheet
                      title={currentTitle || "Untitled"}
                      buttonClassName="flex"
                    />
                  )}
                </div>
              </div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>

      <AiWriterPanel
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        editor={editor}
        onSetTitle={setTitle}
        onSetCategory={setCategory}
        getEditorState={() => ({
          title,
          category,
          isEmpty: editor?.isEmpty ?? true,
          outline: editor
            ? ((editor.getJSON().content ?? []) as any[]).reduce<string[]>(
                (acc, node) => {
                  if (node.type === "heading") {
                    const text =
                      (node.content ?? [])
                        .map((c: { text?: string }) => c.text ?? "")
                        .join("") ?? "";
                    if (text) acc.push(`H${node.attrs?.level ?? 2}: ${text}`);
                  }
                  return acc;
                },
                [],
              )
            : [],
        })}
      />
    </div>
  );
}
