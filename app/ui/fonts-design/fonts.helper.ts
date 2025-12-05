// app/ui/fonts-design/fonts.helper.ts

/**
 * 🎨 CONFIGURACIÓN CENTRAL DE FUENTES
 *
 * Cambia las fuentes de toda la app modificando SOLO este archivo.
 * Luego reinicia el servidor de desarrollo.
 */

import {
  inter,
  montserrat,
  roboto,
  sourceSansPro,
  openSans,
  poppins,
  // Fuentes del sistema (sin cargar desde Google)
  appleSystem,
  arial,
  ubuntu,
  segoeUI,
  systemUI,
  emojiFont,
} from './fonts'

// ============= 🎯 FUENTES ACTIVAS =============
// ✨ Cambia aquí para probar diferentes combinaciones

export const ACTIVE_FONTS = {
  // Fuente principal (texto del cuerpo, párrafos, UI) // se mapea a font-sans
  primary: poppins,

  // Fuente display (títulos, encabezados, hero sections) // se mapea a font-montserrat
  display: ubuntu,
} as const

// ============= 📋 FUENTES DISPONIBLES =============
// Catálogo de todas las fuentes cargadas

export const AVAILABLE_FONTS = {
  // Google Fonts
  inter: {
    name: 'Inter',
    font: inter,
    type: 'google',
    description: 'Moderna y legible, ideal para UIs',
    bestFor: 'Texto principal, interfaces limpias',
  },
  montserrat: {
    name: 'Montserrat',
    font: montserrat,
    type: 'google',
    description: 'Geométrica y elegante',
    bestFor: 'Títulos, headings, branding',
  },
  roboto: {
    name: 'Roboto',
    font: roboto,
    type: 'google',
    description: 'Neutral y versátil de Google',
    bestFor: 'Apps corporativas, dashboards',
  },
  sourceSans: {
    name: 'Source Sans Pro',
    font: sourceSansPro,
    type: 'google',
    description: 'Humanista y profesional de Adobe',
    bestFor: 'Contenido editorial, blogs',
  },
  openSans: {
    name: 'Open Sans',
    font: openSans,
    type: 'google',
    description: 'Amigable y altamente legible',
    bestFor: 'Sitios de contenido, e-commerce',
  },

  // Fuentes del Sistema (sin carga externa)
  ubuntu: {
    name: 'Ubuntu',
    font: ubuntu,
    type: 'system',
    description: 'Fuente nativa de Linux Ubuntu',
    bestFor: 'Apps minimalistas, carga ultra-rápida',
  },
  appleSystem: {
    name: 'Apple System',
    font: appleSystem,
    type: 'system',
    description: 'San Francisco (macOS/iOS)',
    bestFor: 'Look & feel nativo de Apple',
  },
  arial: {
    name: 'Arial',
    font: arial,
    type: 'system',
    description: 'Clásica universal',
    bestFor: 'Compatibilidad máxima',
  },
  segoeUI: {
    name: 'Segoe UI',
    font: segoeUI,
    type: 'system',
    description: 'Fuente nativa de Windows',
    bestFor: 'Look & feel de Windows',
  },
  systemUI: {
    name: 'System UI',
    font: systemUI,
    type: 'system',
    description: 'Fuente nativa del SO actual',
    bestFor: 'Rendimiento óptimo, look nativo',
  },
  emoji: {
    name: 'Emoji Font',
    font: emojiFont,
    type: 'system',
    description: 'Apple/Segoe/Noto Color Emoji',
    bestFor: 'Soporte de emojis coloridos',
  },
} as const

// ============= 🎨 COMBINACIONES RECOMENDADAS =============

export const FONT_COMBINATIONS = {
  modern: {
    name: 'Moderna & Limpia',
    primary: inter,
    display: montserrat,
    description: 'Perfecta para startups y apps modernas',
  },
  professional: {
    name: 'Profesional',
    primary: sourceSansPro,
    display: roboto,
    description: 'Ideal para dashboards corporativos',
  },
  friendly: {
    name: 'Amigable',
    primary: openSans,
    display: montserrat,
    description: 'Cálida y accesible para usuarios',
  },
  editorial: {
    name: 'Editorial',
    primary: sourceSansPro,
    display: sourceSansPro,
    description: 'Una sola fuente para contenido largo',
  },
  techie: {
    name: 'Tech',
    primary: roboto,
    display: roboto,
    description: 'Estilo Google Material Design',
  },

  // Combinaciones con fuentes del sistema
  native: {
    name: 'Nativa del Sistema',
    primary: systemUI,
    display: systemUI,
    description: '⚡ Carga instantánea, look nativo del SO',
  },
  linux: {
    name: 'Linux Style',
    primary: ubuntu,
    display: ubuntu,
    description: '🐧 Estilo Ubuntu/Linux',
  },
  apple: {
    name: 'Apple Style',
    primary: appleSystem,
    display: appleSystem,
    description: '🍎 San Francisco (macOS/iOS)',
  },
  classic: {
    name: 'Clásica Universal',
    primary: arial,
    display: arial,
    description: '📜 Arial en todo el sistema',
  },
  hybrid: {
    name: 'Híbrida (Sistema + Google)',
    primary: systemUI,
    display: montserrat,
    description: '🔥 Rendimiento + Estilo',
  },
} as const

// ============= 🔧 HELPERS =============

/**
 * Obtiene las clases CSS necesarias para el <html>
 */
export function getFontVariables(): string {
  return `${ACTIVE_FONTS.primary.variable} ${ACTIVE_FONTS.display.variable}`
}

/**
 * Aplica una combinación predefinida
 * @example
 * // En fonts.helper.ts:
 * export const ACTIVE_FONTS = applyFontCombination('modern')
 */
export function applyFontCombination(combination: keyof typeof FONT_COMBINATIONS) {
  const combo = FONT_COMBINATIONS[combination]
  return {
    primary: combo.primary,
    display: combo.display,
  }
}

/**
 * Para debugging: muestra la configuración actual
 */
export function getCurrentFontConfig() {
  return {
    primary: {
      variable: ACTIVE_FONTS.primary.variable,
      className: ACTIVE_FONTS.primary.className,
    },
    display: {
      variable: ACTIVE_FONTS.display.variable,
      className: ACTIVE_FONTS.display.className,
    },
  }
}

// ============= 📝 GUÍA DE USO =============

/**
 * CÓMO CAMBIAR LAS FUENTES:
 *
 * 1. Modifica ACTIVE_FONTS arriba:
 *    export const ACTIVE_FONTS = {
 *      primary: ubuntu,       // ← Fuente del sistema
 *      display: montserrat,   // ← Google Font
 *    }
 *
 * 2. O usa una combinación predefinida:
 *    export const ACTIVE_FONTS = applyFontCombination('linux')
 *
 * 3. Reinicia el servidor de desarrollo
 *
 * 4. Visita /fonts-test para ver los cambios
 *
 * 💡 FUENTES DEL SISTEMA vs GOOGLE FONTS:
 *
 * Fuentes del Sistema (ubuntu, arial, appleSystem, etc.):
 * ✅ Carga instantánea (0ms)
 * ✅ No requieren descarga
 * ✅ Look nativo del sistema operativo
 * ❌ Pueden verse diferentes en cada OS
 *
 * Google Fonts (inter, montserrat, roboto, etc.):
 * ✅ Look consistente en todos los navegadores
 * ✅ Más opciones de estilo
 * ❌ Requieren descarga (~20-50kb por fuente)
 *
 * 🔥 COMBINACIÓN HÍBRIDA (recomendada):
 * primary: systemUI    → Texto rápido y nativo
 * display: montserrat  → Títulos con personalidad
 *
 * ⚠️ IMPORTANTE:
 * - NO necesitas tocar design-system.ts
 * - NO necesitas tocar tailwind.config.ts
 * - Las clases font-sans y font-montserrat se actualizan automáticamente
 */
