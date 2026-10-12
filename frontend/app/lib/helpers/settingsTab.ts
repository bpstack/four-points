// frontend/app/lib/helpers/settingsTab.ts

/**
 * Resolves the active settings tab from URL parameter.
 * Returns the requested tab if it's available, otherwise the first available tab.
 */
export function resolveSettingsTab(requested: string | null, available: readonly string[]): string {
  if (requested && available.includes(requested)) {
    return requested
  }
  return available[0]
}
