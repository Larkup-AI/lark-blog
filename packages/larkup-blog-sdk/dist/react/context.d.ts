import React from "react";
import { LarkupBlogClient, Post } from "../client";
export declare function useLarkupClient(): LarkupBlogClient;
interface LarkupProviderProps {
    client: LarkupBlogClient;
    children: React.ReactNode;
}
export declare function LarkupProvider({ client, children }: LarkupProviderProps): React.JSX.Element;
interface AsyncState<T> {
    data: T | null;
    loading: boolean;
    error: Error | null;
}
export declare function usePosts({ preview, }?: {
    preview?: boolean;
}): AsyncState<Post[]>;
export declare function usePost(slug: string, { preview }?: {
    preview?: boolean;
}): AsyncState<Post>;
export {};
//# sourceMappingURL=context.d.ts.map