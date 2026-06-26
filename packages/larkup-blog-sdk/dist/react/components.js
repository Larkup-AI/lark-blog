"use strict";
"use client";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LarkupArticle = LarkupArticle;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const context_1 = require("./context");
const styles_1 = require("./styles");
const toc_1 = require("./toc");
function cx(...names) {
    return names.filter(Boolean).join(" ");
}
/**
 * Renders a full-featured blog article with header, cover image,
 * prose content, and optional table-of-contents sidebar.
 *
 * Accepts either a pre-fetched `post` object or a `slug` to
 * auto-fetch via the `<LarkupProvider>` context.
 */
function LarkupArticle(_a) {
    var { className, style, prose = true, renderLoading, renderError, showHeader = true, showAuthor = true, showAuthorImage = true, showReadingTime = true, showDate = true, showCategory = true, showCover = true, showToc = true, classNames = {}, maxWidth } = _a, rest = __rest(_a, ["className", "style", "prose", "renderLoading", "renderError", "showHeader", "showAuthor", "showAuthorImage", "showReadingTime", "showDate", "showCategory", "showCover", "showToc", "classNames", "maxWidth"]);
    const baseProps = {
        className,
        style,
        prose,
        showHeader,
        showAuthor,
        showAuthorImage,
        showReadingTime,
        showDate,
        showCategory,
        showCover,
        showToc,
        classNames,
        maxWidth,
    };
    if ("post" in rest && rest.post) {
        return (0, jsx_runtime_1.jsx)(ArticleView, Object.assign({ post: rest.post }, baseProps));
    }
    return ((0, jsx_runtime_1.jsx)(FetchingArticle, Object.assign({ slug: rest.slug, preview: rest.preview, renderLoading: renderLoading, renderError: renderError }, baseProps)));
}
// ─── Auto-fetching wrapper ──────────────────────────────────────────────
function FetchingArticle(_a) {
    var { slug, preview, renderLoading, renderError } = _a, viewProps = __rest(_a, ["slug", "preview", "renderLoading", "renderError"]);
    const { data: post, loading, error } = (0, context_1.usePost)(slug, { preview });
    if (loading) {
        return renderLoading ? ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: renderLoading() })) : ((0, jsx_runtime_1.jsx)("div", { style: { background: "transparent" }, "aria-busy": "true", "aria-label": "Loading article" }));
    }
    if (error) {
        return renderError ? ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: renderError(error) })) : ((0, jsx_runtime_1.jsxs)("p", { style: { color: "red" }, children: ["Failed to load article: ", error.message] }));
    }
    if (!post)
        return null;
    return (0, jsx_runtime_1.jsx)(ArticleView, Object.assign({ post: post }, viewProps));
}
// ─── Article renderer ───────────────────────────────────────────────────
function ArticleView({ post, className, style, prose, showHeader, showAuthor, showAuthorImage, showReadingTime, showDate, showCategory, showCover, showToc, classNames = {}, maxWidth, }) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const contentRef = (0, react_1.useRef)(null);
    const finalShowCover = showCover && ((_a = post.showCover) !== null && _a !== void 0 ? _a : true);
    const finalShowToc = showToc && ((_b = post.showToc) !== null && _b !== void 0 ? _b : true);
    const author = (_c = post.authorName) !== null && _c !== void 0 ? _c : "Admin";
    const coverFit = (_d = post.coverFit) !== null && _d !== void 0 ? _d : "cover";
    const shouldConstrainAspect = coverFit === "cover";
    // Build inline style, injecting the CSS variable when maxWidth is set
    const articleStyle = Object.assign({}, style);
    if (maxWidth) {
        articleStyle["--larkup-max-width"] = maxWidth;
    }
    return ((0, jsx_runtime_1.jsxs)("article", { className: cx("larkup-layout", className, classNames.article), style: articleStyle, "data-larkup-article": post.slug, children: [prose && (0, jsx_runtime_1.jsx)("style", { dangerouslySetInnerHTML: { __html: styles_1.DEFAULT_STYLES } }), showHeader && ((0, jsx_runtime_1.jsxs)("header", { className: cx("larkup-header-wrapper", classNames.header), children: [showCategory && ((0, jsx_runtime_1.jsxs)("span", { className: cx("larkup-category", classNames.category), children: ["Blog", post.category ? ` / ${post.category}` : ""] })), (0, jsx_runtime_1.jsx)("h1", { className: cx("larkup-title", classNames.title), children: post.title }), showAuthor && ((0, jsx_runtime_1.jsxs)("div", { className: cx("larkup-author-wrapper", classNames.authorWrapper), children: [showAuthorImage && post.authorImage ? ((0, jsx_runtime_1.jsx)("img", { src: post.authorImage, alt: author, className: "larkup-author-avatar" })) : ((0, jsx_runtime_1.jsx)("span", { className: "larkup-author-initial", "aria-hidden": "true", children: author.charAt(0).toUpperCase() })), (0, jsx_runtime_1.jsx)("span", { className: cx("larkup-author-name", classNames.authorName), children: author })] })), (0, jsx_runtime_1.jsxs)("div", { className: cx("larkup-meta-row", classNames.metaContainer), children: [(0, jsx_runtime_1.jsx)("div", { className: "larkup-meta-left", children: showReadingTime && post.readingTime != null && ((0, jsx_runtime_1.jsxs)("span", { className: cx("larkup-meta-item", classNames.metaItem), children: [(0, jsx_runtime_1.jsxs)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [(0, jsx_runtime_1.jsx)("circle", { cx: "12", cy: "12", r: "10" }), (0, jsx_runtime_1.jsx)("polyline", { points: "12 6 12 12 16 14" })] }), post.readingTime, " min read"] })) }), showDate && post.publishedAt && ((0, jsx_runtime_1.jsx)("time", { dateTime: post.publishedAt, children: new Date(post.publishedAt).toLocaleDateString(undefined, {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                }) }))] })] })), finalShowCover && post.coverImage && ((0, jsx_runtime_1.jsx)("div", { className: cx("larkup-cover-section", classNames.coverSection), children: (0, jsx_runtime_1.jsx)("div", { className: cx("larkup-cover-inner", classNames.coverInner), children: (0, jsx_runtime_1.jsx)("div", { className: shouldConstrainAspect
                            ? `larkup-cover-${post.coverSize || "large"}`
                            : undefined, style: {
                            overflow: "hidden",
                            borderRadius: "0.75rem",
                            width: "100%",
                        }, children: (0, jsx_runtime_1.jsx)("img", { src: post.coverImage, alt: post.title, className: cx("larkup-cover", classNames.coverImage), style: {
                                width: "100%",
                                height: coverFit === "contain" ? "auto" : "100%",
                                objectFit: coverFit === "contain" ? "contain" : "cover",
                                objectPosition: `${(_e = post.coverX) !== null && _e !== void 0 ? _e : 50}% ${(_f = post.coverY) !== null && _f !== void 0 ? _f : 50}%`,
                                transform: `scale(${(_g = post.coverZoom) !== null && _g !== void 0 ? _g : 1})`,
                                transformOrigin: `${(_h = post.coverX) !== null && _h !== void 0 ? _h : 50}% ${(_j = post.coverY) !== null && _j !== void 0 ? _j : 50}%`,
                            } }) }) }) })), (0, jsx_runtime_1.jsxs)("div", { className: cx("larkup-body-layout", classNames.bodyLayout), children: [finalShowToc && (0, jsx_runtime_1.jsx)("div", { className: "larkup-spacer" }), (0, jsx_runtime_1.jsx)("div", { className: cx("larkup-article-content", classNames.content), children: post.contentHtml ? ((0, jsx_runtime_1.jsx)("div", { ref: contentRef, className: cx(prose ? "larkup-prose" : undefined, classNames.content), dangerouslySetInnerHTML: { __html: post.contentHtml } })) : null }), finalShowToc && ((0, jsx_runtime_1.jsx)("aside", { className: cx("larkup-sidebar", classNames.sidebar), children: (0, jsx_runtime_1.jsx)("div", { className: cx("larkup-sidebar-sticky", classNames.sidebarSticky), children: (0, jsx_runtime_1.jsx)(toc_1.LarkupToc, { contentRef: contentRef, classNames: classNames }) }) }))] }), finalShowToc && (0, jsx_runtime_1.jsx)(toc_1.LarkupMobileToc, { contentRef: contentRef })] }));
}
//# sourceMappingURL=components.js.map