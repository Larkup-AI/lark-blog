/**
 * Default embedded CSS styles for the LarkupArticle component.
 *
 * Layout widths use the `--larkup-max-width` CSS custom property
 * (default: `56rem`) so consumers can adjust the max-width by
 * either overriding the variable or passing the `maxWidth` prop.
 */

export const DEFAULT_STYLES = `
/* ── Prose / Content typography ───────────────────────────────────────── */
.larkup-prose { font-family: ui-sans-serif, system-ui, sans-serif; font-size: 1.0625rem; color: #374151; line-height: 1.75; }
.larkup-prose h1 { font-size: 2.25rem; font-weight: 600; margin-top: 3rem; margin-bottom: 0.75rem; color: #111827; line-height: 1.2; }
.larkup-prose h2 { font-size: 1.5rem; font-weight: 500; margin-top: 3rem; margin-bottom: 0.5rem; color: #111827; }
.larkup-prose h3 { font-size: 1.25rem; font-weight: 500; margin-top: 2.5rem; margin-bottom: 0.25rem; color: #111827; }
.larkup-prose p  { margin-top: 1.25em; margin-bottom: 1.25em; }
.larkup-prose a  { color: #111827; text-decoration: underline; text-underline-offset: 3px; }
.larkup-prose ul { list-style-type: disc; padding-left: 1.5rem; margin-top: 1.25em; margin-bottom: 1.25em; }
.larkup-prose ol { list-style-type: decimal; padding-left: 1.5rem; margin-top: 1.25em; margin-bottom: 1.25em; }
.larkup-prose blockquote { border-left-width: 2px; border-left-color: #d1d5db; padding-left: 1.25rem; font-style: italic; color: #4b5563; }
.larkup-prose img { border-radius: 0.75rem; border: none; display: block; max-width: 100%; height: auto; margin-left: auto; margin-right: auto; }
.larkup-prose pre { border-radius: 0.5rem; background-color: #1f2937; color: #f9fafb; padding: 1rem; overflow-x: auto; font-family: ui-monospace, monospace; font-size: 0.875rem; }
.larkup-prose code { font-family: ui-monospace, monospace; font-size: 0.875em; }
.larkup-prose :not(pre) > code { background-color: #f3f4f6; padding: 0.125rem 0.375rem; border-radius: 0.25rem; }
.larkup-prose iframe { border-radius: 0.5rem; border: 1px solid #e5e7eb; width: 100%; aspect-ratio: 16 / 9; }
.larkup-prose hr { border-color: #e5e7eb; margin-top: 2.5rem; margin-bottom: 2.5rem; }
.larkup-prose table { width: 100%; border-collapse: collapse; margin-top: 1.25em; margin-bottom: 1.25em; font-size: 0.875rem; }
.larkup-prose table th, .larkup-prose table td { border: 1px solid #e5e7eb; padding: 0.5rem 0.75rem; text-align: left; vertical-align: top; }
.larkup-prose table th { background-color: #f9fafb; font-weight: 500; color: #111827; }

/* ── Code syntax highlighting (One-Dark theme) ────────────────────────── */
.hljs-keyword, .hljs-selector-tag, .hljs-literal, .hljs-type, .hljs-addition { color: #c678dd; }
.hljs-string, .hljs-meta .hljs-string, .hljs-doctag, .hljs-regexp { color: #98c379; }
.hljs-title, .hljs-section, .hljs-name, .hljs-selector-id, .hljs-selector-class { color: #e06c75; }
.hljs-attr, .hljs-variable, .hljs-template-variable, .hljs-class .hljs-title, .hljs-type { color: #d19a66; }
.hljs-symbol, .hljs-bullet, .hljs-link, .hljs-meta, .hljs-selector-attr, .hljs-selector-pseudo { color: #61aeee; }
.hljs-built_in, .hljs-title.class_, .hljs-class .hljs-title { color: #e5c07b; }
.hljs-comment, .hljs-quote, .hljs-deletion { color: #7f848e; font-style: italic; }

/* ── Article layout ───────────────────────────────────────────────────── */
.larkup-layout { --larkup-max-width: 56rem; font-family: ui-sans-serif, system-ui, sans-serif; color: #111827; width: 100%; padding: 0 1.5rem; box-sizing: border-box; }

.larkup-header-wrapper { max-width: var(--larkup-max-width); margin: 0 auto; padding: 2.5rem 0 0; text-align: center; }
@media (min-width: 768px) { .larkup-header-wrapper { padding-top: 3.5rem; } }

.larkup-category { font-size: 0.875rem; color: #6b7280; display: block; margin-bottom: 1rem; }

.larkup-title { font-size: 1.5rem; font-weight: 700; line-height: 1.1; letter-spacing: -0.025em; color: #111827; margin: 1rem auto 0; max-width: var(--larkup-max-width); text-wrap: balance; }
@media (min-width: 768px)  { .larkup-title { font-size: 1.875rem; } }
@media (min-width: 1024px) { .larkup-title { font-size: 3rem; } }

.larkup-author-wrapper { margin-top: 1.5rem; display: flex; align-items: center; justify-content: center; gap: 0.625rem; }
.larkup-author-avatar   { width: 1.75rem; height: 1.75rem; border-radius: 9999px; object-fit: cover; border: 1px solid #e5e7eb; }
.larkup-author-initial  { display: flex; align-items: center; justify-content: center; width: 1.75rem; height: 1.75rem; border-radius: 9999px; background-color: #111827; color: #f9fafb; font-size: 0.75rem; font-weight: 600; }
.larkup-author-name     { font-size: 0.875rem; font-weight: 600; color: #111827; }

.larkup-meta-row  { margin-top: 2.5rem; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e5e7eb; padding-bottom: 1.5rem; font-size: 0.875rem; color: #6b7280; }
@media (min-width: 768px) { .larkup-meta-row { margin-top: 3rem; } }
.larkup-meta-left { display: flex; align-items: center; gap: 1rem; }
.larkup-meta-item { display: flex; align-items: center; gap: 0.375rem; }

/* ── Cover image ──────────────────────────────────────────────────────── */
.larkup-cover-section { }
.larkup-cover-inner   { max-width: var(--larkup-max-width); margin: 0 auto; padding: 2.5rem 0; }
.larkup-cover          { width: 100%; border-radius: 0.75rem; object-fit: cover; }
.larkup-cover-small    { aspect-ratio: 3/1; }
.larkup-cover-medium   { aspect-ratio: 2/1; }
.larkup-cover-large    { aspect-ratio: 16/10; }

/* ── Body + sidebar ───────────────────────────────────────────────────── */
.larkup-body-layout     { display: flex; justify-content: center; gap: 2rem; padding: 2.5rem 0; }
@media (min-width: 768px) { .larkup-body-layout { padding-bottom: 3.5rem; } }
.larkup-spacer          { display: none; width: 13rem; flex-shrink: 0; }
.larkup-article-content { min-width: 0; width: 100%; max-width: var(--larkup-max-width); }
.larkup-sidebar         { display: none; width: 13rem; flex-shrink: 0; }
.larkup-sidebar-sticky  { position: sticky; top: 6rem; display: flex; flex-direction: column; gap: 2.5rem; }
@media (min-width: 1280px) { .larkup-spacer, .larkup-sidebar { display: block; } }

/* ── Table of contents ────────────────────────────────────────────────── */
.larkup-toc-title       { font-family: ui-monospace, monospace; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; margin-bottom: 0.75rem; display: block; }
.larkup-toc-list        { display: flex; flex-direction: column; gap: 0.625rem; border-left: 1px solid #e5e7eb; list-style: none; padding: 0; margin: 0; }
.larkup-toc-item        { margin: 0; }
.larkup-toc-item-level-3 { margin-left: 0.75rem; }
.larkup-toc-link        { display: block; margin-left: -1px; border-left: 2px solid transparent; padding-left: 1rem; font-size: 0.875rem; line-height: 1.375; color: #6b7280; text-decoration: none; transition: color 0.2s, border-color 0.2s; }
.larkup-toc-link:hover  { color: #111827; }
.larkup-toc-link-active { border-left-color: #111827; color: #111827; font-weight: 500; }

/* ── Mobile TOC sheet ─────────────────────────────────────────────────── */
.larkup-mobile-toc-btn       { display: inline-flex; align-items: center; gap: 0.5rem; position: fixed; bottom: 1.5rem; right: 1rem; z-index: 40; padding: 0.5rem 0.875rem; font-size: 0.875rem; font-weight: 500; font-family: ui-sans-serif, system-ui, sans-serif; color: #111827; background: #fff; border: 1px solid #e5e7eb; border-radius: 0.5rem; box-shadow: 0 4px 12px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.06); cursor: pointer; transition: background 0.15s, box-shadow 0.15s; }
.larkup-mobile-toc-btn:hover { background: #f9fafb; box-shadow: 0 6px 16px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.08); }
@media (min-width: 1280px) { .larkup-mobile-toc-btn { display: none; } }
.larkup-mobile-toc-overlay      { position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.4); opacity: 0; pointer-events: none; transition: opacity 0.25s ease; }
.larkup-mobile-toc-overlay-open { opacity: 1; pointer-events: auto; }
.larkup-mobile-toc-panel        { position: fixed; top: 0; right: 0; bottom: 0; z-index: 51; width: 18rem; background: #fff; box-shadow: -4px 0 24px rgba(0,0,0,0.12); transform: translateX(100%); transition: transform 0.3s cubic-bezier(0.22,1,0.36,1); overflow-y: auto; padding: 2rem 1.5rem; }
.larkup-mobile-toc-panel-open   { transform: translateX(0); }
.larkup-mobile-toc-close        { position: absolute; top: 1rem; right: 1rem; width: 2rem; height: 2rem; display: flex; align-items: center; justify-content: center; border-radius: 0.375rem; border: none; background: transparent; cursor: pointer; color: #6b7280; font-size: 1.25rem; transition: background 0.15s; }
.larkup-mobile-toc-close:hover  { background: #f3f4f6; }
.larkup-mobile-toc-heading      { font-family: ui-monospace, monospace; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; margin-bottom: 1rem; }

/* ── Dark mode ────────────────────────────────────────────────────────── */
@media (prefers-color-scheme: dark) {
  .larkup-prose { color: #d1d5db; }
  .larkup-prose h1, .larkup-prose h2, .larkup-prose h3 { color: #f9fafb; }
  .larkup-prose a { color: #f9fafb; }
  .larkup-prose blockquote { border-left-color: #4b5563; color: #9ca3af; }
  .larkup-prose img, .larkup-prose iframe, .larkup-prose hr, .larkup-prose table th, .larkup-prose table td { border-color: #374151; }
  .larkup-prose :not(pre) > code { background-color: #374151; }
  .larkup-prose table th { background-color: #1f2937; color: #f9fafb; }

  .larkup-layout   { color: #f9fafb; }
  .larkup-category { color: #9ca3af; }
  .larkup-title    { color: #f9fafb; }
  .larkup-author-avatar  { border-color: #374151; }
  .larkup-author-initial { background-color: #f9fafb; color: #111827; }
  .larkup-author-name    { color: #f9fafb; }
  .larkup-meta-row       { border-color: #374151; color: #9ca3af; }
  .larkup-toc-title      { color: #9ca3af; }
  .larkup-toc-list       { border-color: #374151; }
  .larkup-toc-link       { color: #9ca3af; }
  .larkup-toc-link:hover { color: #f9fafb; }
  .larkup-toc-link-active { border-left-color: #f9fafb; color: #f9fafb; }

  .larkup-mobile-toc-btn       { background: #1f2937; color: #f9fafb; border-color: #374151; }
  .larkup-mobile-toc-btn:hover { background: #374151; }
  .larkup-mobile-toc-panel     { background: #1f2937; }
  .larkup-mobile-toc-close     { color: #9ca3af; }
  .larkup-mobile-toc-close:hover { background: #374151; }
  .larkup-mobile-toc-heading   { color: #9ca3af; }
}
`;
