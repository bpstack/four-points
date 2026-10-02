// app/lib/blacklist/blacklistUtils.ts
/**
 * Utilidades para el módulo Blacklist
 * Funciones helper para búsqueda, normalización, highlight, etc.
 */

// ========================================
// HIGHLIGHT DE COINCIDENCIAS
// ========================================

// One UTF-16 unit in, one unit out (lower case, no accent), so indexes in the
// folded text are indexes in the original
function foldChar(c: string): string {
  return c.normalize('NFD')[0].toLowerCase()[0] ?? c
}

export interface HighlightPart {
  text: string
  match: boolean
}

/**
 * Splits `text` into parts that match `searchTerm` (ignoring case and
 * accents) and parts that do not. Rendered as React nodes, never as HTML.
 */
export function splitHighlight(text: string, searchTerm: string): HighlightPart[] {
  const chars = text.split('')
  const term = searchTerm.trim().split('').map(foldChar).join('')
  if (!term) return [{ text, match: false }]

  const folded = chars.map(foldChar).join('')
  const parts: HighlightPart[] = []
  let from = 0
  for (let at = folded.indexOf(term); at !== -1; at = folded.indexOf(term, at + term.length)) {
    if (at > from) parts.push({ text: chars.slice(from, at).join(''), match: false })
    parts.push({ text: chars.slice(at, at + term.length).join(''), match: true })
    from = at + term.length
  }
  if (from < chars.length) parts.push({ text: chars.slice(from).join(''), match: false })
  return parts
}

// ========================================
// FORMATEAR FECHA
// ========================================
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

// ========================================
// FORMATEAR FECHA Y HORA
// ========================================
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

// ========================================
// VALIDAR RANGO DE FECHAS
// ========================================

// ========================================
// CALCULAR DÍAS DE HOSPEDAJE
// ========================================
export function calculateStayDays(checkIn: string, checkOut: string): number {
  const from = new Date(checkIn)
  const to = new Date(checkOut)
  const diffTime = Math.abs(to.getTime() - from.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

// ========================================
// GENERAR NOMBRE DE ARCHIVO PARA EXPORT
// ========================================

// ========================================
// SANITIZAR DOCUMENTO (uppercase, sin espacios)
// ========================================

// ========================================
// VALIDAR FORMATO DNI/NIE ESPAÑOL
// ========================================

// ========================================
// OBTENER COLOR DE SEVERIDAD
// ========================================

// ========================================
// OBTENER ICONO DE SEVERIDAD
// ========================================

// ========================================
// TRUNCAR TEXTO
// ========================================
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

// ========================================
// DEBOUNCE (para búsqueda)
// ========================================
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }

    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// ========================================
// OBTENER INICIALES DE USUARIO
// ========================================
