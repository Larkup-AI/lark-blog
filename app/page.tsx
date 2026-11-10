import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, ArrowUpRight, PlusIcon } from "lucide-react";
import { getSession, isAdminEmail } from "@/lib/admin";
import { getPaginatedPosts, getPostCounts } from "@/app/actions/posts";
import { formatDate } from "@/lib/posts";
import { DashboardActions } from "@/components/blogs/dashboard-actions";
import { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { brand } from "@/lib/config";

export const metadata: Metadata = {
  title: "Blog",
  description: "Notes, releases, and engineering writing.",
};
export const dynamic = "force-dynamic";

export default async function AdminDashboard(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/blogs/sign-in");

  const searchParams = await props.searchParams;
  const pageStr = searchParams?.page;
  const filter = searchParams?.filter;
  const page =
    typeof pageStr === "string" ? Math.max(1, parseInt(pageStr, 10) || 1) : 1;
  const PAGE_SIZE = 10;

  const authorIdFilter = filter === "mine" ? session.user.id : undefined;

  // Run independent queries concurrently instead of awaiting them in series.
  const [counts, posts] = await Promise.all([
    getPostCounts(authorIdFilter),
    getPaginatedPosts(page, PAGE_SIZE, authorIdFilter),
  ]);
  const { total, publishedCount, draftCount } = counts;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-svh bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <img src={brand.logo} className="size-7" alt={brand.shortName} />
            <span className="font-serif text-2xl tracking-tight text-foreground">
              {brand.shortName}
            </span>
            <span className="hidden font-mono text-xs uppercase tracking-widest text-muted-foreground sm:inline">
              Blog Studio
            </span>
          </div>
          <DashboardActions />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-sans text-3xl font-medium tracking-tight text-foreground">
              Posts
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {total} total · {publishedCount} published · {draftCount} draft
              {draftCount === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={filter === "mine" ? "secondary" : "outline"}
              size="sm"
              asChild
            >
              <Link href={filter === "mine" ? "/" : "/?filter=mine"}>
                {filter === "mine" ? "Show All Posts" : "Show My Posts"}
              </Link>
            </Button>
          </div>
        </div>

        {posts.length === 0 ? (
          <div className="mt-10 flex flex-col items-center justify-center rounded-xl  border-dashed border-border py-20 text-center">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">
              No posts yet. Create your first one to get started.
            </p>
            {/* <Button className="mt-4">
              <PlusIcon className="h-4 w-4 mr-0" />
              New Post
            </Button> */}
          </div>
        ) : (
          <>
            <div className="mt-8 overflow-hidden rounded-xl border border-border">
              {posts.map((post, i) => (
                <Link
                  key={post.id}
                  href={`/blogs/${post.id}`}
                  className={`flex items-center justify-between gap-4 bg-background px-5 py-4 transition-colors duration-150 hover:bg-secondary ${
                    i > 0 ? "border-t border-border" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className="truncate font-sans text-base font-medium text-foreground">
                        {post.title}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0 font-mono text-[0.6rem] uppercase tracking-wider ${
                          post.published
                            ? "bg-emerald-50 border border-emerald-200 text-emerald-600"
                            : "bg-secondary text-muted-foreground border border-border"
                        }`}
                      >
                        {post.published ? "Published" : "Draft"}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {post.category ? `${post.category} · ` : ""}
                      Updated {formatDate(post.updatedAt)}
                    </p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                <Link
                  href={page > 1 ? `/?page=${page - 1}` : "#"}
                  className={`inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary/50 ${
                    page <= 1 ? "pointer-events-none opacity-50" : ""
                  }`}
                >
                  Previous
                </Link>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Link
                  href={page < totalPages ? `/?page=${page + 1}` : "#"}
                  className={`inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary/50 ${
                    page >= totalPages ? "pointer-events-none opacity-50" : ""
                  }`}
                >
                  Next
                </Link>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
