'use client'

import { useState } from 'react'
import {
  NodeViewWrapper,
  NodeViewContent,
  type NodeViewProps,
} from '@tiptap/react'
import { Check, Copy } from 'lucide-react'
import { CODE_LANGUAGES } from './lowlight'

export function CodeBlockView({ node, updateAttributes }: NodeViewProps) {
  const language = (node.attrs.language as string) || 'plaintext'
  const [copied, setCopied] = useState(false)

  const label =
    CODE_LANGUAGES.find((l) => l.value === language)?.label ?? language

  // Count rendered lines for the gutter (trailing newline ignored).
  const text = node.textContent ?? ''
  const lineCount = Math.max(1, text.replace(/\n$/, '').split('\n').length)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* no-op */
    }
  }

  return (
    <NodeViewWrapper className="code-window group">
      <div className="code-window-header" contentEditable={false}>
        <span className="code-window-dots" aria-hidden="true">
          <span style={{ background: '#ff5f56' }} />
          <span style={{ background: '#ffbd2e' }} />
          <span style={{ background: '#27c93f' }} />
        </span>
        <select
          value={language}
          onChange={(e) => updateAttributes({ language: e.target.value })}
          className="code-window-lang cursor-pointer rounded bg-transparent outline-none hover:text-[#e6edf3]"
          aria-label="Code language"
        >
          {CODE_LANGUAGES.map((l) => (
            <option key={l.value} value={l.value} className="text-foreground">
              {l.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={copy}
          className="code-copy-btn opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> Copy
            </>
          )}
        </button>
      </div>
      <div className="code-window-body">
        <div className="code-gutter" contentEditable={false} aria-hidden="true">
          {Array.from({ length: lineCount }, (_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
        </div>
        <pre spellCheck={false}>
          <NodeViewContent
            as={'code' as 'div'}
            className={`language-${language}`}
          />
        </pre>
      </div>
      <span className="sr-only">{label} code block</span>
    </NodeViewWrapper>
  )
}
