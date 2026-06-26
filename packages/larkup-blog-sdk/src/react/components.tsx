"use client";

import { CSSProperties, useRef } from "react";
import { usePost } from "./context";
import { DEFAULT_STYLES } from "./styles";
import { LarkupToc, LarkupMobileToc } from "./toc";
import {
  LarkupClassNames,
  LarkupArticleProps,
  ArticleViewProps,
  FetchingArticleProps,
} from "./types";

export type { LarkupClassNames };

function cx(...names: (string | undefined | null | false)[]): string {
  return names.filter(Boolean).join(" ");
}

/**
 * Renders a full-featured blog article with header, cover image,
 * prose content, and optional table-of-contents sidebar.
 *
 * Accepts either a pre-fetched `post` object or a `slug` to
 * auto-fetch via the `<LarkupProvider>` context.
 */
export function LarkupArticle({
  className,
  style,
  prose = true,
  renderLoading,
  renderError,
  showHeader = true,
  showAuthor = true,
  showAuthorImage = true,
  showReadingTime = true,
  showDate = true,
  showCategory = true,
  showCover = true,
  showToc = true,
  classNames = {},
  maxWidth,
  ...rest
}: LarkupArticleProps) {
  const baseProps = {
    className,
    style,
    prose,
    showHeader,
    showAuthor,
    showAuthorImage,
    showReadingTime,
    showDate,
    showCategory,
    showCover,
    showToc,
    classNames,
    maxWidth,
  };

  if ("post" in rest && rest.post) {
    return <ArticleView post={rest.post} {...baseProps} />;
  }

  return (
    <FetchingArticle
      slug={(rest as any).slug}
      preview={(rest as any).preview}
      renderLoading={renderLoading}
      renderError={renderError}
      {...baseProps}
    />
  );
}

// ─── Auto-fetching wrapper ──────────────────────────────────────────────

function FetchingArticle({
  slug,
  preview,
  renderLoading,
  renderError,
  ...viewProps
}: FetchingArticleProps) {
  const { data: post, loading, error } = usePost(slug, { preview });

  if (loading) {
    return renderLoading ? (
      <>{renderLoading()}</>
    ) : (
      <div
        style={{ background: "transparent" }}
        aria-busy="true"
        aria-label="Loading article"
      />
    );
  }

  if (error) {
    return renderError ? (
      <>{renderError(error)}</>
    ) : (
      <p style={{ color: "red" }}>Failed to load article: {error.message}</p>
    );
  }

  if (!post) return null;

  return <ArticleView post={post} {...viewProps} />;
}

// ─── Article renderer ───────────────────────────────────────────────────

function ArticleView({
  post,
  className,
  style,
  prose,
  showHeader,
  showAuthor,
  showAuthorImage,
  showReadingTime,
  showDate,
  showCategory,
  showCover,
  showToc,
  classNames = {},
  maxWidth,
}: ArticleViewProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const finalShowCover = showCover && (post.showCover ?? true);
  const finalShowToc = showToc && (post.showToc ?? true);
  const author = post.authorName ?? "Admin";
  const coverFit = post.coverFit ?? "cover";
  const shouldConstrainAspect = coverFit === "cover";

  // Build inline style, injecting the CSS variable when maxWidth is set
  const articleStyle: CSSProperties = { ...style };
  if (maxWidth) {
    (articleStyle as any)["--larkup-max-width"] = maxWidth;
  }

  return (
    <article
      className={cx("larkup-layout", className, classNames.article)}
      style={articleStyle}
      data-larkup-article={post.slug}
    >
      {prose && <style dangerouslySetInnerHTML={{ __html: DEFAULT_STYLES }} />}

      {/* ── Header ─────────────────────────────────────────────────── */}
      {showHeader && (
        <header className={cx("larkup-header-wrapper", classNames.header)}>
          {showCategory && (
            <span className={cx("larkup-category", classNames.category)}>
              Blog{post.category ? ` / ${post.category}` : ""}
            </span>
          )}

          <h1 className={cx("larkup-title", classNames.title)}>{post.title}</h1>

          {showAuthor && (
            <div
              className={cx("larkup-author-wrapper", classNames.authorWrapper)}
            >
              {showAuthorImage && post.authorImage ? (
                <img
                  src={post.authorImage}
                  alt={author}
                  className="larkup-author-avatar"
                />
              ) : (
                <span className="larkup-author-initial" aria-hidden="true">
                  {author.charAt(0).toUpperCase()}
                </span>
              )}
              <span className={cx("larkup-author-name", classNames.authorName)}>
                {author}
              </span>
            </div>
          )}

          <div className={cx("larkup-meta-row", classNames.metaContainer)}>
            <div className="larkup-meta-left">
              {showReadingTime && post.readingTime != null && (
                <span className={cx("larkup-meta-item", classNames.metaItem)}>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {post.readingTime} min read
                </span>
              )}
            </div>
            {showDate && post.publishedAt && (
              <time dateTime={post.publishedAt}>
                {new Date(post.publishedAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
            )}
          </div>
        </header>
      )}

      {/* ── Cover image ────────────────────────────────────────────── */}
      {finalShowCover && post.coverImage && (
        <div className={cx("larkup-cover-section", classNames.coverSection)}>
          <div className={cx("larkup-cover-inner", classNames.coverInner)}>
            <div
              className={
                shouldConstrainAspect
                  ? `larkup-cover-${post.coverSize || "large"}`
                  : undefined
              }
              style={{
                overflow: "hidden",
                borderRadius: "0.75rem",
                width: "100%",
              }}
            >
              <img
                src={post.coverImage}
                alt={post.title}
                className={cx("larkup-cover", classNames.coverImage)}
                style={{
                  width: "100%",
                  height: coverFit === "contain" ? "auto" : "100%",
                  objectFit: coverFit === "contain" ? "contain" : "cover",
                  objectPosition: `${post.coverX ?? 50}% ${post.coverY ?? 50}%`,
                  transform: `scale(${post.coverZoom ?? 1})`,
                  transformOrigin: `${post.coverX ?? 50}% ${post.coverY ?? 50}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Body + sidebar ─────────────────────────────────────────── */}
      <div className={cx("larkup-body-layout", classNames.bodyLayout)}>
        {finalShowToc && <div className="larkup-spacer" />}

        <div className={cx("larkup-article-content", classNames.content)}>
          {post.contentHtml ? (
            <div
              ref={contentRef}
              className={cx(
                prose ? "larkup-prose" : undefined,
                classNames.content,
              )}
              dangerouslySetInnerHTML={{ __html: post.contentHtml }}
            />
          ) : null}
        </div>

        {finalShowToc && (
          <aside className={cx("larkup-sidebar", classNames.sidebar)}>
            <div
              className={cx("larkup-sidebar-sticky", classNames.sidebarSticky)}
            >
              <LarkupToc contentRef={contentRef} classNames={classNames} />
            </div>
          </aside>
        )}
      </div>

      {finalShowToc && <LarkupMobileToc contentRef={contentRef} />}
    </article>
  );
}
