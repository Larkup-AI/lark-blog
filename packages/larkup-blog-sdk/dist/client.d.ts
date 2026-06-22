export interface Post {
    id: number;
    title: string;
    slug: string;
    content?: any;
    contentHtml?: string;
    coverImage?: string;
    category?: string;
    authorName?: string;
    readingTime?: number;
    published: boolean;
    publishedAt?: string;
    updatedAt: string;
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