import { LarkupClassNames, LarkupArticleProps } from "./types";
export type { LarkupClassNames };
/**
 * Renders a full-featured blog article with header, cover image,
 * prose content, and optional table-of-contents sidebar.
 *
 * Accepts either a pre-fetched `post` object or a `slug` to
 * auto-fetch via the `<LarkupProvider>` context.
 */
export declare function LarkupArticle({ className, style, prose, renderLoading, renderError, showHeader, showAuthor, showAuthorImage, showReadingTime, showDate, showCategory, showCover, showToc, classNames, maxWidth, ...rest }: LarkupArticleProps): import("react").JSX.Element;
//# sourceMappingURL=components.d.ts.map