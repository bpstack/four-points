// app/ui/fonts-design/fonts.ts

import { Source_Sans_3, Montserrat, Inter, Roboto, Open_Sans, Poppins } from 'next/font/google'

// ============= DEFINICIÓN DE FUENTES (Google Fonts) =============

export const sourceSansPro = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-source-sans',
  display: 'swap',
})

export const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
})

export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-roboto',
  display: 'swap',
})

export const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--font-open-sans',
  display: 'swap',
})

export const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
})

// ============= FUENTES DEL SISTEMA =============
// Fuentes nativas del sistema operativo (sin cargar desde Google Fonts)

/**
 * Para usar fuentes del sistema, crea objetos con esta estructura:
 * { variable: '--font-nombre', className: 'font-nombre' }
 */

// Fuente del sistema de Apple
export const appleSystem = {
  variable: '--font-apple-system',
  className: 'font-apple-system',
  style: { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
}

// Arial (disponible en todos los sistemas)
export const arial = {
  variable: '--font-arial',
  className: 'font-arial',
  style: { fontFamily: 'Arial, Helvetica, sans-serif' },
}

// Ubuntu (Linux)
export const ubuntu = {
  variable: '--font-ubuntu',
  className: 'font-ubuntu',
  style: { fontFamily: 'Ubuntu, -apple-system, "Segoe UI", sans-serif' },
}

// Segoe UI (Windows)
export const segoeUI = {
  variable: '--font-segoe',
  className: 'font-segoe',
  style: { fontFamily: '"Segoe UI", -apple-system, Arial, sans-serif' },
}

// System UI genérica
export const systemUI = {
  variable: '--font-system',
  className: 'font-system',
  style: {
    fontFamily:
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Ubuntu, Roboto, sans-serif',
  },
}

// Fuentes para emojis
export const emojiFont = {
  variable: '--font-emoji',
  className: 'font-emoji',
  style: { fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif' },
}
