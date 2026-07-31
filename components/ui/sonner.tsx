'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner, ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          success:
            '[&_[data-icon]]:text-emerald-600 dark:[&_[data-icon]]:text-emerald-400',
          error:
            '[&_[data-icon]]:text-red-600 dark:[&_[data-icon]]:text-red-400',
          warning:
            '[&_[data-icon]]:text-amber-600 dark:[&_[data-icon]]:text-amber-400',
          info:
            '[&_[data-icon]]:text-sky-600 dark:[&_[data-icon]]:text-sky-400',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
