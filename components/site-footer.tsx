import Link from "next/link";
import { SITE } from "@/lib/site-data";

const COLUMNS = [
  {
    heading: "Resources",
    links: [
      { label: "Documentation", href: SITE.docsUrl, external: true },
      { label: "Blog", href: "/" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-[1.5fr_2fr]">
          <div>
            <span className="font-serif text-2xl tracking-tight text-foreground">
              {SITE.name}
            </span>
            <p className="mt-3 max-w-xs text-pretty text-sm leading-relaxed text-muted-foreground">
              {SITE.tagline}.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-1">
            {COLUMNS.map((col) => (
              <div key={col.heading}>
                <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  {col.heading}
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      {link.external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-foreground/80 transition-colors hover:text-foreground"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-sm text-foreground/80 transition-colors hover:text-foreground"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-border pt-8 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {SITE.name}. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            <Link
              href="/"
              className="font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
            >
              Studio
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
