import Image from '@tiptap/extension-image'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { ResizableImageView } from './resizable-image-view'

/**
 * Image node with width + alignment attributes and a React node view that
 * lets the author drag to resize and pick an alignment. Output HTML carries
 * `data-width`, an inline `width` style, and `data-align` so the public
 * article (rendered via dangerouslySetInnerHTML) matches the editor exactly.
 */
export const ResizableImage = Image.extend({
  name: 'image',

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-width'),
        renderHTML: (attrs) =>
          attrs.width
            ? { 'data-width': attrs.width, style: `width:${attrs.width}` }
            : {},
      },
      align: {
        default: 'center',
        parseHTML: (el) => el.getAttribute('data-align') ?? 'center',
        renderHTML: (attrs) => ({ 'data-align': attrs.align ?? 'center' }),
      },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView)
  },
})
