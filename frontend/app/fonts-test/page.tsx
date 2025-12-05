// app/fonts-test/page.tsx

'use client'

import { typography } from '../ui/fonts-design/design-system'
import { AVAILABLE_FONTS, ACTIVE_FONTS, FONT_COMBINATIONS } from '../ui/fonts-design/fonts.helper'

export default function FontsTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm">
          <h1 className={typography.preset.h1 + ' text-gray-900 dark:text-white mb-2'}>
            🎨 Sistema de Fuentes
          </h1>
          <p className={typography.preset.lead + ' text-gray-600 dark:text-gray-300'}>
            Prueba y visualiza diferentes combinaciones de fuentes
          </p>
        </div>

        {/* Configuración Actual */}
        <section className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
          <h2 className={typography.preset.h3 + ' text-blue-900 dark:text-blue-100 mb-4'}>
            ✨ Configuración Actual
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Fuente Principal
              </div>
              <div className={typography.preset.h4 + ' text-gray-900 dark:text-white'}>
                {ACTIVE_FONTS.primary.variable.replace('--font-', '')}
              </div>
              <div className={typography.preset.small + ' text-gray-600 dark:text-gray-300 mt-2'}>
                Para párrafos, textos y UI
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Fuente Display
              </div>
              <div className={typography.preset.h4 + ' text-gray-900 dark:text-white'}>
                {ACTIVE_FONTS.display.variable.replace('--font-', '')}
              </div>
              <div className={typography.preset.small + ' text-gray-600 dark:text-gray-300 mt-2'}>
                Para títulos y headings
              </div>
            </div>
          </div>
        </section>

        {/* Presets de Tipografía */}
        <section className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm">
          <h2 className={typography.preset.h2 + ' text-gray-900 dark:text-white mb-6'}>
            Jerarquía Tipográfica
          </h2>

          <div className="space-y-6">
            {/* Headings */}
            <div>
              <div className="text-xs font-mono text-gray-500 dark:text-gray-400 mb-2">
                typography.preset.h1
              </div>
              <h1 className={typography.preset.h1 + ' text-gray-900 dark:text-white'}>
                The quick brown fox jumps
              </h1>
            </div>

            <div>
              <div className="text-xs font-mono text-gray-500 dark:text-gray-400 mb-2">
                typography.preset.h2
              </div>
              <h2 className={typography.preset.h2 + ' text-gray-900 dark:text-white'}>
                The quick brown fox jumps over
              </h2>
            </div>

            <div>
              <div className="text-xs font-mono text-gray-500 dark:text-gray-400 mb-2">
                typography.preset.h3
              </div>
              <h3 className={typography.preset.h3 + ' text-gray-900 dark:text-white'}>
                The quick brown fox jumps over the lazy
              </h3>
            </div>

            <div>
              <div className="text-xs font-mono text-gray-500 dark:text-gray-400 mb-2">
                typography.preset.h4
              </div>
              <h4 className={typography.preset.h4 + ' text-gray-900 dark:text-white'}>
                The quick brown fox jumps over the lazy dog
              </h4>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
              <div className="text-xs font-mono text-gray-500 dark:text-gray-400 mb-2">
                typography.preset.body
              </div>
              <p className={typography.preset.body + ' text-gray-700 dark:text-gray-300'}>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
                incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
                exercitation ullamco laboris.
              </p>
            </div>

            <div>
              <div className="text-xs font-mono text-gray-500 dark:text-gray-400 mb-2">
                typography.preset.lead
              </div>
              <p className={typography.preset.lead + ' text-gray-600 dark:text-gray-400'}>
                Un texto destacado que captura la atención del lector con un tamaño ligeramente
                mayor y más espacio entre líneas.
              </p>
            </div>

            <div>
              <div className="text-xs font-mono text-gray-500 dark:text-gray-400 mb-2">
                typography.preset.small
              </div>
              <p className={typography.preset.small + ' text-gray-600 dark:text-gray-400'}>
                Texto secundario, labels, metadatos y descripciones cortas.
              </p>
            </div>
          </div>
        </section>

        {/* Fuentes Disponibles */}
        <section className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm">
          <h2 className={typography.preset.h2 + ' text-gray-900 dark:text-white mb-6'}>
            📚 Fuentes Disponibles
          </h2>

          <div className="grid gap-6">
            {Object.entries(AVAILABLE_FONTS).map(([key, font]) => (
              <div key={key} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={typography.preset.h4 + ' text-gray-900 dark:text-white'}>
                        {font.name}
                      </h3>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded ${
                          font.type === 'system'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                        }`}
                      >
                        {font.type === 'system' ? '⚡ Sistema' : '☁️ Google'}
                      </span>
                    </div>
                    <p className={typography.preset.small + ' text-gray-600 dark:text-gray-400'}>
                      {font.description}
                    </p>
                    <p
                      className={
                        typography.preset.caption + ' text-gray-500 dark:text-gray-500 mt-1'
                      }
                    >
                      Mejor para: {font.bestFor}
                    </p>
                  </div>
                </div>

                <div className="space-y-2" style={'style' in font.font ? font.font.style : {}}>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    The quick brown fox jumps over the lazy dog
                  </p>
                  <p className="text-base text-gray-700 dark:text-gray-300">
                    Pack my box with five dozen liquor jugs. How vexingly quick daft zebras jump!
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    0123456789 - ¿? ¡! @#$%&*() 😀 🎨 ✨
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Combinaciones Recomendadas */}
        <section className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-8">
          <h2 className={typography.preset.h2 + ' text-gray-900 dark:text-white mb-4'}>
            🎯 Combinaciones Recomendadas
          </h2>
          <p className={typography.preset.body + ' text-gray-700 dark:text-gray-300 mb-6'}>
            Copia una de estas combinaciones en{' '}
            <code className="bg-gray-800 text-yellow-400 px-2 py-1 rounded text-sm">
              fonts.helper.ts
            </code>
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(FONT_COMBINATIONS).map(([key, combo]) => (
              <div key={key} className="bg-white dark:bg-gray-800 rounded-lg p-6">
                <h3 className={typography.preset.h4 + ' text-gray-900 dark:text-white mb-2'}>
                  {combo.name}
                </h3>
                <p className={typography.preset.small + ' text-gray-600 dark:text-gray-400 mb-4'}>
                  {combo.description}
                </p>
                <div className="bg-gray-100 dark:bg-gray-900 rounded p-3 font-mono text-xs text-gray-800 dark:text-gray-200">
                  <div>primary: {combo.primary.variable.replace('--font-', '')}</div>
                  <div>display: {combo.display.variable.replace('--font-', '')}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Instrucciones */}
        <section className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-8">
          <h2 className={typography.preset.h3 + ' text-yellow-900 dark:text-yellow-100 mb-4'}>
            💡 Cómo cambiar las fuentes
          </h2>
          <ol className="space-y-3 text-gray-700 dark:text-gray-300">
            <li className="flex gap-3">
              <span className="font-bold text-yellow-600 dark:text-yellow-400">1.</span>
              <span>
                Abre{' '}
                <code className="bg-gray-800 text-yellow-400 px-2 py-1 rounded text-sm">
                  app/ui/fonts-design/fonts.helper.ts
                </code>
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-yellow-600 dark:text-yellow-400">2.</span>
              <span>
                Modifica{' '}
                <code className="bg-gray-800 text-yellow-400 px-2 py-1 rounded text-sm">
                  ACTIVE_FONTS
                </code>{' '}
                con las fuentes que quieras
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-yellow-600 dark:text-yellow-400">3.</span>
              <span>Reinicia el servidor de desarrollo</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-yellow-600 dark:text-yellow-400">4.</span>
              <span>Recarga esta página para ver los cambios ✨</span>
            </li>
          </ol>
        </section>
      </div>
    </div>
  )
}
