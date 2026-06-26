import React, { CSSProperties } from "react";
import { Post } from "../client";
export interface LarkupClassNames {
    article?: string;
    header?: string;
    title?: string;
    metaContainer?: string;
    metaItem?: string;
    coverImage?: string;
    content?: string;
}
interface BaseProps {
    className?: string;
    style?: CSSProperties;
    prose?: boolean;
    renderLoading?: () => React.ReactNode;
    renderError?: (err: Error) => React.ReactNode;
    showHeader?: boolean;
    showAuthor?: boolean;
    showAuthorImage?: boolean;
    showReadingTime?: boolean;
    showDate?: boolean;
    showCategory?: boolean;
    showCover?: boolean;
    showToc?: boolean;
    classNames?: LarkupClassNames;
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
export declare function LarkupArticle({ className, style, prose, renderLoading, renderError, showHeader, showAuthor, showAuthorImage, showReadingTime, showDate, showCategory, showCover, showToc, classNames, ...rest }: LarkupArticleProps): React.JSX.Element;
export {};
//# sourceMappingURL=components.d.ts.map