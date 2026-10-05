// app/lib/helpers/safeHref.ts

// Schemes a link written in content (checklist notes, guides) may use.
// Anything else (javascript:, data:, vbscript:…) is not rendered as a link.
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:'])

/**
 * The href if it is safe to render, otherwise undefined. Parsed with URL, as
 * the browser does: it drops tabs and newlines and ignores case, so
 * "java\nscript:" or "JavaScript:" are caught as javascript:. Relative paths
 * resolve against an https base and pass.
 */
export function safeHref(href: string | undefined | null): string | undefined {
  if (!href) return undefined
  try {
    const { protocol } = new URL(href, 'https://four-points.invalid/')
    return ALLOWED_PROTOCOLS.has(protocol) ? href : undefined
  } catch {
    return undefined
  }
}
