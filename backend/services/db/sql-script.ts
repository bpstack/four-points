// services/db/sql-script.ts
/**
 * Ficheros .sql del repositorio para enviarlos en una sola petición
 * multi-statement desde Node, sin el cliente mysql: SOURCE y DELIMITER son
 * comandos de ese cliente, no SQL. Solo para ficheros del repositorio, nunca
 * para texto que venga de una petición.
 */

import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

/**
 * Removes DELIMITER lines; the server already parses CREATE PROCEDURE ... END
 * as one statement, so the custom delimiter goes back to ';'
 */
export function toMultiStatement(sql: string): string {
  let delimiter = ';'
  const out: string[] = []
  for (const line of sql.split(/\r?\n/)) {
    const change = /^\s*DELIMITER\s+(\S+)\s*$/i.exec(line)
    if (change) {
      delimiter = change[1]
      continue
    }
    out.push(
      delimiter !== ';' && line.trimEnd().endsWith(delimiter)
        ? line.trimEnd().slice(0, -delimiter.length) + ';'
        : line
    )
  }
  return out.join('\n')
}

/**
 * Reads a .sql file and inlines its `SOURCE path;` lines (relative to root, as
 * MASTER_INSTALL.sql expects). `transform` may adjust each file's text first
 */
export async function readSqlScript(
  file: string,
  root = dirname(file),
  transform: (path: string, text: string) => string = (_path, text) => text
): Promise<string> {
  const text = transform(file, (await readFile(file, 'utf8')).replace(/\r\n/g, '\n'))
  const parts: string[] = []
  for (const line of text.split('\n')) {
    const source = /^\s*SOURCE\s+(.+?);?\s*$/i.exec(line)
    parts.push(source ? await readSqlScript(resolve(root, source[1]), root, transform) : line)
  }
  return toMultiStatement(parts.join('\n'))
}
