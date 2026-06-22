import React, { createContext, useContext, useState, useEffect } from "react";
import { LarkupBlogClient, Post } from "../client";

// ─── Context ────────────────────────────────────────────────────────────────
interface LarkupContextValue {
  client: LarkupBlogClient;
}

const LarkupContext = createContext<LarkupContextValue | null>(null);

export function useLarkupClient(): LarkupBlogClient {
  const ctx = useContext(LarkupContext);
  if (!ctx)
    throw new Error("useLarkupClient must be used inside <LarkupProvider>");
  return ctx.client;
}

// ─── Provider ────────────────────────────────────────────────────────────────
interface LarkupProviderProps {
  client: LarkupBlogClient;
  children: React.ReactNode;
}

export function LarkupProvider({ client, children }: LarkupProviderProps) {
  return (
    <LarkupContext.Provider value={{ client }}>
      {children}
    </LarkupContext.Provider>
  );
}

// ─── Hooks ───────────────────────────────────────────────────────────────────
interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export function usePosts({
  preview = false,
}: { preview?: boolean } = {}): AsyncState<Post[]> {
  const client = useLarkupClient();
  const [state, setState] = useState<AsyncState<Post[]>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState({ data: null, loading: true, error: null });

    client
      .getPosts({ preview })
      .then((posts) => {
        if (!cancelled) setState({ data: posts, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) setState({ data: null, loading: false, error: err });
      });

    return () => {
      cancelled = true;
    };
  }, [client, preview]);

  return state;
}

export function usePost(
  slug: string,
  { preview = false }: { preview?: boolean } = {},
): AsyncState<Post> {
  const client = useLarkupClient();
  const [state, setState] = useState<AsyncState<Post>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setState({ data: null, loading: true, error: null });

    client
      .getPostBySlug(slug, { preview })
      .then((post) => {
        if (!cancelled) setState({ data: post, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) setState({ data: null, loading: false, error: err });
      });

    return () => {
      cancelled = true;
    };
  }, [client, slug, preview]);

  return state;
}
