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
const DEFAULT_STYLES = `
.larkup-prose { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 1.0625rem; color: #374151; line-height: 1.75; }
.larkup-prose h1 { font-size: 2.25rem; font-weight: 600; margin-top: 3rem; margin-bottom: 0.75rem; color: #111827; line-height: 1.2; }
.larkup-prose h2 { font-size: 1.5rem; font-weight: 500; margin-top: 3rem; margin-bottom: 0.5rem; color: #111827; }
.larkup-prose h3 { font-size: 1.25rem; font-weight: 500; margin-top: 2.5rem; margin-bottom: 0.25rem; color: #111827; }
.larkup-prose p { margin-top: 1.25em; margin-bottom: 1.25em; }
.larkup-prose a { color: #111827; text-decoration: underline; text-underline-offset: 3px; }
.larkup-prose ul { list-style-type: disc; padding-left: 1.5rem; margin-top: 1.25em; margin-bottom: 1.25em; }
.larkup-prose ol { list-style-type: decimal; padding-left: 1.5rem; margin-top: 1.25em; margin-bottom: 1.25em; }
.larkup-prose blockquote { border-left-width: 2px; border-left-color: #d1d5db; padding-left: 1.25rem; font-style: italic; color: #4b5563; }
.larkup-prose img { border-radius: 0.5rem; border: 1px solid #e5e7eb; display: block; max-width: 100%; height: auto; margin-left: auto; margin-right: auto; }
.larkup-prose pre { border-radius: 0.5rem; background-color: #1f2937; color: #f9fafb; padding: 1rem; overflow-x: auto; font-family: ui-monospace, monospace; font-size: 0.875rem; }
.larkup-prose code { font-family: ui-monospace, monospace; font-size: 0.875em; }
.larkup-prose :not(pre) > code { background-color: #f3f4f6; padding: 0.125rem 0.375rem; border-radius: 0.25rem; }
.larkup-prose iframe { border-radius: 0.5rem; border: 1px solid #e5e7eb; width: 100%; aspect-ratio: 16 / 9; }
.larkup-prose hr { border-color: #e5e7eb; margin-top: 2.5rem; margin-bottom: 2.5rem; }
.larkup-prose table { width: 100%; border-collapse: collapse; margin-top: 1.25em; margin-bottom: 1.25em; font-size: 0.875rem; }
.larkup-prose table th, .larkup-prose table td { border: 1px solid #e5e7eb; padding: 0.5rem 0.75rem; text-align: left; vertical-align: top; }
.larkup-prose table th { background-color: #f9fafb; font-weight: 500; color: #111827; }

/* Layout styling */
.larkup-layout { font-family: ui-sans-serif, system-ui, sans-serif; color: #111827; width: 100%; }
.larkup-header-wrapper { max-width: 56rem; margin: 0 auto; padding: 2.5rem 1.5rem 0; text-align: center; }
.larkup-category { font-size: 0.875rem; color: #6b7280; display: block; margin-bottom: 1rem; }
.larkup-title { font-size: 2rem; font-weight: 700; line-height: 1.1; letter-spacing: -0.025em; color: #111827; margin: 0 auto; max-width: 56rem; text-wrap: balance; }
@media (min-width: 768px) { .larkup-title { font-size: 1.875rem; } }
@media (min-width: 1024px) { .larkup-title { font-size: 3rem; } }
.larkup-author-wrapper { margin-top: 1.5rem; display: flex; align-items: center; justify-content: center; gap: 0.625rem; }
.larkup-author-avatar { width: 1.75rem; height: 1.75rem; border-radius: 9999px; object-fit: cover; border: 1px solid #e5e7eb; }
.larkup-author-initial { display: flex; align-items: center; justify-content: center; width: 1.75rem; height: 1.75rem; border-radius: 9999px; background-color: #111827; color: #f9fafb; font-size: 0.75rem; font-weight: 600; }
.larkup-author-name { font-size: 0.875rem; font-weight: 600; color: #111827; }
.larkup-meta-row { margin-top: 2.5rem; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e5e7eb; padding-bottom: 1.5rem; font-size: 0.875rem; color: #6b7280; }
.larkup-meta-left { display: flex; align-items: center; gap: 1rem; }

.larkup-cover-section { border-bottom: 1px solid #e5e7eb; }
.larkup-cover-inner { max-width: 56rem; margin: 0 auto; padding: 2.5rem 1.5rem; }
.larkup-cover { width: 100%; border-radius: 0.75rem; border: 1px solid #e5e7eb; object-fit: cover; }
.larkup-cover-small { aspect-ratio: 3/1; }
.larkup-cover-medium { aspect-ratio: 2/1; }
.larkup-cover-large { aspect-ratio: 16/10; }

.larkup-body-layout { display: flex; justify-content: center; gap: 2rem; padding: 2.5rem 1.5rem; }
.larkup-spacer { display: none; width: 13rem; flex-shrink: 0; }
.larkup-article-content { min-width: 0; width: 100%; max-width: 56rem; }
.larkup-sidebar { display: none; width: 13rem; flex-shrink: 0; }
.larkup-sidebar-sticky { position: sticky; top: 6rem; display: flex; flex-direction: column; gap: 2.5rem; }
@media (min-width: 1280px) { .larkup-spacer, .larkup-sidebar { display: block; } }

.larkup-toc-title { font-family: ui-monospace, monospace; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; margin-bottom: 0.75rem; display: block; }
.larkup-toc-list { display: flex; flex-direction: column; gap: 0.625rem; border-left: 1px solid #e5e7eb; list-style: none; padding: 0; margin: 0; }
.larkup-toc-item { margin: 0; }
.larkup-toc-item-level-3 { margin-left: 0.75rem; }
.larkup-toc-link { display: block; margin-left: -1px; border-left: 2px solid transparent; padding-left: 1rem; font-size: 0.875rem; line-height: 1.375; color: #6b7280; text-decoration: none; transition: color 0.2s, border-color 0.2s; }
.larkup-toc-link:hover { color: #111827; }
.larkup-toc-link-active { border-left-color: #111827; color: #111827; font-weight: 500; }

/* Mobile TOC floating button + slide-over panel */
.larkup-mobile-toc-btn { display: inline-flex; align-items: center; gap: 0.5rem; position: fixed; bottom: 1.5rem; right: 1rem; z-index: 40; padding: 0.5rem 0.875rem; font-size: 0.875rem; font-weight: 500; font-family: ui-sans-serif, system-ui, sans-serif; color: #111827; background: #fff; border: 1px solid #e5e7eb; border-radius: 0.5rem; box-shadow: 0 4px 12px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.06); cursor: pointer; transition: background 0.15s, box-shadow 0.15s; }
.larkup-mobile-toc-btn:hover { background: #f9fafb; box-shadow: 0 6px 16px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.08); }
@media (min-width: 1280px) { .larkup-mobile-toc-btn { display: none; } }
.larkup-mobile-toc-overlay { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.4); opacity: 0; pointer-events: none; transition: opacity 0.25s ease; }
.larkup-mobile-toc-overlay-open { opacity: 1; pointer-events: auto; }
.larkup-mobile-toc-panel { position: fixed; top: 0; right: 0; bottom: 0; z-index: 51; width: 18rem; background: #fff; box-shadow: -4px 0 24px rgba(0,0,0,0.12); transform: translateX(100%); transition: transform 0.3s cubic-bezier(0.22,1,0.36,1); overflow-y: auto; padding: 2rem 1.5rem; }
.larkup-mobile-toc-panel-open { transform: translateX(0); }
.larkup-mobile-toc-close { position: absolute; top: 1rem; right: 1rem; width: 2rem; height: 2rem; display: flex; align-items: center; justify-content: center; border-radius: 0.375rem; border: none; background: transparent; cursor: pointer; color: #6b7280; font-size: 1.25rem; transition: background 0.15s; }
.larkup-mobile-toc-close:hover { background: #f3f4f6; }
.larkup-mobile-toc-heading { font-family: ui-monospace, monospace; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; margin-bottom: 1rem; }

@media (prefers-color-scheme: dark) {
  .larkup-prose { color: #d1d5db; }
  .larkup-prose h1, .larkup-prose h2, .larkup-prose h3 { color: #f9fafb; }
  .larkup-prose a { color: #f9fafb; }
  .larkup-prose blockquote { border-left-color: #4b5563; color: #9ca3af; }
  .larkup-prose img, .larkup-prose iframe, .larkup-prose hr, .larkup-prose table th, .larkup-prose table td { border-color: #374151; }
  .larkup-prose :not(pre) > code { background-color: #374151; }
  .larkup-prose table th { background-color: #1f2937; color: #f9fafb; }

  .larkup-layout { color: #f9fafb; }
  .larkup-category { color: #9ca3af; }
  .larkup-title { color: #f9fafb; }
  .larkup-author-avatar { border-color: #374151; }
  .larkup-author-initial { background-color: #f9fafb; color: #111827; }
  .larkup-author-name { color: #f9fafb; }
  .larkup-meta-row { border-color: #374151; color: #9ca3af; }
  .larkup-cover-section { border-color: #374151; }
  .larkup-cover { border-color: #374151; }
  .larkup-toc-title { color: #9ca3af; }
  .larkup-toc-list { border-color: #374151; }
  .larkup-toc-link { color: #9ca3af; }
  .larkup-toc-link:hover { color: #f9fafb; }
  .larkup-toc-link-active { border-left-color: #f9fafb; color: #f9fafb; }

  .larkup-mobile-toc-btn { background: #1f2937; color: #f9fafb; border-color: #374151; }
  .larkup-mobile-toc-btn:hover { background: #374151; }
  .larkup-mobile-toc-panel { background: #1f2937; }
  .larkup-mobile-toc-close { color: #9ca3af; }
  .larkup-mobile-toc-close:hover { background: #374151; }
  .larkup-mobile-toc-heading { color: #9ca3af; }
}
`;
function LarkupToc({ contentRef, onNavigate, hideTitle, }) {
    const [headings, setHeadings] = (0, react_1.useState)([]);
    const [activeId, setActiveId] = (0, react_1.useState)("");
    (0, react_1.useEffect)(() => {
        const article = contentRef.current;
        if (!article)
            return;
        const updateHeadings = () => {
            const nodes = Array.from(article.querySelectorAll("h1, h2, h3"));
            const items = nodes.map((node, i) => {
                var _a, _b;
                if (!node.id) {
                    node.id =
                        ((_a = node.textContent) === null || _a === void 0 ? void 0 : _a.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")) || `section-${i}`;
                }
                return {
                    id: node.id,
                    text: (_b = node.textContent) !== null && _b !== void 0 ? _b : "",
                    level: node.tagName === "H1" ? 1 : node.tagName === "H3" ? 3 : 2,
                };
            });
            setHeadings(items);
            return nodes;
        };
        let nodes = updateHeadings();
        const onScroll = () => {
            var _a, _b;
            const scrollY = window.scrollY + 120;
            let current = (_b = (_a = nodes[0]) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : "";
            for (const node of nodes) {
                if (node.getBoundingClientRect().top + window.scrollY <= scrollY) {
                    current = node.id;
                }
            }
            setActiveId(current);
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
        const mutationObserver = new MutationObserver(() => {
            nodes = updateHeadings();
            onScroll();
        });
        mutationObserver.observe(article, {
            childList: true,
            subtree: true,
            characterData: true,
        });
        return () => {
            window.removeEventListener("scroll", onScroll);
            mutationObserver.disconnect();
        };
    }, [contentRef]);
    if (headings.length === 0)
        return null;
    return ((0, jsx_runtime_1.jsxs)("nav", { "aria-label": "Table of contents", children: [!hideTitle && (0, jsx_runtime_1.jsx)("span", { className: "larkup-toc-title", children: "On this page" }), (0, jsx_runtime_1.jsx)("ul", { className: "larkup-toc-list", children: headings.map((h) => ((0, jsx_runtime_1.jsx)("li", { className: [
                        "larkup-toc-item",
                        h.level === 3 ? "larkup-toc-item-level-3" : undefined,
                    ]
                        .filter(Boolean)
                        .join(" "), children: (0, jsx_runtime_1.jsx)("a", { href: `#${h.id}`, onClick: (e) => {
                            var _a;
                            e.preventDefault();
                            (_a = document
                                .getElementById(h.id)) === null || _a === void 0 ? void 0 : _a.scrollIntoView({ behavior: "smooth" });
                            onNavigate === null || onNavigate === void 0 ? void 0 : onNavigate();
                        }, className: [
                            "larkup-toc-link",
                            activeId === h.id ? "larkup-toc-link-active" : undefined,
                        ]
                            .filter(Boolean)
                            .join(" "), children: h.text }) }, h.id))) })] }));
}
function LarkupMobileToc({ contentRef, buttonClassName, buttonStyle, }) {
    const [open, setOpen] = (0, react_1.useState)(false);
    const [hasHeadings, setHasHeadings] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        const article = contentRef.current;
        if (!article)
            return;
        const check = () => {
            const nodes = article.querySelectorAll("h1, h2, h3");
            setHasHeadings(nodes.length > 0);
        };
        check();
        const observer = new MutationObserver(check);
        observer.observe(article, {
            childList: true,
            subtree: true,
            characterData: true,
        });
        return () => observer.disconnect();
    }, [contentRef]);
    (0, react_1.useEffect)(() => {
        if (!open)
            return;
        const onKey = (e) => {
            if (e.key === "Escape")
                setOpen(false);
        };
        document.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
        };
    }, [open]);
    if (!hasHeadings)
        return null;
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", className: ["larkup-mobile-toc-btn", buttonClassName].filter(Boolean).join(" "), style: buttonStyle, onClick: () => setOpen(true), "aria-label": "Open table of contents", children: [(0, jsx_runtime_1.jsxs)("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [(0, jsx_runtime_1.jsx)("path", { d: "M16 12H3" }), (0, jsx_runtime_1.jsx)("path", { d: "M16 6H3" }), (0, jsx_runtime_1.jsx)("path", { d: "M10 18H3" }), (0, jsx_runtime_1.jsx)("path", { d: "M21 6l-3 6 3 6" })] }), "Contents"] }), (0, jsx_runtime_1.jsx)("div", { className: [
                    "larkup-mobile-toc-overlay",
                    open ? "larkup-mobile-toc-overlay-open" : undefined,
                ]
                    .filter(Boolean)
                    .join(" "), onClick: () => setOpen(false) }), (0, jsx_runtime_1.jsxs)("div", { className: [
                    "larkup-mobile-toc-panel",
                    open ? "larkup-mobile-toc-panel-open" : undefined,
                ]
                    .filter(Boolean)
                    .join(" "), role: "dialog", "aria-modal": "true", "aria-label": "Table of contents", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "larkup-mobile-toc-close", onClick: () => setOpen(false), "aria-label": "Close", children: "\u2715" }), (0, jsx_runtime_1.jsx)("p", { className: "larkup-mobile-toc-heading", children: "On this page" }), (0, jsx_runtime_1.jsx)(LarkupToc, { contentRef: contentRef, onNavigate: () => setOpen(false), hideTitle: true })] })] }));
}
function LarkupArticle(_a) {
    var { className, style, prose = true, renderLoading, renderError, showHeader = true, showAuthor = true, showReadingTime = true, showDate = true, showCategory = true, showCover = true, showToc = true, classNames = {} } = _a, rest = __rest(_a, ["className", "style", "prose", "renderLoading", "renderError", "showHeader", "showAuthor", "showReadingTime", "showDate", "showCategory", "showCover", "showToc", "classNames"]);
    const baseProps = {
        className,
        style,
        prose,
        showHeader,
        showAuthor,
        showReadingTime,
        showDate,
        showCategory,
        showCover,
        showToc,
        classNames,
    };
    if ("post" in rest && rest.post) {
        return (0, jsx_runtime_1.jsx)(ArticleView, Object.assign({ post: rest.post }, baseProps));
    }
    return ((0, jsx_runtime_1.jsx)(FetchingArticle, Object.assign({ slug: rest.slug, preview: rest.preview, renderLoading: renderLoading, renderError: renderError }, baseProps)));
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
function ArticleView({ post, className, style, prose, showHeader, showAuthor, showReadingTime, showDate, showCategory, showCover, showToc, classNames = {}, }) {
    var _a, _b, _c;
    const contentRef = (0, react_1.useRef)(null);
    const finalShowCover = showCover && ((_a = post.showCover) !== null && _a !== void 0 ? _a : true);
    const finalShowToc = showToc && ((_b = post.showToc) !== null && _b !== void 0 ? _b : true);
    const author = (_c = post.authorName) !== null && _c !== void 0 ? _c : "Admin";
    return ((0, jsx_runtime_1.jsxs)("article", { className: ["larkup-layout", className, classNames.article]
            .filter(Boolean)
            .join(" "), style: style, "data-larkup-article": post.slug, children: [prose && (0, jsx_runtime_1.jsx)("style", { dangerouslySetInnerHTML: { __html: DEFAULT_STYLES } }), showHeader && ((0, jsx_runtime_1.jsxs)("header", { className: ["larkup-header-wrapper", classNames.header]
                    .filter(Boolean)
                    .join(" "), children: [showCategory && ((0, jsx_runtime_1.jsxs)("span", { className: "larkup-category", children: ["Blog", post.category ? ` / ${post.category}` : ""] })), (0, jsx_runtime_1.jsx)("h1", { className: ["larkup-title", classNames.title]
                            .filter(Boolean)
                            .join(" "), children: post.title }), showAuthor && ((0, jsx_runtime_1.jsxs)("div", { className: "larkup-author-wrapper", children: [post.authorImage ? ((0, jsx_runtime_1.jsx)("img", { src: post.authorImage, alt: author, className: "larkup-author-avatar" })) : ((0, jsx_runtime_1.jsx)("span", { className: "larkup-author-initial", "aria-hidden": "true", children: author.charAt(0).toUpperCase() })), (0, jsx_runtime_1.jsx)("span", { className: "larkup-author-name", children: author })] })), (0, jsx_runtime_1.jsxs)("div", { className: ["larkup-meta-row", classNames.metaContainer]
                            .filter(Boolean)
                            .join(" "), children: [(0, jsx_runtime_1.jsx)("div", { className: "larkup-meta-left", children: showReadingTime && post.readingTime != null && ((0, jsx_runtime_1.jsxs)("span", { className: ["larkup-meta-item", classNames.metaItem]
                                        .filter(Boolean)
                                        .join(" "), children: [(0, jsx_runtime_1.jsxs)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [(0, jsx_runtime_1.jsx)("circle", { cx: "12", cy: "12", r: "10" }), (0, jsx_runtime_1.jsx)("polyline", { points: "12 6 12 12 16 14" })] }), post.readingTime, " min read"] })) }), showDate && post.publishedAt && ((0, jsx_runtime_1.jsx)("time", { dateTime: post.publishedAt, children: new Date(post.publishedAt).toLocaleDateString(undefined, {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                }) }))] })] })), finalShowCover && post.coverImage && ((0, jsx_runtime_1.jsx)("div", { className: "larkup-cover-section", children: (0, jsx_runtime_1.jsx)("div", { className: "larkup-cover-inner", children: (0, jsx_runtime_1.jsx)("img", { src: post.coverImage, alt: post.title, className: [
                            "larkup-cover",
                            post.coverSize
                                ? `larkup-cover-${post.coverSize}`
                                : "larkup-cover-large",
                            classNames.coverImage,
                        ]
                            .filter(Boolean)
                            .join(" ") }) }) })), (0, jsx_runtime_1.jsxs)("div", { className: "larkup-body-layout", children: [finalShowToc && (0, jsx_runtime_1.jsx)("div", { className: "larkup-spacer" }), (0, jsx_runtime_1.jsx)("div", { className: "larkup-article-content", children: post.contentHtml ? ((0, jsx_runtime_1.jsx)("div", { ref: contentRef, className: [
                                prose ? "larkup-prose" : undefined,
                                classNames.content,
                            ]
                                .filter(Boolean)
                                .join(" "), dangerouslySetInnerHTML: { __html: post.contentHtml } })) : null }), finalShowToc && ((0, jsx_runtime_1.jsx)("aside", { className: "larkup-sidebar", children: (0, jsx_runtime_1.jsx)("div", { className: "larkup-sidebar-sticky", children: (0, jsx_runtime_1.jsx)(LarkupToc, { contentRef: contentRef }) }) }))] }), finalShowToc && (0, jsx_runtime_1.jsx)(LarkupMobileToc, { contentRef: contentRef, buttonClassName: classNames.mobileTocButton })] }));
}
//# sourceMappingURL=components.js.map