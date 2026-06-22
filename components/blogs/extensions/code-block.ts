import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { lowlight } from './lowlight'
import { CodeBlockView } from './code-block-view'

/** Syntax-highlighted code block with an in-editor language picker. */
export const CodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView)
  },
}).configure({
  lowlight,
  defaultLanguage: 'plaintext',
})
