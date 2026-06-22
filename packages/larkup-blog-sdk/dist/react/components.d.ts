import React, { CSSProperties } from "react";
import { Post } from "../client";
interface BaseProps {
    className?: string;
    style?: CSSProperties;
    prose?: boolean;
    renderLoading?: () => React.ReactNode;
    renderError?: (err: Error) => React.ReactNode;
}
type LarkupArticleProps = (BaseProps & {
    slug: string;
    post?: never;
    preview?: boolean;
}) | (BaseProps & {
    post: Post;
    slug?: never;
    preview?: never;
});
export declare function LarkupArticle({ className, style, prose, renderLoading, renderError, ...rest }: LarkupArticleProps): React.JSX.Element;
export {};
//# sourceMappingURL=components.d.ts.map