import { CSSProperties, ReactNode } from "react";
import { Post } from "../client";

// ── Heading extracted from article content ──────────────────────────────
export type Heading = { id: string; text: string; level: number };

// ── Class-name slots for fine-grained styling ───────────────────────────
export interface LarkupClassNames {
  /** Outer `<article>` element */
  article?: string;
  /** Header wrapper (centered block containing title, author, meta) */
  header?: string;
  /** Article title `<h1>` */
  title?: string;
  /** Category label */
  category?: string;
  /** Author wrapper (avatar + name row) */
  authorWrapper?: string;
  /** Author name `<span>` */
  authorName?: string;
  /** Meta row (reading time, date) */
  metaContainer?: string;
  /** Individual meta item */
  metaItem?: string;
  /** Cover image outer section */
  coverSection?: string;
  /** Cover image inner wrapper (max-width container) */
  coverInner?: string;
  /** Cover `<img>` element */
  coverImage?: string;
  /** Body layout (flex row: spacer | content | sidebar) */
  bodyLayout?: string;
  /** Article content wrapper */
  content?: string;
  /** Sidebar `<aside>` */
  sidebar?: string;
  /** Sidebar sticky container */
  sidebarSticky?: string;
  /** TOC section title ("On this page") */
  tocTitle?: string;
}

// ── Base props shared by all article variants ───────────────────────────
export interface BaseProps {
  /** Additional class for the outer `<article>` */
  className?: string;
  /** Inline styles for the outer `<article>` */
  style?: CSSProperties;
  /** Inject built-in prose typography styles (default `true`) */
  prose?: boolean;
  /** Custom loading UI */
  renderLoading?: () => ReactNode;
  /** Custom error UI */
  renderError?: (err: Error) => ReactNode;

  /** Show the centered header block (default `true`) */
  showHeader?: boolean;
  /** Show author avatar + name (default `true`) */
  showAuthor?: boolean;
  /** Show author profile image (default `true`) */
  showAuthorImage?: boolean;
  /** Show reading-time badge (default `true`) */
  showReadingTime?: boolean;
  /** Show publish date (default `true`) */
  showDate?: boolean;
  /** Show category breadcrumb (default `true`) */
  showCategory?: boolean;
  /** Show cover image section (default `true`) */
  showCover?: boolean;
  /** Show table-of-contents sidebar + mobile sheet (default `true`) */
  showToc?: boolean;
  /** Class-name overrides for individual sub-elements */
  classNames?: LarkupClassNames;
  /**
   * Override the max-width of header / cover / content sections.
   * Maps to the `--larkup-max-width` CSS variable (default `"56rem"`).
   */
  maxWidth?: string;
}

// ── LarkupArticle props (slug-fetch mode OR pre-fetched post mode) ──────
export type LarkupArticleProps =
  | (BaseProps & { slug: string; post?: never; preview?: boolean })
  | (BaseProps & { post: Post; slug?: never; preview?: never });

// ── Internal view props (always has a `post`) ───────────────────────────
export interface ArticleViewProps extends BaseProps {
  post: Post;
}

// ── Internal fetching props ─────────────────────────────────────────────
export interface FetchingArticleProps extends BaseProps {
  slug: string;
  preview?: boolean;
}
