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
}

export interface LarkupBlogOptions {
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
      "x-api-key": this.apiKey,
      "Content-Type": "application/json",
    };
  }

  async getPosts({ preview = false }: { preview?: boolean } = {}): Promise<
    Post[]
  > {
    const url = `${this.studioUrl}/api/v1/blogs${preview ? "?preview=true" : ""}`;
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
}
