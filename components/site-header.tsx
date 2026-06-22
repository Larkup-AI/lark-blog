'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X, ArrowUpRight } from 'lucide-react'
import { SITE } from '@/lib/site-data'
import { cn } from '@/lib/utils'

const NAV = [
  { label: 'Blog', href: '/' },
]

export function SiteHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-serif text-2xl tracking-tight text-foreground">
            {SITE.name}
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
          <a
            href={SITE.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Docs
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </nav>

        <div className="hidden md:flex">
          <a
            href={SITE.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Get started
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>

        <button
          className="md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div
        className={cn(
          'overflow-hidden border-t border-border transition-all md:hidden',
          open ? 'max-h-80' : 'max-h-0 border-t-0',
        )}
      >
        <nav className="flex flex-col gap-1 px-6 py-4">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
          <a
            href={SITE.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Docs
          </a>
        </nav>
      </div>
    </header>
  )
}
