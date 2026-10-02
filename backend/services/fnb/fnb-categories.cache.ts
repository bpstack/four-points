import pool from '../../config/db.js'
import type { FnbCategory, FnbGroupType } from '../../models/fnb/fnb.models.js'

// Single source of truth: fnb_category table. Cached at first access.
// All hardcoded code lists (parser, manual controller, repo) should source from here.

let cache: FnbCategory[] | null = null

export async function loadCategories(force = false): Promise<FnbCategory[]> {
  if (cache && !force) return cache
  const [rows] = await pool.execute<any[]>(
    'SELECT code, name, group_type, display_order FROM fnb_category ORDER BY display_order'
  )
  cache = rows.map((r: any) => ({
    code: r.code,
    name: r.name,
    group_type: r.group_type as FnbGroupType,
    display_order: r.display_order,
  }))
  return cache
}

export function invalidateCategories(): void {
  cache = null
}

// Helpers (await loadCategories first)
export async function trackedCodesSet(): Promise<Set<string>> {
  const cats = await loadCategories()
  return new Set(cats.map((c) => c.code))
}
