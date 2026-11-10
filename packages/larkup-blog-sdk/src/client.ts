export interface Post {
  id: number;
  title: string;
  slug: string;
  content?: any;
  contentHtml?: string;
  coverImage?: string;
  category?: string;
  authorName?: string;
  authorImage?: string;
  readingTime?: number;
  published: boolean;
  publishedAt?: string;
  updatedAt: string;
  showCover?: boolean;
  coverSize?: "small" | "medium" | "large";
  coverFit?: "cover" | "contain";
  coverZoom?: number;
  coverX?: number;
  coverY?: number;
  showToc?: boolean;
  isMain?: boolean;
}

export interface LarkupBlogOptions {
  /**
   * Workspace API key. Use a publishable key (`pk_…`) in the browser — it can
   * only read published posts. Use a secret key (`sk_…`) server-side to also
   * read drafts (`preview: true`). The key is sent in the Authorization header,
   * never the query string.
   */
  apiKey: string;
  studioUrl: string;
}

export class LarkupBlogClient {
  private apiKey: string;
  readonly studioUrl: string;

  constructor(options: LarkupBlogOptions) {
    if (!options.apiKey) throw new Error("API Key is required");
    if (!options.studioUrl) throw new Error("Studio URL is required");

    this.apiKey = options.apiKey;
    this.studioUrl = options.studioUrl.replace(/\/$/, "");
  }

  private get headers() {
    return {
      // Preferred: Authorization header. x-api-key kept for compatibility.
      Authorization: `Bearer ${this.apiKey}`,
      "x-api-key": this.apiKey,
      "Content-Type": "application/json",
    };
  }

  async getPosts({
    preview = false,
    category,
    page,
    limit,
  }: {
    preview?: boolean;
    category?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<Post[]> {
    const params = new URLSearchParams();
    if (preview) params.set("preview", "true");
    if (category) params.set("category", category);
    if (page !== undefined) params.set("page", String(page));
    if (limit !== undefined) params.set("limit", String(limit));

    const qs = params.toString();
    const url = `${this.studioUrl}/api/v1/blogs${qs ? `?${qs}` : ""}`;
    const res = await fetch(url, { headers: this.headers });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to fetch posts: ${res.status} ${err}`);
    }

    const data = await res.json();
    return data.posts;
  }

  async getPostBySlug(
    slug: string,
    { preview = false }: { preview?: boolean } = {},
  ): Promise<Post> {
    const url = `${this.studioUrl}/api/v1/blogs/${slug}${preview ? "?preview=true" : ""}`;
    const res = await fetch(url, { headers: this.headers });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to fetch post: ${res.status} ${err}`);
    }

    const data = await res.json();
    return data.post;
  }

  /**
   * Returns all distinct categories that have at least one published post.
   * Use this to build navigation tabs — only categories with content are returned.
   */
  async getCategories(): Promise<string[]> {
    const url = `${this.studioUrl}/api/v1/blogs/categories`;
    const res = await fetch(url, { headers: this.headers });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to fetch categories: ${res.status} ${err}`);
    }

    const data = await res.json();
    return data.categories ?? [];
  }
}
