'use client'

import { useState } from 'react'
import { Link2, Check } from 'lucide-react'

export function CopyUrlButton() {
  const [copied, setCopied] = useState(false)

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
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 font-medium text-accent transition-opacity hover:opacity-80"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-accent" /> Copied
        </>
      ) : (
        <>
          <Link2 className="h-3.5 w-3.5" /> Copy URL
        </>
      )}
    </button>
  )
}
