'use client'

import { useEffect, useState } from 'react'
import { Link2, Check } from 'lucide-react'

export function ShareButtons({ title }: { title: string }) {
  const [copied, setCopied] = useState(false)
  const [url, setUrl] = useState('')

  useEffect(() => {
    setUrl(window.location.href)
  }, [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* no-op */
    }
  }

  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[0.7rem] uppercase tracking-widest text-muted-foreground">
        Share
      </span>
      <div className="flex items-center gap-1.5">
        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on X"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </a>
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on LinkedIn"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
        </a>
        <button
          onClick={copy}
          aria-label="Copy link"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-foreground/80 transition-colors hover:bg-secondary hover:text-foreground"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-accent" />
          ) : (
            <Link2 className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  )
}
