import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import type { Catalog, CategoryMeta, ChecklistItem, ChecklistMeta } from './types'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'checklist')

function readIndex(): CategoryMeta[] {
  const raw = fs.readFileSync(path.join(CONTENT_DIR, '_index.json'), 'utf-8')
  return JSON.parse(raw).categories as CategoryMeta[]
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
      // strip sections from catalog meta (keep them for detail only)
      const { sections: _s, ...meta } = data
      return meta as ChecklistMeta
    })
}

// gray-matter parses YAML dates as JS Date objects — serialize everything to plain strings
function serializeDates(obj: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(obj))
}

function loadMdItems(dir: string): ChecklistMeta[] {
  const folder = path.join(CONTENT_DIR, dir)
  if (!fs.existsSync(folder)) return []
  return fs
    .readdirSync(folder)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const raw = fs.readFileSync(path.join(folder, f), 'utf-8')
      const { data } = matter(raw)
      return serializeDates(data) as unknown as ChecklistMeta
    })
}

export function getCatalog(): Catalog {
  const categories = readIndex()
  const items: ChecklistMeta[] = [
    ...loadJsonItems('tasks'),
    ...loadMdItems('guides'),
    ...loadMdItems('references'),
  ]
  return { categories, items }
}

export function getChecklistById(id: string): ChecklistItem | null {
  // Try tasks (JSON)
  const tasksDir = path.join(CONTENT_DIR, 'tasks')
  if (fs.existsSync(tasksDir)) {
    for (const f of fs.readdirSync(tasksDir).filter((f) => f.endsWith('.json'))) {
      const raw = fs.readFileSync(path.join(tasksDir, f), 'utf-8')
      const data = JSON.parse(raw) as ChecklistItem
      if (data.id === id) return data
    }
  }

  // Try guides + references (MD)
  for (const dir of ['guides', 'references']) {
    const folder = path.join(CONTENT_DIR, dir)
    if (!fs.existsSync(folder)) continue
    for (const f of fs.readdirSync(folder).filter((f) => f.endsWith('.md'))) {
      const raw = fs.readFileSync(path.join(folder, f), 'utf-8')
      const { data, content } = matter(raw)
      if (data.id === id)
        return {
          ...(serializeDates(data) as unknown as ChecklistMeta),
          sections: [],
          body: content,
        }
    }
  }

  return null
}
