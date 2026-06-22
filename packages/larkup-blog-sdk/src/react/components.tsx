import React, { CSSProperties } from "react";
import { Post } from "../client";
import { usePost } from "./context";

interface BaseProps {
  className?: string;
  style?: CSSProperties;
  prose?: boolean;
  renderLoading?: () => React.ReactNode;
  renderError?: (err: Error) => React.ReactNode;
}

type LarkupArticleProps =
  | (BaseProps & { slug: string; post?: never; preview?: boolean })
  | (BaseProps & { post: Post; slug?: never; preview?: never });

export function LarkupArticle({
  className,
  style,
  prose = true,
  renderLoading,
  renderError,
  ...rest
}: LarkupArticleProps) {
  if ("post" in rest && rest.post) {
    return (
      <ArticleView
        post={rest.post}
        className={className}
        style={style}
        prose={prose}
      />
    );
  }

  return (
    <FetchingArticle
      slug={(rest as any).slug}
      preview={(rest as any).preview}
      className={className}
      style={style}
      prose={prose}
      renderLoading={renderLoading}
      renderError={renderError}
    />
  );
}

interface FetchingArticleProps extends BaseProps {
  slug: string;
  preview?: boolean;
}

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

interface ArticleViewProps {
  post: Post;
  className?: string;
  style?: CSSProperties;
  prose?: boolean;
}

function ArticleView({ post, className, style, prose }: ArticleViewProps) {
  return (
    <article
      className={className}
      style={{ background: "transparent", ...style }}
      data-larkup-article={post.slug}
    >
      {post.coverImage && (
        <img
          src={post.coverImage}
          alt={post.title}
          style={{ width: "100%", display: "block" }}
        />
      )}

      <header>
        <h1>{post.title}</h1>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {post.authorName && (
            <span data-larkup="author">{post.authorName}</span>
          )}
          {post.publishedAt && (
            <time dateTime={post.publishedAt}>
              {new Date(post.publishedAt).toLocaleDateString()}
            </time>
          )}
          {post.readingTime && (
            <span data-larkup="reading-time">{post.readingTime} min read</span>
          )}
          {post.category && <span data-larkup="category">{post.category}</span>}
        </div>
      </header>

      {post.contentHtml ? (
        <div
          className={prose ? "larkup-prose" : undefined}
          dangerouslySetInnerHTML={{ __html: post.contentHtml }}
        />
      ) : null}
    </article>
  );
}
