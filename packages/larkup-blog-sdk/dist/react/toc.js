"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LarkupToc = LarkupToc;
exports.LarkupMobileToc = LarkupMobileToc;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
// ─── Desktop TOC (sidebar) ──────────────────────────────────────────────
function LarkupToc({ contentRef, onNavigate, classNames, }) {
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
    return ((0, jsx_runtime_1.jsxs)("nav", { "aria-label": "Table of contents", children: [(0, jsx_runtime_1.jsx)("span", { className: [
                    "larkup-toc-title",
                    classNames === null || classNames === void 0 ? void 0 : classNames.tocTitle,
                ]
                    .filter(Boolean)
                    .join(" "), children: "On this page" }), (0, jsx_runtime_1.jsx)("ul", { className: "larkup-toc-list", children: headings.map((h) => ((0, jsx_runtime_1.jsx)("li", { className: [
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
// ─── Mobile TOC (slide-over sheet) ──────────────────────────────────────
function LarkupMobileToc({ contentRef, }) {
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
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", className: "larkup-mobile-toc-btn", onClick: () => setOpen(true), "aria-label": "Open table of contents", children: [(0, jsx_runtime_1.jsxs)("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [(0, jsx_runtime_1.jsx)("path", { d: "M16 12H3" }), (0, jsx_runtime_1.jsx)("path", { d: "M16 6H3" }), (0, jsx_runtime_1.jsx)("path", { d: "M10 18H3" }), (0, jsx_runtime_1.jsx)("path", { d: "M21 6l-3 6 3 6" })] }), "Contents"] }), (0, jsx_runtime_1.jsx)("div", { className: [
                    "larkup-mobile-toc-overlay",
                    open ? "larkup-mobile-toc-overlay-open" : undefined,
                ]
                    .filter(Boolean)
                    .join(" "), onClick: () => setOpen(false) }), (0, jsx_runtime_1.jsxs)("div", { className: [
                    "larkup-mobile-toc-panel",
                    open ? "larkup-mobile-toc-panel-open" : undefined,
                ]
                    .filter(Boolean)
                    .join(" "), role: "dialog", "aria-modal": "true", "aria-label": "Table of contents", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "larkup-mobile-toc-close", onClick: () => setOpen(false), "aria-label": "Close", children: "\u2715" }), (0, jsx_runtime_1.jsx)("p", { className: "larkup-mobile-toc-heading", children: "On this page" }), (0, jsx_runtime_1.jsx)(LarkupToc, { contentRef: contentRef, onNavigate: () => setOpen(false) })] })] }));
}
//# sourceMappingURL=toc.js.map