/**
 * Format a username for display.
 *
 * Usernames in the DB are stored in lowercase (e.g. "laura", "marta.r",
 * "carlos.garcia"). For UI we want the first letter capitalized.
 *
 * Rules:
 * - Empty / nullish → "".
 * - Single token: first letter uppercased, rest as-is. "laura" → "Laura".
 * - Dot-separated tokens (firstname.lastname pattern): capitalize each token
 *   and join with a space. "carlos.garcia" → "Carlos Garcia",
 *   "marta.r" → "Marta R".
 *
 * Display only — never write the formatted value back to the DB or API.
 */
export function formatUsername(username: string | null | undefined): string {
  if (!username) return ''

  const trimmed = username.trim()
  if (!trimmed) return ''

  return trimmed
    .split('.')
    .map((token) => (token.length === 0 ? '' : token.charAt(0).toUpperCase() + token.slice(1)))
    .join(' ')
}
