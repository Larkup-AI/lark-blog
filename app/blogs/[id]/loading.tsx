export default function BlogLoading() {
  return (
    <div className="h-svh flex flex-col overflow-hidden bg-background animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="sticky top-0 z-30 bg-background border-b border-border/10">
        <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-4 flex-1">
            {/* Back button */}
            <div className="h-4 w-16 rounded bg-muted animate-pulse" />
            {/* Title input */}
            <div className="h-8 w-full max-w-md rounded-md bg-muted animate-pulse" />
            {/* Cover image button */}
            <div className="h-8 w-8 rounded-md bg-muted animate-pulse shrink-0" />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Status text */}
            <div className="hidden sm:block h-4 w-20 rounded bg-muted animate-pulse" />
            {/* More button */}
            <div className="h-9 w-9 rounded-md bg-muted animate-pulse" />
            {/* Publish button */}
            <div className="h-9 w-24 rounded-md bg-muted animate-pulse" />
          </div>
        </div>
      </div>

      {/* Toolbar skeleton */}
      <div className="border-b border-border/10 px-4 sm:px-6">
        <div className="flex h-10 items-center gap-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-7 w-7 rounded bg-muted animate-pulse"
              style={{ animationDelay: `${i * 75}ms` }}
            />
          ))}
          <div className="mx-2 h-5 w-px bg-border" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={`g2-${i}`}
              className="h-7 w-7 rounded bg-muted animate-pulse"
              style={{ animationDelay: `${(i + 8) * 75}ms` }}
            />
          ))}
        </div>
      </div>

      {/* Editor content skeleton */}
      <div className="flex-1 overflow-hidden">
        <div className="mx-auto max-w-3xl px-6 md:px-8 py-8 space-y-5">
          {/* Heading line */}
          <div
            className="h-8 w-3/5 rounded bg-muted animate-pulse"
            style={{ animationDelay: "100ms" }}
          />
          {/* Paragraph lines */}
          <div className="space-y-3 pt-2">
            <div
              className="h-4 w-full rounded bg-muted/70 animate-pulse"
              style={{ animationDelay: "200ms" }}
            />
            <div
              className="h-4 w-11/12 rounded bg-muted/70 animate-pulse"
              style={{ animationDelay: "275ms" }}
            />
            <div
              className="h-4 w-4/5 rounded bg-muted/70 animate-pulse"
              style={{ animationDelay: "350ms" }}
            />
          </div>
          {/* Gap */}
          <div className="pt-2 space-y-3">
            <div
              className="h-4 w-full rounded bg-muted/70 animate-pulse"
              style={{ animationDelay: "425ms" }}
            />
            <div
              className="h-4 w-10/12 rounded bg-muted/70 animate-pulse"
              style={{ animationDelay: "500ms" }}
            />
            <div
              className="h-4 w-3/4 rounded bg-muted/70 animate-pulse"
              style={{ animationDelay: "575ms" }}
            />
            <div
              className="h-4 w-5/6 rounded bg-muted/70 animate-pulse"
              style={{ animationDelay: "650ms" }}
            />
          </div>
          {/* Subheading */}
          <div
            className="h-6 w-2/5 rounded bg-muted animate-pulse pt-4"
            style={{ animationDelay: "725ms" }}
          />
          {/* More lines */}
          <div className="space-y-3 pt-2">
            <div
              className="h-4 w-full rounded bg-muted/70 animate-pulse"
              style={{ animationDelay: "800ms" }}
            />
            <div
              className="h-4 w-9/12 rounded bg-muted/70 animate-pulse"
              style={{ animationDelay: "875ms" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
