"use strict";
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
const context_1 = require("./context");
function LarkupArticle(_a) {
    var { className, style, prose = true, renderLoading, renderError } = _a, rest = __rest(_a, ["className", "style", "prose", "renderLoading", "renderError"]);
    if ("post" in rest && rest.post) {
        return ((0, jsx_runtime_1.jsx)(ArticleView, { post: rest.post, className: className, style: style, prose: prose }));
    }
    return ((0, jsx_runtime_1.jsx)(FetchingArticle, { slug: rest.slug, preview: rest.preview, className: className, style: style, prose: prose, renderLoading: renderLoading, renderError: renderError }));
}
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
function ArticleView({ post, className, style, prose }) {
    return ((0, jsx_runtime_1.jsxs)("article", { className: className, style: Object.assign({ background: "transparent" }, style), "data-larkup-article": post.slug, children: [post.coverImage && ((0, jsx_runtime_1.jsx)("img", { src: post.coverImage, alt: post.title, style: { width: "100%", display: "block" } })), (0, jsx_runtime_1.jsxs)("header", { children: [(0, jsx_runtime_1.jsx)("h1", { children: post.title }), (0, jsx_runtime_1.jsxs)("div", { style: { display: "flex", gap: "0.5rem", flexWrap: "wrap" }, children: [post.authorName && ((0, jsx_runtime_1.jsx)("span", { "data-larkup": "author", children: post.authorName })), post.publishedAt && ((0, jsx_runtime_1.jsx)("time", { dateTime: post.publishedAt, children: new Date(post.publishedAt).toLocaleDateString() })), post.readingTime && ((0, jsx_runtime_1.jsxs)("span", { "data-larkup": "reading-time", children: [post.readingTime, " min read"] })), post.category && (0, jsx_runtime_1.jsx)("span", { "data-larkup": "category", children: post.category })] })] }), post.contentHtml ? ((0, jsx_runtime_1.jsx)("div", { className: prose ? "larkup-prose" : undefined, dangerouslySetInnerHTML: { __html: post.contentHtml } })) : null] }));
}
//# sourceMappingURL=components.js.map