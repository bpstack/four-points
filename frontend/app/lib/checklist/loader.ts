import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import type { Catalog, CategoryMeta, ChecklistItem, ChecklistMeta } from './types'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'checklist')

// ---------------------------------------------------------------------------
// In‑memory caches — built once per server lifetime (static content)
// ---------------------------------------------------------------------------
let _catalog: Catalog | null = null
const _items = new Map<string, ChecklistItem>()

function readIndex(): CategoryMeta[] {
  const raw = fs.readFileSync(path.join(CONTENT_DIR, '_index.json'), 'utf-8')
  return JSON.parse(raw).categories as CategoryMeta[]
}

// gray-matter parses YAML dates as JS Date objects — serialize everything to plain strings
function serializeDates(obj: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(obj))
}

function loadJsonItems(dir: string): ChecklistMeta[] {
  const folder = path.join(CONTENT_DIR, dir)
  if (!fs.existsSync(folder)) return []
  return fs
    .readdirSync(folder)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const raw = fs.readFileSync(path.join(folder, f), 'utf-8')
      const data = JSON.parse(raw) as ChecklistItem
      _items.set(data.id, data)
      const { sections: _s, ...meta } = data
      return meta as ChecklistMeta
    })
}

function loadMdItems(dir: string): ChecklistMeta[] {
  const folder = path.join(CONTENT_DIR, dir)
  if (!fs.existsSync(folder)) return []
  return fs
    .readdirSync(folder)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const raw = fs.readFileSync(path.join(folder, f), 'utf-8')
      const { data, content } = matter(raw)
      const meta = serializeDates(data) as unknown as ChecklistMeta
      _items.set(data.id, { ...meta, sections: [], body: content })
      return meta
    })
}

export function getCatalog(): Catalog {
  if (_catalog) return _catalog

  const categories = readIndex()
  const items: ChecklistMeta[] = [
    ...loadJsonItems('tasks'),
    ...loadMdItems('guides'),
    ...loadMdItems('references'),
  ]

  _catalog = { categories, items }
  return _catalog
}

export function getChecklistById(id: string): ChecklistItem | null {
  // In dev, always read fresh from disk so content edits are visible instantly.
  // In production, the in‑memory cache lives for the server lifetime.
  if (process.env.NODE_ENV === 'development') {
    _catalog = null
    _items.clear()
  }
  if (!_catalog) getCatalog()
  return _items.get(id) ?? null
}
