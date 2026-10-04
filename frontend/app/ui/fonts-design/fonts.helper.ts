// app/ui/fonts-design/fonts.helper.ts

/**
 * 🎨 CONFIGURACIÓN CENTRAL DE FUENTES
 *
 * Cambia las fuentes de toda la app modificando SOLO este archivo.
 * Luego reinicia el servidor de desarrollo.
 */

import {
  poppins,
  ubuntu,
  // Fuentes del sistema adicionales (no añaden peso de descarga)
  appleSystem,
  arial,
  segoeUI,
  systemUI,
  emojiFont,
} from './fonts'

// Re-export para uso en otros lugares si es necesario
export { poppins, ubuntu, appleSystem, arial, segoeUI, systemUI, emojiFont } from './fonts'

// ============= 🎯 FUENTES ACTIVAS =============
// ✨ Cambia aquí para probar diferentes combinaciones

export const ACTIVE_FONTS = {
  // Fuente principal (texto del cuerpo, párrafos, UI) // se mapea a font-sans
  primary: poppins,

  // Fuente display (títulos, encabezados, hero sections) // se mapea a font-montserrat
  display: ubuntu,
} as const

// ============= 📋 FUENTES DISPONIBLES =============
// Catálogo de fuentes cargadas actualmente

export const AVAILABLE_FONTS = {
  // Google Fonts (activas)
  poppins: {
    name: 'Poppins',
    font: poppins,
    type: 'google',
    description: 'Geométrica y moderna',
    bestFor: 'UI, headings, texto general',
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
  current: {
    name: 'Actual (Poppins + Ubuntu)',
    primary: poppins,
    display: ubuntu,
    description: 'Configuración actual del proyecto',
  },

  // Combinaciones con fuentes del sistema (sin descarga adicional)
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
    name: 'Híbrida (Poppins + Sistema)',
    primary: poppins,
    display: systemUI,
    description: '🔥 Google Font + Sistema nativo',
  },
} as const

// ============= 🔧 HELPERS =============

/**
 * Aplica una combinación predefinida
 * @example
 * // En fonts.helper.ts:
 * export const ACTIVE_FONTS = applyFontCombination('current')
 */
export function applyFontCombination(combination: keyof typeof FONT_COMBINATIONS) {
  const combo = FONT_COMBINATIONS[combination]
  return {
    primary: combo.primary,
    display: combo.display,
  }
}

// ============= 📝 GUÍA DE USO =============

/**
 * CÓMO CAMBIAR LAS FUENTES:
 *
 * 1. Modifica ACTIVE_FONTS arriba:
 *    export const ACTIVE_FONTS = {
 *      primary: poppins,    // ← Google Font activa
 *      display: ubuntu,     // ← Fuente del sistema
 *    }
 *
 * 2. O usa una combinación predefinida:
 *    export const ACTIVE_FONTS = applyFontCombination('native')
 *
 * 3. Reinicia el servidor de desarrollo
 *
 * 💡 PARA AÑADIR MÁS GOOGLE FONTS:
 *
 * 1. Ve a fonts.ts
 * 2. Descomenta la fuente que necesitas (ej: inter, montserrat)
 * 3. Añádela a los imports en este archivo
 * 4. Úsala en ACTIVE_FONTS
 *
 * ⚠️ IMPORTANTE:
 * - Cada Google Font añade ~20-50kb de descarga
 * - Las fuentes del sistema (ubuntu, arial, etc.) NO añaden peso
 * - NO necesitas tocar design-system.ts ni tailwind.config.ts
 */
