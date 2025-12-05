// app/layout.tsx
import './ui/global.css'
import { ACTIVE_FONTS as activeFonts } from './ui/fonts-design/fonts.helper'
import Providers from './lib/theme/ThemeProvider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fontVars: Record<string, string> = {}
  if (activeFonts.primary.style?.fontFamily) {
    fontVars['--font-primary'] = activeFonts.primary.style.fontFamily
  }
  if (activeFonts.display.style?.fontFamily) {
    fontVars['--font-display'] = activeFonts.display.style.fontFamily
  }

  const needsPrimaryAlias = !activeFonts.primary.style?.fontFamily && activeFonts.primary.variable
  const needsDisplayAlias = !activeFonts.display.style?.fontFamily && activeFonts.display.variable

  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${activeFonts.primary.variable} ${activeFonts.display.variable}`}
      style={Object.keys(fontVars).length > 0 ? (fontVars as React.CSSProperties) : undefined}
    >
      <head>
        <meta name="format-detection" content="telephone=no, date=no, email=no, address=no" />
        {(needsPrimaryAlias || needsDisplayAlias) && (
          <style>{`
            :root {
              ${needsPrimaryAlias ? `--font-primary: var(${activeFonts.primary.variable});` : ''}
              ${needsDisplayAlias ? `--font-display: var(${activeFonts.display.variable});` : ''}
            }
          `}</style>
        )}
      </head>
      <body
        className="antialiased font-sans bg-white dark:bg-[#010409]"
        suppressHydrationWarning={true}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
