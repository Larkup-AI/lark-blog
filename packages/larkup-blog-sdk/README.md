# Larkup Blog SDK

A TypeScript SDK for fetching and rendering blog content from a [Larkup Studio](https://larkup.io) backend. Ships with a framework-agnostic HTTP client and optional React bindings.

---

## Installation

```bash
npm install @larkup/blog-sdk
# or
yarn add @larkup/blog-sdk
```

> **Peer dependencies (React bindings only):** React ≥ 17

---

## Quick start

### Vanilla / Node

```ts
import { LarkupBlogClient } from "@larkup/blog-sdk";

const client = new LarkupBlogClient({
  apiKey: "lk_larkup_xxxxxxxxxxxx",
  studioUrl: "https://your-studio.larkup.io",
});

const posts = await client.getPosts();
const post = await client.getPostBySlug("hello-world");
```

### React

```tsx
import { LarkupBlogClient } from "@larkup/blog-sdk";
import {
  LarkupProvider,
  usePosts,
  LarkupArticle,
} from "@larkup/blog-sdk/react";

const client = new LarkupBlogClient({
  apiKey: process.env.LARKUP_API_KEY!,
  studioUrl: process.env.LARKUP_STUDIO_URL!,
});

// Wrap your app (or just the blog section)
export function App() {
  return (
    <LarkupProvider client={client}>
      <BlogIndex />
    </LarkupProvider>
  );
}

function BlogIndex() {
  const { data: posts, loading, error } = usePosts();

  if (loading) return <p>Loading…</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <ul>
      {posts?.map((p) => (
        <li key={p.id}>
          <a href={`/blog/${p.slug}`}>{p.title}</a>
        </li>
      ))}
    </ul>
  );
}
```

---

## API reference

### `LarkupBlogClient`

```ts
new LarkupBlogClient(options: LarkupBlogOptions)
```

| Option      | Type     | Required | Description                             |
| ----------- | -------- | -------- | --------------------------------------- |
| `apiKey`    | `string` | ✅       | Your Larkup API key                     |
| `studioUrl` | `string` | ✅       | Base URL of your Larkup Studio instance |

#### Methods

| Method                              | Returns           | Description                                                        |
| ----------------------------------- | ----------------- | ------------------------------------------------------------------ |
| `getPosts({ preview? })`            | `Promise<Post[]>` | Fetch all published posts. Pass `preview: true` to include drafts. |
| `getPostBySlug(slug, { preview? })` | `Promise<Post>`   | Fetch a single post by its URL slug.                               |

---

### React bindings (`@larkup/blog-sdk/react`)

#### `<LarkupProvider client={client}>`

Context provider. Wrap any component tree that uses Larkup hooks or components.

#### `useLarkupClient(): LarkupBlogClient`

Returns the client from the nearest `<LarkupProvider>`. Throws if called outside one.

#### `usePosts({ preview? }): AsyncState<Post[]>`

Fetches all posts. Re-runs when `preview` changes.

```ts
interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}
```

#### `usePost(slug, { preview? }): AsyncState<Post>`

Fetches a single post by slug. Re-runs when `slug` or `preview` changes.

#### `<LarkupArticle>`

Renders a full article with header, cover image, prose content, and optional table-of-contents sidebar. By default the layout matches the [Larkup Blog Studio](https://larkup.io) aesthetic.

Accepts either a pre-fetched `post` object or a `slug` to fetch automatically.

```tsx
// Auto-fetch by slug (requires LarkupProvider)
<LarkupArticle
  slug="hello-world"
  preview={false}
  prose={true}
  renderLoading={() => <Spinner />}
  renderError={(err) => <p>{err.message}</p>}
/>

// Pass a pre-fetched post (e.g. from getServerSideProps / server component)
<LarkupArticle post={post} prose={true} />
```

##### Props

| Prop              | Type                          | Default  | Description                                                                    |
| ----------------- | ----------------------------- | -------- | ------------------------------------------------------------------------------ |
| `slug`            | `string`                      | —        | Slug to fetch (mutually exclusive with `post`)                                 |
| `post`            | `Post`                        | —        | Pre-fetched post object (mutually exclusive with `slug`)                       |
| `preview`         | `boolean`                     | `false`  | Fetch draft version (only valid with `slug`)                                   |
| `prose`           | `boolean`                     | `true`   | Inject built-in prose typography + layout styles                               |
| `className`       | `string`                      | —        | Applied to the outer `<article>` element                                       |
| `style`           | `CSSProperties`               | —        | Inline styles for the outer `<article>` element                                |
| `maxWidth`        | `string`                      | `"56rem"`| Max-width for header, cover, and content sections (`--larkup-max-width`)       |
| `showHeader`      | `boolean`                     | `true`   | Show the centered header (title, author, meta)                                 |
| `showAuthor`      | `boolean`                     | `true`   | Show author avatar + name                                                      |
| `showAuthorImage` | `boolean`                     | `true`   | Show author's profile image (falls back to initial)                            |
| `showReadingTime` | `boolean`                     | `true`   | Show reading-time badge                                                        |
| `showDate`        | `boolean`                     | `true`   | Show publish date                                                              |
| `showCategory`    | `boolean`                     | `true`   | Show category breadcrumb                                                       |
| `showCover`       | `boolean`                     | `true`   | Show cover image section                                                       |
| `showToc`         | `boolean`                     | `true`   | Show table-of-contents sidebar (desktop) + mobile sheet                        |
| `classNames`      | `LarkupClassNames`            | `{}`     | Class overrides for individual sub-elements (see below)                        |
| `renderLoading`   | `() => ReactNode`             | —        | Custom loading state                                                           |
| `renderError`     | `(err: Error) => ReactNode`   | —        | Custom error state                                                             |

##### `classNames` slots

Override any sub-element's class with the `classNames` prop:

```tsx
<LarkupArticle
  post={post}
  classNames={{
    article: "my-article",
    header: "my-header",
    title: "text-foreground",
    category: "text-muted",
    authorWrapper: "gap-3",
    authorName: "font-bold",
    metaContainer: "text-muted-foreground",
    metaItem: "gap-2",
    coverSection: "bg-gray-50",
    coverInner: "px-0",
    coverImage: "rounded-2xl",
    bodyLayout: "gap-12",
    content: "prose-lg",
    sidebar: "w-64",
    sidebarSticky: "top-20",
    tocTitle: "text-xs",
  }}
/>
```

| Slot             | Target element                                          |
| ---------------- | ------------------------------------------------------- |
| `article`        | Outer `<article>` wrapper                               |
| `header`         | Header wrapper (centered block)                         |
| `title`          | Article `<h1>`                                          |
| `category`       | Category breadcrumb `<span>`                            |
| `authorWrapper`  | Author row (avatar + name)                              |
| `authorName`     | Author name `<span>`                                    |
| `metaContainer`  | Meta row (reading time, date)                           |
| `metaItem`       | Individual meta item                                    |
| `coverSection`   | Cover image outer section                               |
| `coverInner`     | Cover image inner container (respects `maxWidth`)       |
| `coverImage`     | Cover `<img>` element                                   |
| `bodyLayout`     | Body flex row (spacer | content | sidebar)              |
| `content`        | Article content wrapper                                 |
| `sidebar`        | Sidebar `<aside>`                                       |
| `sidebarSticky`  | Sidebar sticky container                                |
| `tocTitle`       | TOC heading ("On this page")                            |

##### Adjusting layout width

The default max-width is `56rem` (matching Larkup Blog Studio). Override it with the `maxWidth` prop:

```tsx
<LarkupArticle post={post} maxWidth="72rem" />
```

Or set the CSS variable directly:

```css
.my-wrapper {
  --larkup-max-width: 72rem;
}
```

---

### `Post` type

```ts
interface Post {
  id: number;
  title: string;
  slug: string;
  content?: any;
  contentHtml?: string;
  coverImage?: string;
  category?: string;
  authorName?: string;
  authorImage?: string;
  readingTime?: number;
  published: boolean;
  publishedAt?: string;
  updatedAt: string;
  showCover?: boolean;
  coverSize?: "small" | "medium" | "large";
  coverFit?: "cover" | "contain";
  coverZoom?: number;
  coverX?: number;
  coverY?: number;
  showToc?: boolean;
  isMain?: boolean;
}
```

---

## Draft / preview mode

Both the client methods and hooks accept a `preview` flag. When `true`, the SDK appends `?preview=true` to the API request so your Studio returns unpublished drafts alongside published content. Gate this flag behind a server-side session check to avoid leaking drafts in production.

---

## Styling prose content

When `prose={true}` (the default), `<LarkupArticle>` injects built-in styles that match the Larkup Blog Studio aesthetic out of the box — no extra CSS required.

To customise, override the relevant `.larkup-*` classes in your own CSS:

```css
/* Widen the layout */
.larkup-layout {
  --larkup-max-width: 72rem;
}

/* Custom prose font */
.larkup-prose {
  font-family: "Georgia", serif;
  font-size: 1.125rem;
}

/* Custom heading colours */
.larkup-prose h2 {
  color: #1d4ed8;
}
```

To disable built-in styles entirely and provide your own, pass `prose={false}`:

```tsx
<LarkupArticle post={post} prose={false} className="my-custom-article" />
```

---

## Project layout

```
src/
├── client.ts              # LarkupBlogClient + Post types
├── index.ts               # Main package entry
└── react/
    ├── styles.ts          # Default embedded CSS
    ├── types.ts           # Shared TypeScript types
    ├── toc.tsx            # LarkupToc + LarkupMobileToc
    ├── components.tsx     # LarkupArticle, ArticleView, FetchingArticle
    ├── context.tsx        # LarkupProvider, hooks
    └── index.ts           # React sub-package entry
```

---

## License

MIT © Larkup
