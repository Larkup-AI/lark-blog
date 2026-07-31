"use client";

import { useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Loader2,
  ImagePlus,
  Trash2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Copied CoverPreview from post-editor.tsx
function CoverPreview({ src, fit, zoom = 1, x = 50, y = 50, className }: any) {
  return (
    <div className={cn("overflow-hidden", className)}>
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

function ControlSlider({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
  disabled,
}: any) {
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

export function PostSettingsModal({
  open,
  onOpenChange,
  store,
  onSave,
  uploadImage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store: any;
  onSave: () => void;
  uploadImage: (file: File) => Promise<string | null>;
}) {
  const PRESET_CATEGORIES = [
    "Engineering",
    "Research",
    "Product",
    "Education",
    "Tutorials",
  ];

  const [local, setLocal] = useState({
    authorName: "",
    category: "",
    coverImage: null as string | null,
    showCover: false,
    coverSize: "medium",
    coverFit: "contain",
    coverZoom: 1,
    coverX: 50,
    coverY: 50,
  });

  const originalStateRef = useRef({ ...local });
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [advOpen, setAdvOpen] = useState(false);
  const coverInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      const initialState = {
        authorName: store.authorName,
        category: store.category,
        coverImage: store.coverImage,
        showCover: store.showCover,
        coverSize: store.coverSize,
        coverFit: store.coverFit,
        coverZoom: store.coverZoom,
        coverX: store.coverX,
        coverY: store.coverY,
      };
      setLocal(initialState);
      originalStateRef.current = initialState;
      setIsCustomMode(
        !!initialState.category &&
          !PRESET_CATEGORIES.includes(initialState.category),
      );
    }
  }, [open]);

  const hasChanges =
    JSON.stringify(local) !== JSON.stringify(originalStateRef.current);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && hasChanges) {
      if (!window.confirm("You have unsaved changes. Discard?")) {
        return;
      }
      // Revert store cover image if it was mutated
      store.setCoverImage(originalStateRef.current.coverImage);
      store.setShowCover(originalStateRef.current.showCover);
      store.setCoverSize(originalStateRef.current.coverSize);
      store.setCoverFit(originalStateRef.current.coverFit);
      store.setCoverZoom(originalStateRef.current.coverZoom);
      store.setCoverX(originalStateRef.current.coverX);
      store.setCoverY(originalStateRef.current.coverY);
    }
    onOpenChange(newOpen);
  };

  const handleSave = () => {
    store.setAuthorName(local.authorName);
    store.setCategory(local.category);
    // Cover properties might already be in store, but we set them again to be sure
    store.setCoverImage(local.coverImage);
    store.setShowCover(local.showCover);
    store.setCoverSize(local.coverSize);
    store.setCoverFit(local.coverFit);
    store.setCoverZoom(local.coverZoom);
    store.setCoverX(local.coverX);
    store.setCoverY(local.coverY);

    // update originalStateRef so hasChanges becomes false immediately
    originalStateRef.current = { ...local };

    onOpenChange(false);
    setTimeout(onSave, 50);
  };

  const handleCoverPick = async (file: File) => {
    setCoverUploading(true);
    const url = await uploadImage(file);
    if (url) {
      setLocal((prev) => ({
        ...prev,
        coverImage: url,
        showCover: true,
        coverZoom: 1,
        coverX: 50,
        coverY: 50,
      }));
      // Live update store so it appears in post
      store.setCoverImage(url);
      store.setShowCover(true);
      store.setCoverZoom(1);
      store.setCoverX(50);
      store.setCoverY(50);
      toast.success("Cover image uploaded");
    } else {
      toast.error("Cover upload failed");
    }
    setCoverUploading(false);
  };

  // Also live update store for other cover settings so preview is live
  const updateCoverSetting = (key: string, value: any) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
    const setterMap: any = {
      coverSize: store.setCoverSize,
      coverFit: store.setCoverFit,
      coverZoom: store.setCoverZoom,
      coverX: store.setCoverX,
      coverY: store.setCoverY,
      showCover: store.setShowCover,
      coverImage: store.setCoverImage,
    };
    if (setterMap[key]) {
      setterMap[key](value);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-112.5 p-0 bg-background border border-border overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>Post Settings</DialogTitle>
          <DialogDescription className="sr-only">
            Edit the settings for your post
          </DialogDescription>
        </DialogHeader>

        <input
          ref={coverInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleCoverPick(file);
            e.target.value = "";
          }}
        />

        <div className="grid gap-5 px-6 py-4 max-h-[70vh] overflow-y-auto">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Author</label>
            <Input
              value={local.authorName}
              onChange={(e) =>
                setLocal((prev) => ({ ...prev, authorName: e.target.value }))
              }
              placeholder="Author name"
              className="bg-muted/30"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Category</label>
            <Select
              value={isCustomMode ? "__custom__" : local.category || "none"}
              onValueChange={(val) => {
                if (val === "none") {
                  setIsCustomMode(false);
                  setLocal((prev) => ({ ...prev, category: "" }));
                } else if (val === "__custom__") {
                  setIsCustomMode(true);
                  setLocal((prev) => ({ ...prev, category: "" }));
                } else {
                  setIsCustomMode(false);
                  setLocal((prev) => ({ ...prev, category: val }));
                }
              }}
            >
              <SelectTrigger className="w-full bg-muted/30">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {PRESET_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
                <SelectItem value="__custom__">Custom…</SelectItem>
              </SelectContent>
            </Select>
            {isCustomMode && (
              <Input
                value={local.category}
                onChange={(e) =>
                  setLocal((prev) => ({ ...prev, category: e.target.value }))
                }
                placeholder="Enter custom category"
                className="mt-1 h-9 bg-muted/30"
                autoFocus
              />
            )}
          </div>

          <div className="grid gap-3">
            <label className="text-sm font-medium">Cover Image</label>
            {local.coverImage ? (
              <div className="space-y-3">
                <div
                  className={cn(
                    "relative w-full overflow-hidden rounded-xl border border-border aspect-2/1",
                  )}
                >
                  <CoverPreview
                    src={local.coverImage}
                    fit={local.coverFit}
                    zoom={local.coverZoom}
                    x={local.coverX}
                    y={local.coverY}
                    className="h-full w-full"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs bg-muted/30"
                    onClick={() =>
                      updateCoverSetting("showCover", !local.showCover)
                    }
                  >
                    {local.showCover ? (
                      <>
                        <Eye className="h-3.5 w-3.5 mr-1" /> Shown
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-3.5 w-3.5 mr-1" /> Hidden
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-muted/30"
                    onClick={() => coverInput.current?.click()}
                    disabled={coverUploading}
                  >
                    {coverUploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ImagePlus className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive bg-muted/30"
                    onClick={() => {
                      updateCoverSetting("coverImage", null);
                      updateCoverSetting("showCover", false);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => coverInput.current?.click()}
                disabled={coverUploading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/30 text-sm text-muted-foreground transition-colors hover:bg-muted/50 disabled:opacity-50"
              >
                {coverUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4" />
                )}
                Upload Cover Image
              </button>
            )}

            <Collapsible
              open={advOpen}
              onOpenChange={setAdvOpen}
              className="w-full"
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between h-8 text-xs text-muted-foreground hover:bg-muted/50 px-2 border border-transparent hover:border-border/50"
                >
                  Advanced settings
                  {advOpen ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="rounded-lg border border-border bg-muted/30 p-3 flex flex-col gap-3">
                  <div className="flex gap-2 mb-1">
                    <Select
                      value={local.coverSize}
                      onValueChange={(v) => updateCoverSetting("coverSize", v)}
                    >
                      <SelectTrigger className="h-7 text-xs flex-1 bg-background">
                        <SelectValue placeholder="Size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="large">Large</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={local.coverFit}
                      onValueChange={(v) => updateCoverSetting("coverFit", v)}
                    >
                      <SelectTrigger className="h-7 text-xs flex-1 bg-background">
                        <SelectValue placeholder="Fit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cover">Cover</SelectItem>
                        <SelectItem value="contain">Contain</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <ControlSlider
                    label="Zoom"
                    value={local.coverZoom}
                    min={1}
                    max={3}
                    step={0.05}
                    display={`${Math.round(local.coverZoom * 100)}%`}
                    onChange={(v: number) => updateCoverSetting("coverZoom", v)}
                    disabled={!local.showCover || !local.coverImage}
                  />
                  <ControlSlider
                    label="Horizontal"
                    value={local.coverX}
                    min={0}
                    max={100}
                    step={1}
                    display={`${local.coverX}%`}
                    onChange={(v: number) => updateCoverSetting("coverX", v)}
                    disabled={!local.showCover || !local.coverImage}
                  />
                  <ControlSlider
                    label="Vertical"
                    value={local.coverY}
                    min={0}
                    max={100}
                    step={1}
                    display={`${local.coverY}%`}
                    onChange={(v: number) => updateCoverSetting("coverY", v)}
                    disabled={!local.showCover || !local.coverImage}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      updateCoverSetting("coverZoom", 1);
                      updateCoverSetting("coverX", 50);
                      updateCoverSetting("coverY", 50);
                    }}
                    className="self-start text-[10px] text-muted-foreground underline-offset-2 hover:underline hover:text-foreground"
                  >
                    Reset position
                  </button>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>

        <DialogFooter className="bg-muted p-4 sm:rounded-b-lg border-t border-border flex justify-end gap-2 w-full">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant={"default"}
            onClick={handleSave}
            disabled={!hasChanges}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
