// repositories/group/update-columns.ts

/**
 * Builds the SET clause of a dynamic UPDATE from an allow-list of columns.
 * Keys are interpolated into SQL, so they must never come from the request as-is.
 */
export function buildSetClause(
  data: object,
  allowedColumns: readonly string[]
): { fields: string[]; values: unknown[] } {
  const fields: string[] = []
  const values: unknown[] = []

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && allowedColumns.includes(key)) {
      fields.push(`${key} = ?`)
      values.push(value)
    }
  }

  return { fields, values }
}
