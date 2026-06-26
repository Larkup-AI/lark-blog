import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Post } from "@/lib/db/schema";

export interface EditorState {
  postId: number | null;
  title: string;
  category: string;
  authorName: string;
  coverImage: string | null;
  showCover: boolean;
  coverSize: string;
  coverFit: string;
  showToc: boolean;
  published: boolean;
  showPreview: boolean;
  lineSpacing: number;

  setTitle: (title: string) => void;
  setCategory: (category: string) => void;
  setAuthorName: (name: string) => void;
  setCoverImage: (image: string | null) => void;
  setShowCover: (show: boolean) => void;
  setCoverSize: (size: string) => void;
  setCoverFit: (fit: string) => void;
  setShowToc: (show: boolean) => void;
  setPublished: (published: boolean) => void;
  setShowPreview: (show: boolean) => void;
  setLineSpacing: (spacing: number) => void;

  initialize: (post: Post, sessionName?: string | null) => void;
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      postId: null,
      title: "",
      category: "",
      authorName: "Admin",
      coverImage: null,
      showCover: false,
      coverSize: "medium",
      coverFit: "cover",
      showToc: true,
      published: false,
      showPreview: true,
      lineSpacing: 1.3,

      setTitle: (title) => set({ title }),
      setCategory: (category) => set({ category }),
      setAuthorName: (authorName) => set({ authorName }),
      setCoverImage: (coverImage) => set({ coverImage }),
      setShowCover: (showCover) => set({ showCover }),
      setCoverSize: (coverSize) => set({ coverSize }),
      setCoverFit: (coverFit) => set({ coverFit }),
      setShowToc: (showToc) => set({ showToc }),
      setPublished: (published) => set({ published }),
      setShowPreview: (showPreview) => set({ showPreview }),
      setLineSpacing: (lineSpacing) => set({ lineSpacing }),

      initialize: (post, sessionName) => {
        // Always sync from the post — the store is global (not per-post),
        // so switching posts must always update all content fields.
        set({
          postId: post.id,
          title: post.title === "Untitled" ? "" : post.title,
          category: post.category ?? "",
          authorName: post.authorName ?? sessionName ?? "Admin",
          coverImage: post.coverImage,
          showCover: post.showCover ?? false,
          coverSize: post.coverSize ?? "medium",
          coverFit: post.coverFit ?? "cover",
          showToc: post.showToc ?? true,
          published: post.published,
        });
      },
    }),
    {
      name: "editor-store",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
