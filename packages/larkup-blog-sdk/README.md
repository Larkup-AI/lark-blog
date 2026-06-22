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

Renders a full article. Accepts either a pre-fetched `post` object or a `slug` to fetch automatically.

```tsx
// Auto-fetch by slug
<LarkupArticle
  slug="hello-world"
  preview={false}
  prose={true}
  renderLoading={() => <Spinner />}
  renderError={(err) => <p>{err.message}</p>}
/>

// Pass a pre-fetched post (e.g. from getServerSideProps)
<LarkupArticle post={post} prose={true} />
```

| Prop            | Type                        | Default | Description                                                  |
| --------------- | --------------------------- | ------- | ------------------------------------------------------------ |
| `slug`          | `string`                    | —       | Slug to fetch (mutually exclusive with `post`)               |
| `post`          | `Post`                      | —       | Pre-fetched post object (mutually exclusive with `slug`)     |
| `preview`       | `boolean`                   | `false` | Fetch draft version (only valid with `slug`)                 |
| `prose`         | `boolean`                   | `true`  | Adds `larkup-prose` class to the content `<div>` for styling |
| `className`     | `string`                    | —       | Applied to the outer `<article>` element                     |
| `style`         | `CSSProperties`             | —       | Inline styles for the outer `<article>` element              |
| `renderLoading` | `() => ReactNode`           | —       | Custom loading state                                         |
| `renderError`   | `(err: Error) => ReactNode` | —       | Custom error state                                           |

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
  readingTime?: number;
  published: boolean;
  publishedAt?: string;
  updatedAt: string;
}
```

---

## Draft / preview mode

Both the client methods and hooks accept a `preview` flag. When `true`, the SDK appends `?preview=true` to the API request so your Studio returns unpublished drafts alongside published content. Gate this flag behind a server-side session check to avoid leaking drafts in production.

---

## Styling prose content

When `prose={true}` (the default), `<LarkupArticle>` wraps the HTML content in a `div.larkup-prose`. Add your own CSS (or a Tailwind Typography-style plugin) targeting that class:

```css
.larkup-prose {
  max-width: 65ch;
  line-height: 1.7;
}

.larkup-prose h2 {
  font-size: 1.5rem;
  margin-top: 2rem;
}
.larkup-prose p {
  margin-top: 1rem;
}
.larkup-prose a {
  text-decoration: underline;
}
```

---

## Project layout

```
src/
├── client.ts          # LarkupBlogClient + Post types
├── index.ts           # Main package entry
└── react/
    ├── context.tsx    # LarkupProvider, useLarkupClient, usePosts, usePost
    ├── components.tsx # LarkupArticle
    └── index.ts       # React sub-package entry
```

---

## License

MIT © Larkup
