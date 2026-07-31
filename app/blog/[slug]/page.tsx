import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { ArticleToc } from "@/components/blog/article-toc";
import { ArticleContent } from "@/components/blog/article-content";
import { CopyUrlButton } from "@/components/blog/copy-url-button";
import { ShareButtons } from "@/components/blog/share-buttons";
import { TocSheet } from "@/components/blog/toc-sheet";
import { AnalyticsTracker } from "@/components/blog/analytics-tracker";
import { getPublishedPostBySlug, formatDate } from "@/lib/posts";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) return { title: "Not found" };
  return {
    title: post.title,
    openGraph: {
      title: post.title,
      type: "article",
      images: post.coverImage ? [{ url: post.coverImage }] : undefined,
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) notFound();

  const author = post.authorName ?? "Admin";

  return (
    <div className="min-h-svh">
      <AnalyticsTracker postId={post.id} />
      <SiteHeader />
      <main>
        {/* ── Centered editorial header ─────────────────────────────── */}
        <header>
          <div className="mx-auto max-w-4xl px-6 pt-10 md:pt-14">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              All writing
            </Link>

            <div className="mt-10 text-center md:mt-12">
              <span className="text-sm text-muted-foreground">
                Blog{post.category ? ` / ${post.category}` : ""}
              </span>
              <h1 className="mx-auto mt-4 max-w-4xl text-balance font-sans text-2xl font-bold leading-[1.1] tracking-tight text-foreground md:text-3xl lg:text-5xl">
                {post.title}
              </h1>

              {/* Author */}
              <div className="mt-6 flex items-center justify-center gap-2.5">
                {post.authorImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.authorImage}
                    alt={author}
                    className="h-7 w-7 rounded-full object-cover border border-border"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background"
                  >
                    {author.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="text-sm font-semibold text-foreground">
                  {author}
                </span>
              </div>
            </div>

            {/* Meta row */}
            <div className="mt-10 flex items-center justify-between border-b border-border pb-6 text-sm text-muted-foreground md:mt-12">
              <div className="flex items-center gap-4">
                {post.readingTime && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {post.readingTime} min read
                  </span>
                )}
                <CopyUrlButton />
              </div>
              <span>{formatDate(post.publishedAt)}</span>
            </div>
          </div>
        </header>

        {/* ── Cover image ────────────────────────────────────────────── */}
        {post.showCover && post.coverImage && (
          <div>
            <div className="mx-auto max-w-4xl px-6 py-10">
              <div
                className={cn(
                  "w-full overflow-hidden rounded-xl",
                  post.coverFit === "cover" &&
                    post.coverSize === "small" &&
                    "aspect-3/1",
                  post.coverFit === "cover" &&
                    post.coverSize === "medium" &&
                    "aspect-2/1",
                  post.coverFit === "cover" &&
                    post.coverSize === "large" &&
                    "aspect-16/10",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.coverImage || "/placeholder.svg"}
                  alt="Cover"
                  style={{
                    width: "100%",
                    height: post.coverFit === "contain" ? "auto" : "100%",
                    objectFit:
                      post.coverFit === "contain" ? "contain" : "cover",
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
        {post.showToc ? (
          /*
            Outer wrapper is full-width so the sticky sidebar can sit beside
            the centered article without being clipped by overflow:hidden.
            We use a flex row: a spacer | article (max-w-4xl) | sidebar
            The two invisible spacers mirror each other so the article stays
            perfectly centered regardless of sidebar width.
          */
          <div className="flex justify-center gap-8 px-6 py-10 md:py-14">
            {/* Left spacer — mirrors sidebar width on xl, collapses otherwise */}
            <div className="hidden xl:block w-52 shrink-0" />

            {/* Article — always centered, never wider than 2xl */}
            <div className="min-w-0 w-full max-w-4xl">
              <ArticleContent
                id="article-body"
                html={post.contentHtml ?? ""}
                className="prose-editorial"
              />
              <div className="mt-10 border-t border-border pt-8">
                <ShareButtons title={post.title} />
              </div>
            </div>

            {/* Sticky sidebar — only visible xl+ */}
            <aside className="hidden xl:block w-52 shrink-0">
              <div className="sticky top-24 flex flex-col gap-10">
                <ArticleToc />
                <ShareButtons title={post.title} />
              </div>
            </aside>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl px-6 py-10 md:py-14">
            <ArticleContent
              id="article-body"
              html={post.contentHtml ?? ""}
              className="prose-editorial"
            />
            <div className="mt-10 border-t border-border pt-8">
              <ShareButtons title={post.title} />
            </div>
          </div>
        )}

        {/* ── Mobile ToC sheet (shown only when showToc && < xl) ────── */}
        {post.showToc && <TocSheet title={post.title} />}
      </main>
    </div>
  );
}
