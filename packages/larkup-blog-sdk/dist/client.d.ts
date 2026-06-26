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
    apiKey: string;
    studioUrl: string;
}
export declare class LarkupBlogClient {
    private apiKey;
    readonly studioUrl: string;
    constructor(options: LarkupBlogOptions);
    private get headers();
    getPosts({ preview }?: {
        preview?: boolean;
    }): Promise<Post[]>;
    getPostBySlug(slug: string, { preview }?: {
        preview?: boolean;
    }): Promise<Post>;
}
//# sourceMappingURL=client.d.ts.map