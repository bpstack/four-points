'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Fuse from 'fuse.js'
import {
  FiSearch,
  FiX,
  FiCheckSquare,
  FiBook,
  FiFileText,
  FiSun,
  FiMoon,
  FiClock,
} from 'react-icons/fi'
import type { Catalog, ChecklistMeta, CategoryMeta, Shift } from '@/app/lib/checklist/types'
import { SHIFT_LABELS, SHIFT_COLORS, DEPT_LABELS } from '@/app/lib/checklist/types'

const TYPE_ICONS = {
  tasks: FiCheckSquare,
  guide: FiBook,
  reference: FiFileText,
}

const SHIFT_ICONS: Record<Shift, React.ComponentType<{ className?: string }>> = {
  morning: FiSun,
  afternoon: FiClock,
  night: FiMoon,
}

function ItemLink({ item, onClose, onItemClick }: { item: ChecklistMeta; onClose?: () => void; onItemClick?: () => void }) {
  const pathname = usePathname()
  const isActive = pathname === `/dashboard/checklist/${item.id}`
  const Icon = TYPE_ICONS[item.type]

  return (
    <Link
      href={`/dashboard/checklist/${item.id}`}
      onClick={() => { onClose?.(); onItemClick?.() }}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
        isActive
          ? 'bg-blue-50 dark:bg-gray-800 text-blue-700 dark:text-blue-400 font-medium'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
      <span className="truncate">{item.title}</span>
    </Link>
  )
}

function CategoryGroup({
  category,
  items,
  onClose,
  onItemClick,
}: {
  category: CategoryMeta
  items: ChecklistMeta[]
  onClose?: () => void
  onItemClick?: () => void
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const md = '(min-width: 768px)'
    const mq = window.matchMedia(md)
    const handle = () => setOpen(mq.matches)
    handle()
    mq.addEventListener('change', handle)
    return () => mq.removeEventListener('change', handle)
  }, [])

  if (items.length === 0) return null

  if (category.subGroupBy === 'shift') {
    const order: Shift[] = category.shiftOrder ?? ['morning', 'afternoon', 'night']
    const byShift = order
      .map((shift) => ({
        shift,
        items: items.filter((i) => i.shift === shift),
      }))
      .filter((g) => g.items.length > 0)

    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <span className={`transition-transform ${open ? 'rotate-90' : ''}`}>{'>'}</span>
          {category.name}
        </button>
        {open && (
          <div className="mt-1 space-y-2 pl-2">
            {byShift.map(({ shift, items: shiftItems }) => {
              const ShiftIcon = SHIFT_ICONS[shift]
              return (
                <div key={shift}>
                  <div
                    className={`flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium ${SHIFT_COLORS[shift]}`}
                  >
                    <ShiftIcon className="w-3 h-3" />
                    {SHIFT_LABELS[shift]}
                  </div>
                  <div className="space-y-0.5">
                    {shiftItems.map((item) => (
                      <ItemLink key={item.id} item={item} onClose={onClose} onItemClick={onItemClick} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
      >
        <span className={`transition-transform ${open ? 'rotate-90' : ''}`}>{'>'}</span>
        {category.name}
      </button>
      {open && (
        <div className="mt-1 space-y-0.5 pl-2">
          {items.map((item) => (
            <ItemLink key={item.id} item={item} onClose={onClose} onItemClick={onItemClick} />
          ))}
        </div>
      )}
    </div>
  )
}

interface Props {
  catalog: Catalog
  onClose?: () => void
  onItemClick?: () => void
}

export function ChecklistTOC({ catalog, onClose, onItemClick }: Props) {
  const [query, setQuery] = useState('')
  const [deptFilter, setDeptFilter] = useState<string | null>(null)
  const [shiftFilter, setShiftFilter] = useState<Shift | null>(null)

  const fuse = useMemo(
    () =>
      new Fuse(catalog.items, {
        keys: ['title', 'description'],
        threshold: 0.35,
      }),
    [catalog.items]
  )

  const filtered = useMemo(() => {
    let items = query.trim() ? fuse.search(query).map((r) => r.item) : catalog.items
    if (deptFilter)
      items = items.filter(
        (i) => i.department === deptFilter || i.departments?.includes(deptFilter)
      )
    if (shiftFilter) items = items.filter((i) => i.shift === shiftFilter)
    return items
  }, [query, deptFilter, shiftFilter, fuse, catalog.items])

  const departments = useMemo(() => {
    const all = catalog.items.flatMap((i) => [i.department, ...(i.departments ?? [])])
    return [...new Set(all)]
  }, [catalog.items])

  const hasFilters = query || deptFilter || shiftFilter

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="px-3 py-3 border-b border-gray-200 dark:border-gray-800">
        <h2 className="hidden md:block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Check List</h2>
        {/* Search */}
        <div className="relative">
          <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar..."
            className="w-full pl-8 pr-7 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <FiX className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filters — desktop only */}
      <div className="hidden md:block px-3 py-2 border-b border-gray-200 dark:border-gray-800 space-y-1.5">
        <div className="flex flex-wrap gap-1">
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setDeptFilter(deptFilter === dept ? null : dept)}
              className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                deptFilter === dept
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400'
              }`}
            >
              {DEPT_LABELS[dept] ?? dept}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {(['morning', 'afternoon', 'night'] as Shift[]).map((shift) => (
            <button
              key={shift}
              onClick={() => setShiftFilter(shiftFilter === shift ? null : shift)}
              className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                shiftFilter === shift
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400'
              }`}
            >
              {SHIFT_LABELS[shift]}
            </button>
          ))}
        </div>
        {hasFilters && (
          <button
            onClick={() => {
              setQuery('')
              setDeptFilter(null)
              setShiftFilter(null)
            }}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Tree */}
      <div className="scrollbar-discrete min-h-0 flex-1 space-y-4 overflow-y-auto px-2 py-3">
        {catalog.categories.map((cat) => (
          <CategoryGroup
            key={cat.id}
            category={cat}
            items={filtered.filter((i) => i.category === cat.id)}
            onClose={onClose}
            onItemClick={onItemClick}
          />
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
            Sin resultados
          </p>
        )}
      </div>
    </div>
  )
}
