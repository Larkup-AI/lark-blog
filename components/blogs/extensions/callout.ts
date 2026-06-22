import { Node, mergeAttributes } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      /** Wrap the selection in a callout, or lift it out if already inside one. */
      toggleCallout: (variant?: 'info' | 'success' | 'warning') => ReturnType
    }
  }
}

/**
 * A highlighted note/aside box. Renders as `<div data-callout data-variant>`
 * so the public article can style it via `.prose-editorial [data-callout]`.
 */
export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'paragraph+',
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: 'info',
        parseHTML: (el) => el.getAttribute('data-variant') ?? 'info',
        renderHTML: (attrs) => ({ 'data-variant': attrs.variant ?? 'info' }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-callout]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-callout': '' }),
      0,
    ]
  },

  addCommands() {
    return {
      toggleCallout:
        (variant = 'info') =>
        ({ commands, editor }) => {
          if (editor.isActive(this.name)) {
            return commands.lift(this.name)
          }
          return commands.wrapIn(this.name, { variant })
        },
    }
  },
})
