import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { ChartView } from './chart-view'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    chart: {
      /** Insert a chart node. `config` is an encoded ChartConfig string. */
      setChart: (config: string) => ReturnType
    }
  }
}

export const Chart = Node.create({
  name: 'chart',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      config: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-chart') || '',
        renderHTML: (attrs) => ({ 'data-chart': attrs.config }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-chart]' }]
  },

  renderHTML({ HTMLAttributes }) {
    // Static placeholder hydrated by <ChartHydrator /> on the public page.
    return ['div', mergeAttributes(HTMLAttributes)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ChartView)
  },

  addCommands() {
    return {
      setChart:
        (config) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { config } }),
    }
  },
})
