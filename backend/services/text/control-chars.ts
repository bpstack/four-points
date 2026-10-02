// services/text/control-chars.ts

// C0 controls except tab (9) and newline (10, 13), plus DEL and C1 (127-159).
// ESC (27) is the start of ANSI escape sequences, which can rewrite what a
// terminal shows
function isControl(code: number): boolean {
  return (code < 32 && code !== 9 && code !== 10 && code !== 13) || (code >= 127 && code < 160)
}

/** True when the text has no control characters other than tab and newlines. */
export function hasNoControlChars(text: string): boolean {
  return ![...text].some((c) => isControl(c.charCodeAt(0)))
}

/** Text safe to print on a terminal: control characters become "?". */
export function printable(text: unknown): string {
  return [...String(text ?? '')].map((c) => (isControl(c.charCodeAt(0)) ? '?' : c)).join('')
}
