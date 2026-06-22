"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LarkupBlogClient = void 0;
class LarkupBlogClient {
    constructor(options) {
        if (!options.apiKey)
            throw new Error("API Key is required");
        if (!options.studioUrl)
            throw new Error("Studio URL is required");
        this.apiKey = options.apiKey;
        this.studioUrl = options.studioUrl.replace(/\/$/, "");
    }
    get headers() {
        return {
            "x-api-key": this.apiKey,
            "Content-Type": "application/json",
        };
    }
    async getPosts({ preview = false } = {}) {
        const url = `${this.studioUrl}/api/v1/blogs${preview ? "?preview=true" : ""}`;
        const res = await fetch(url, { headers: this.headers });
        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Failed to fetch posts: ${res.status} ${err}`);
        }
        const data = await res.json();
        return data.posts;
    }
    async getPostBySlug(slug, { preview = false } = {}) {
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
exports.LarkupBlogClient = LarkupBlogClient;
//# sourceMappingURL=client.js.map