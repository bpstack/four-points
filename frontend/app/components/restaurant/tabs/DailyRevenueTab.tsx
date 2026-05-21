'use client'

import { useState, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  FiUploadCloud,
  FiTrendingUp,
  FiCoffee,
  FiSun,
  FiEdit2,
  FiPlusCircle,
  FiX,
} from 'react-icons/fi'
import { API_BASE_URL } from '@/app/lib/env'
import { apiClient } from '@/app/lib/apiClient'
import DatePickerInput from '@/app/ui/calendar/DatePickerInput'
import { CurrencySpinner } from '@/app/ui/components/CurrencySpinner'
import { SelectDropdown } from '@/app/ui/components/SelectDropdown'

// ─── Types ───────────────────────────────────────────────────────────────────

interface MonthlyRow {
  date: string
  breakfast_included: number
  breakfast_excluded: number
  breakfast_directo: number
  lunch_food: number
  lunch_bev: number
  dinner_food: number
  dinner_bev: number
  breakfast_total: number
  lunch_total: number
  dinner_total: number
  la_caseta_total: number
  fnb_total: number
}

interface MonthlyResponse {
  year: number
  month: number
  rows: MonthlyRow[]
}

interface UploadResponse {
  date: string
  updated: { code: string; name: string; amount: number }[]
  totals: { breakfast: number; lunch: number; dinner: number; la_caseta: number; fnb_total: number }
  grandTotal: number | null
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MONTH_NAMES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

const COLORS = {
  breakfast: '#f59e0b',
  lunch: '#3b82f6',
  dinner: '#8b5cf6',
  laCaseta: '#10b981',
  fnb: '#ef4444',
}

const PIE_COLORS = ['#f59e0b', '#3b82f6', '#8b5cf6']

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Round to 2 decimals — avoids JS float drift in aggregates (0.1 + 0.2 = 0.30000000000000004)
const r2 = (n: number) => Math.round(n * 100) / 100

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(n)

const fmtShort = (n: number) =>
  new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(n) + ' €'

const dayLabel = (date: string) => {
  const d = new Date(date + 'T12:00:00Z')
  return String(d.getUTCDate()).padStart(2, '0')
}

// ─── API calls ───────────────────────────────────────────────────────────────

async function fetchMonthly(year: number, month: number): Promise<MonthlyResponse> {
  return apiClient.get<MonthlyResponse>(
    `${API_BASE_URL}/api/fnb/monthly?year=${year}&month=${month}`
  )
}

async function uploadPdf(file: File): Promise<UploadResponse> {
  const form = new FormData()
  form.append('pdf', file)
  return apiClient.postFormData<UploadResponse>(`${API_BASE_URL}/api/fnb/upload`, form)
}

interface ManualEntryPayload {
  date: string
  values: Record<string, number>
}

async function saveManualEntry(payload: ManualEntryPayload): Promise<UploadResponse> {
  return apiClient.post<UploadResponse>(`${API_BASE_URL}/api/fnb/entries`, payload)
}

// ─── Category fields for manual entry ────────────────────────────────────────

const MANUAL_FIELDS: { code: string; label: string; group: string }[] = [
  { code: '21110', label: 'Breakfast Included', group: 'Desayuno' },
  { code: '21124', label: 'Breakfast Excluded', group: 'Desayuno' },
  { code: '21120', label: 'Breakfast Directo FB', group: 'Desayuno' },
  { code: '21111', label: 'Lunch Food', group: 'Almuerzo' },
  { code: '21267', label: 'Lunch Beverage', group: 'Almuerzo' },
  { code: '21112', label: 'Dinner Food', group: 'Cena' },
  { code: '21307', label: 'Dinner Beverage', group: 'Cena' },
]

// ─── Sub-components ──────────────────────────────────────────────────────────

function ManualEntryModal({
  initialDate,
  initialValues,
  onClose,
  onSave,
  lookupDate,
  isSaving,
}: {
  initialDate: string
  initialValues?: Record<string, number>
  onClose: () => void
  onSave: (payload: ManualEntryPayload) => void
  lookupDate: (date: string) => Record<string, number> | undefined
  isSaving?: boolean
}) {
  const [date, setDate] = useState<string | undefined>(initialDate || undefined)
  const [vals, setVals] = useState<Record<string, string>>(() =>
    Object.fromEntries(MANUAL_FIELDS.map((f) => [f.code, String(initialValues?.[f.code] ?? '0')]))
  )

  const handleDateChange = (newDate: string | undefined) => {
    setDate(newDate)
    if (!newDate) return
    const existing = lookupDate(newDate)
    setVals(
      Object.fromEntries(
        MANUAL_FIELDS.map((f) => [f.code, String(existing ? (existing[f.code] ?? 0) : 0)])
      )
    )
  }

  const set = (code: string, v: string) => setVals((p) => ({ ...p, [code]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!date) return
    const values: Record<string, number> = {}
    for (const f of MANUAL_FIELDS) {
      const n = parseFloat(vals[f.code].replace(',', '.'))
      values[f.code] = isNaN(n) ? 0 : n
    }
    onSave({ date, values })
  }

  const groups = [...new Set(MANUAL_FIELDS.map((f) => f.group))]

  // Totals preview
  const total = MANUAL_FIELDS.reduce((s, f) => s + (parseFloat(vals[f.code]) || 0), 0)
  const breakfastTotal = ['21110', '21124', '21120'].reduce(
    (s, c) => s + (parseFloat(vals[c]) || 0),
    0
  )
  const casetaTotal = ['21111', '21267', '21112', '21307'].reduce(
    (s, c) => s + (parseFloat(vals[c]) || 0),
    0
  )

  const fmtPreview = (n: number) =>
    n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-lg bg-surface border border-border rounded-t-2xl sm:rounded-fp-lg shadow-2xl overflow-y-auto max-h-[94vh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border sticky top-0 bg-surface z-10">
          <div>
            <h2 className="text-sm font-semibold text-fg">Entrada manual F&B</h2>
            <p className="text-[10px] text-fg-muted mt-0.5">
              Selecciona la fecha — los campos se rellenan automáticamente
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-fp-sm hover:bg-surface-hover text-fg-muted transition-colors"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Date picker */}
          <DatePickerInput
            label="Fecha del reporte"
            value={date}
            onChange={handleDateChange}
            required
            clearable={false}
            size="md"
          />

          {/* Fields by group */}
          {groups.map((group) => (
            <div key={group}>
              <div className="flex items-center gap-2 mb-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-fg-muted">
                  {group}
                </p>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {MANUAL_FIELDS.filter((f) => f.group === group).map((f) => (
                  <CurrencySpinner
                    key={f.code}
                    label={f.label}
                    value={vals[f.code]}
                    onChange={(v) => set(f.code, v)}
                    step={0.01}
                    fastStep={1}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Totals preview */}
          <div className="rounded-fp-sm bg-surface-hover border border-border p-3 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[10px] text-fg-muted font-medium">Desayuno</p>
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 tabular-nums mt-0.5">
                {fmtPreview(breakfastTotal)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-fg-muted font-medium">La Caseta</p>
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 tabular-nums mt-0.5">
                {fmtPreview(casetaTotal)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-fg-muted font-medium">F&B Total</p>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
                {fmtPreview(total)}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-fp-sm border border-border bg-surface text-fg-muted text-sm py-2.5 hover:bg-surface-hover transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!date || isSaving}
              className="flex-1 rounded-fp-sm bg-accent text-white text-sm py-2.5 hover:bg-accent/90 transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Guardando...' : 'Guardar día'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string
  color: string
}) {
  return (
    <div className="bg-surface border border-border rounded-fp-md shadow-fp-pop p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs text-fg-muted font-medium truncate">{label}</p>
          <p className={`text-base sm:text-lg font-bold mt-0.5 ${color}`}>{value}</p>
        </div>
        <Icon className={`w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 ${color}`} />
      </div>
    </div>
  )
}

function UploadZone({
  onUpload,
  isLoading,
}: {
  onUpload: (file: File) => void
  isLoading: boolean
}) {
  const t = useTranslations('restaurant.dailyRevenue.upload')
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleFile = useCallback(
    (f: File | null) => {
      if (!f || f.type !== 'application/pdf') return
      onUpload(f)
    },
    [onUpload]
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      handleFile(e.dataTransfer.files[0] ?? null)
    },
    [handleFile]
  )

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => !isLoading && inputRef.current?.click()}
      className={`group relative flex flex-col items-center justify-center gap-2 rounded-fp-md border-2 border-dashed p-4 sm:p-6 cursor-pointer transition-colors
        ${
          dragging
            ? 'border-accent bg-accent/10'
            : 'border-accent/40 hover:border-accent hover:bg-accent/5'
        }
        ${isLoading ? 'opacity-60 cursor-wait pointer-events-none' : ''}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />
      {isLoading ? (
        <>
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="text-xs text-accent">{t('uploading')}</p>
        </>
      ) : (
        <>
          <FiUploadCloud className="w-7 h-7 text-accent transition-transform duration-300 group-hover:-translate-y-1" />
          <p className="text-xs sm:text-sm font-medium text-fg">{t('label')}</p>
          <p className="text-[10px] text-fg-muted">
            {t('hint')} · {t('hintType')}
          </p>
        </>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DailyRevenueTab() {
  const t = useTranslations('restaurant.dailyRevenue')
  const qc = useQueryClient()

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [modal, setModal] = useState<{ date: string; values?: Record<string, number> } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['fnb-monthly', year, month],
    queryFn: () => fetchMonthly(year, month),
    staleTime: 60_000,
  })

  const { mutate: doManual, isPending: savingManual } = useMutation<UploadResponse, Error, ManualEntryPayload>({
    mutationFn: saveManualEntry,
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['fnb-monthly'] })
      setModal(null)
      toast.success(`Datos guardados para ${result.date}`)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Error al guardar')
    },
  })

  const { mutate: doUpload, isPending: uploading } = useMutation({
    mutationFn: uploadPdf,
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['fnb-monthly'] })
      toast.success(t('upload.success', { date: result.date }))
    },
    onError: (err: Error) => {
      toast.error(err.message || t('upload.error'))
    },
  })

  const rows = data?.rows ?? []

  const lookupDate = useCallback(
    (date: string): Record<string, number> | undefined => {
      const row = rows.find((r) => r.date === date)
      if (!row) return undefined
      return {
        '21110': row.breakfast_included,
        '21124': row.breakfast_excluded,
        '21120': row.breakfast_directo,
        '21111': row.lunch_food,
        '21267': row.lunch_bev,
        '21112': row.dinner_food,
        '21307': row.dinner_bev,
      }
    },
    [rows]
  )

  // ── Totals ──
  const totBreakfast = r2(rows.reduce((s, r) => s + r.breakfast_total, 0))
  const totCaseta = r2(rows.reduce((s, r) => s + r.la_caseta_total, 0))
  const totFnb = r2(rows.reduce((s, r) => s + r.fnb_total, 0))
  const avgPerDay = rows.length ? r2(totFnb / rows.length) : 0

  // ── Chart data ──
  const lineData = rows.map((r) => ({
    day: dayLabel(r.date),
    breakfast: r.breakfast_total,
    laCaseta:  r.la_caseta_total,
    fnb:       r.fnb_total,
  }))

  const pieData = [
    { name: t('groups.breakfast'), value: totBreakfast },
    { name: t('groups.lunch'),     value: r2(rows.reduce((s, r) => s + r.lunch_total, 0)) },
    { name: t('groups.dinner'),    value: r2(rows.reduce((s, r) => s + r.dinner_total, 0)) },
  ].filter((d) => d.value > 0)

  const barData = rows.map((r) => ({
    day: dayLabel(r.date),
    breakfast: r.breakfast_total,
    lunch:     r.lunch_total,
    dinner:    r.dinner_total,
  }))

  // ── Month selector ──
  const yearOptions = [2024, 2025, 2026, 2027]

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Controls row */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <SelectDropdown<number>
            value={year}
            onChange={setYear}
            options={yearOptions.map((y) => ({ value: y, label: String(y) }))}
            size="md"
          />
          <SelectDropdown<number>
            value={month}
            onChange={setMonth}
            options={MONTH_NAMES_ES.map((name, i) => ({ value: i + 1, label: name }))}
            size="md"
          />
          <span className="text-xs text-fg-muted">
            {rows.length} {rows.length === 1 ? 'día' : 'días'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const pad = (n: number) => String(n).padStart(2, '0')
              // Clamp to valid day within selected month to avoid e.g. "2026-02-30"
              const daysInMonth = new Date(year, month, 0).getDate()
              const day = Math.min(now.getDate(), daysInMonth)
              const today = `${year}-${pad(month)}-${pad(day)}`
              setModal({ date: today, values: lookupDate(today) })
            }}
            className="flex items-center gap-1.5 rounded-fp-sm border border-border bg-surface text-fg text-xs sm:text-sm px-3 py-2 hover:bg-surface-hover transition-colors whitespace-nowrap"
          >
            <FiPlusCircle className="w-4 h-4" />
            Añadir día
          </button>
          <div className="w-48 sm:w-64">
            <UploadZone onUpload={doUpload} isLoading={uploading} />
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <SummaryCard
          icon={FiCoffee}
          label={t('summary.totalBreakfast')}
          value={fmt(totBreakfast)}
          color="text-amber-500 dark:text-amber-400"
        />
        <SummaryCard
          icon={FiSun}
          label={t('summary.totalCaseta')}
          value={fmt(totCaseta)}
          color="text-blue-500 dark:text-blue-400"
        />
        <SummaryCard
          icon={FiTrendingUp}
          label={t('summary.totalFnb')}
          value={fmt(totFnb)}
          color="text-emerald-600 dark:text-emerald-400"
        />
        <SummaryCard
          icon={FiTrendingUp}
          label={t('summary.avgPerDay')}
          value={fmt(avgPerDay)}
          color="text-violet-500 dark:text-violet-400"
        />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      )}

      {!isLoading && rows.length === 0 && (
        <div className="rounded-fp-md border border-border bg-surface py-10 text-center text-sm text-fg-muted">
          {t('noData')}
        </div>
      )}

      {!isLoading && rows.length > 0 && (
        <>
          {/* Charts row */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 sm:gap-4">
            {/* Line chart — daily F&B evolution */}
            <div className="xl:col-span-2 bg-surface border border-border rounded-fp-md shadow-fp-pop p-3 sm:p-4">
              <h3 className="text-xs sm:text-sm font-semibold text-fg mb-3">
                {t('charts.dailyFnb')}
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={lineData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--fp-border)" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--fp-fg-muted)' }} />
                  <YAxis
                    tickFormatter={(v) => fmtShort(v)}
                    tick={{ fontSize: 10, fill: 'var(--fp-fg-muted)' }}
                    width={60}
                  />
                  <Tooltip
                    formatter={(v: number) => fmt(v)}
                    labelFormatter={(l) => `Día ${l}`}
                    contentStyle={{
                      fontSize: 11,
                      borderRadius: 6,
                      border: '1px solid var(--fp-border)',
                      background: 'var(--fp-surface-elevated)',
                      color: 'var(--fp-fg)',
                    }}
                  />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Line
                    type="monotone"
                    dataKey="breakfast"
                    name={t('groups.breakfast')}
                    stroke={COLORS.breakfast}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="laCaseta"
                    name={t('groups.laCaseta')}
                    stroke={COLORS.laCaseta}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="fnb"
                    name="F&B Total"
                    stroke={COLORS.fnb}
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="4 2"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Pie chart — distribution */}
            <div className="bg-surface border border-border rounded-fp-md shadow-fp-pop p-3 sm:p-4 flex flex-col">
              <h3 className="text-xs sm:text-sm font-semibold text-fg mb-3">
                {t('charts.breakdownByGroup')}
              </h3>
              {pieData.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-xs text-fg-muted">
                  Sin datos
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {/* Donut sin labels externas — solo tooltip */}
                  <div className="relative">
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={48}
                          outerRadius={72}
                          dataKey="value"
                          nameKey="name"
                          strokeWidth={2}
                          stroke="var(--fp-surface)"
                        >
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v: number, name: string) => [fmt(v), name]}
                          contentStyle={{
                            fontSize: 11,
                            borderRadius: 6,
                            border: '1px solid var(--fp-border)',
                            background: 'var(--fp-surface-elevated)',
                            color: 'var(--fp-fg)',
                          }}
                          itemStyle={{ color: 'var(--fp-fg)' }}
                          labelStyle={{ color: 'var(--fp-fg)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Centro: total */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[9px] text-fg-muted font-medium uppercase tracking-wide">
                        Total
                      </span>
                      <span className="text-xs font-bold text-fg tabular-nums">{fmt(totFnb)}</span>
                    </div>
                  </div>
                  {/* Leyenda custom — una fila por categoría */}
                  <div className="space-y-1.5">
                    {pieData.map((entry, i) => {
                      const pct = totFnb > 0 ? (entry.value / totFnb) * 100 : 0
                      return (
                        <div key={entry.name} className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                            style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                          />
                          <span className="flex-1 text-xs text-fg truncate">{entry.name}</span>
                          <span className="text-[10px] text-fg-muted tabular-nums">
                            {pct.toFixed(1)}%
                          </span>
                          <span className="text-xs font-medium text-fg tabular-nums w-20 text-right">
                            {fmt(entry.value)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stacked bar chart */}
          <div className="bg-surface border border-border rounded-fp-md shadow-fp-pop p-3 sm:p-4">
            <h3 className="text-xs sm:text-sm font-semibold text-fg mb-3">
              {t('charts.monthlyComparison')}
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={barData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--fp-border)" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--fp-fg-muted)' }} />
                <YAxis
                  tickFormatter={(v) => fmtShort(v)}
                  tick={{ fontSize: 10, fill: 'var(--fp-fg-muted)' }}
                  width={60}
                />
                <Tooltip
                  formatter={(v: number) => fmt(v)}
                  labelFormatter={(l) => `Día ${l}`}
                  contentStyle={{
                    fontSize: 11,
                    borderRadius: 6,
                    border: '1px solid var(--fp-border)',
                    background: 'var(--fp-surface-elevated)',
                    color: 'var(--fp-fg)',
                  }}
                />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  dataKey="breakfast"
                  name={t('groups.breakfast')}
                  fill={COLORS.breakfast}
                  stackId="a"
                  radius={[0, 0, 0, 0]}
                />
                <Bar dataKey="lunch" name={t('groups.lunch')} fill={COLORS.lunch} stackId="a" />
                <Bar
                  dataKey="dinner"
                  name={t('groups.dinner')}
                  fill={COLORS.dinner}
                  stackId="a"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Detailed table — Desktop */}
          <div className="hidden md:block bg-surface border border-border rounded-fp-md shadow-fp-pop overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-hover">
                    <th className="sticky left-0 z-10 bg-surface-hover px-3 py-2.5 text-left font-semibold text-fg-muted whitespace-nowrap">
                      {t('table.day')}
                    </th>
                    <th className="px-3 py-2.5 text-right font-semibold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                      {t('table.breakfastIncluded')}
                    </th>
                    <th className="px-3 py-2.5 text-right font-semibold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                      {t('table.breakfastExcluded')}
                    </th>
                    <th className="px-3 py-2.5 text-right font-semibold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                      {t('table.breakfastDirecto')}
                    </th>
                    <th className="px-3 py-2.5 text-right font-semibold text-amber-700 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-900/10 whitespace-nowrap">
                      {t('table.breakfastTotal')}
                    </th>
                    <th className="px-3 py-2.5 text-right font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      {t('table.lunchFood')}
                    </th>
                    <th className="px-3 py-2.5 text-right font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      {t('table.lunchBev')}
                    </th>
                    <th className="px-3 py-2.5 text-right font-semibold text-violet-600 dark:text-violet-400 whitespace-nowrap">
                      {t('table.dinnerFood')}
                    </th>
                    <th className="px-3 py-2.5 text-right font-semibold text-violet-600 dark:text-violet-400 whitespace-nowrap">
                      {t('table.dinnerBev')}
                    </th>
                    <th className="px-3 py-2.5 text-right font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10 whitespace-nowrap">
                      {t('table.laCasetaTotal')}
                    </th>
                    <th className="px-3 py-2.5 text-right font-bold text-fg bg-fg/5 whitespace-nowrap">
                      {t('table.fnbTotal')}
                    </th>
                    <th className="px-3 py-2.5 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row, i) => {
                    const d = new Date(row.date + 'T12:00:00Z')
                    const dayNum = String(d.getUTCDate()).padStart(2, '0')
                    const dayAbbr = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][d.getUTCDay()]
                    return (
                      <tr
                        key={row.date}
                        className={`hover:bg-surface-hover transition-colors ${i % 2 === 0 ? '' : 'bg-surface/50'}`}
                      >
                        <td className="sticky left-0 z-10 bg-inherit px-3 py-2 font-medium text-fg whitespace-nowrap">
                          <span>{dayNum}</span>
                          <span className="ml-1 text-fg-muted text-[10px]">{dayAbbr}</span>
                        </td>
                        <td className="px-3 py-2 text-right text-fg-muted tabular-nums">
                          {fmt(row.breakfast_included)}
                        </td>
                        <td className="px-3 py-2 text-right text-fg-muted tabular-nums">
                          {fmt(row.breakfast_excluded)}
                        </td>
                        <td className="px-3 py-2 text-right text-fg-muted tabular-nums">
                          {fmt(row.breakfast_directo)}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-amber-700 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-900/10 tabular-nums">
                          {fmt(row.breakfast_total)}
                        </td>
                        <td className="px-3 py-2 text-right text-fg-muted tabular-nums">
                          {fmt(row.lunch_food)}
                        </td>
                        <td className="px-3 py-2 text-right text-fg-muted tabular-nums">
                          {fmt(row.lunch_bev)}
                        </td>
                        <td className="px-3 py-2 text-right text-fg-muted tabular-nums">
                          {fmt(row.dinner_food)}
                        </td>
                        <td className="px-3 py-2 text-right text-fg-muted tabular-nums">
                          {fmt(row.dinner_bev)}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10 tabular-nums">
                          {fmt(row.la_caseta_total)}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-fg bg-fg/5 tabular-nums">
                          {fmt(row.fnb_total)}
                        </td>
                        <td className="px-2 py-2">
                          <button
                            onClick={() =>
                              setModal({
                                date: row.date,
                                values: {
                                  '21110': row.breakfast_included,
                                  '21124': row.breakfast_excluded,
                                  '21120': row.breakfast_directo,
                                  '21111': row.lunch_food,
                                  '21267': row.lunch_bev,
                                  '21112': row.dinner_food,
                                  '21307': row.dinner_bev,
                                },
                              })
                            }
                            className="p-1 rounded hover:bg-surface-hover text-fg-muted hover:text-accent transition-colors"
                            title="Editar"
                          >
                            <FiEdit2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                {/* Totals footer */}
                <tfoot>
                  <tr className="border-t-2 border-border bg-surface-hover font-bold">
                    <td className="sticky left-0 z-10 bg-surface-hover px-3 py-2.5 text-fg text-xs uppercase tracking-wide">
                      TOTAL
                    </td>
                    <td className="px-3 py-2.5 text-right text-amber-700 dark:text-amber-300 tabular-nums">
                      {fmt(rows.reduce((s, r) => s + r.breakfast_included, 0))}
                    </td>
                    <td className="px-3 py-2.5 text-right text-amber-700 dark:text-amber-300 tabular-nums">
                      {fmt(rows.reduce((s, r) => s + r.breakfast_excluded, 0))}
                    </td>
                    <td className="px-3 py-2.5 text-right text-amber-700 dark:text-amber-300 tabular-nums">
                      {fmt(rows.reduce((s, r) => s + r.breakfast_directo, 0))}
                    </td>
                    <td className="px-3 py-2.5 text-right text-amber-800 dark:text-amber-200 bg-amber-50/50 dark:bg-amber-900/10 tabular-nums">
                      {fmt(totBreakfast)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-blue-700 dark:text-blue-300 tabular-nums">
                      {fmt(rows.reduce((s, r) => s + r.lunch_food, 0))}
                    </td>
                    <td className="px-3 py-2.5 text-right text-blue-700 dark:text-blue-300 tabular-nums">
                      {fmt(rows.reduce((s, r) => s + r.lunch_bev, 0))}
                    </td>
                    <td className="px-3 py-2.5 text-right text-violet-700 dark:text-violet-300 tabular-nums">
                      {fmt(rows.reduce((s, r) => s + r.dinner_food, 0))}
                    </td>
                    <td className="px-3 py-2.5 text-right text-violet-700 dark:text-violet-300 tabular-nums">
                      {fmt(rows.reduce((s, r) => s + r.dinner_bev, 0))}
                    </td>
                    <td className="px-3 py-2.5 text-right text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-900/10 tabular-nums">
                      {fmt(totCaseta)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-fg bg-fg/5 tabular-nums">
                      {fmt(totFnb)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Detailed table — Mobile cards */}
          <div className="md:hidden space-y-2">
            {rows.map((row) => {
              const d = new Date(row.date + 'T12:00:00Z')
              const dayNum = String(d.getUTCDate()).padStart(2, '0')
              const dayAbbr = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][d.getUTCDay()]
              return (
                <div
                  key={row.date}
                  className="bg-surface border border-border rounded-fp-md shadow-fp-pop overflow-hidden"
                >
                  {/* Card header: day + edit button */}
                  <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface-hover">
                    <span className="text-sm font-semibold text-fg tabular-nums">
                      {dayNum}
                      <span className="ml-1.5 text-[11px] font-normal text-fg-muted">
                        {dayAbbr}
                      </span>
                    </span>
                    <button
                      onClick={() =>
                        setModal({
                          date: row.date,
                          values: {
                            '21110': row.breakfast_included,
                            '21124': row.breakfast_excluded,
                            '21120': row.breakfast_directo,
                            '21111': row.lunch_food,
                            '21267': row.lunch_bev,
                            '21112': row.dinner_food,
                            '21307': row.dinner_bev,
                          },
                        })
                      }
                      className="p-1 rounded hover:bg-surface text-fg-muted hover:text-accent transition-colors"
                      title="Editar"
                    >
                      <FiEdit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Card body: 3 groups in a row */}
                  <div className="grid grid-cols-[1fr_1fr_auto] divide-x divide-border">
                    {/* Desayuno group */}
                    <div className="px-2.5 py-2.5 flex flex-col">
                      <p className="text-[9px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1.5">
                        {t('groups.breakfast')}
                      </p>
                      <div className="space-y-0.5 flex-1">
                        <div className="grid grid-cols-[1fr_auto] gap-x-1.5 items-baseline">
                          <span className="text-[10px] text-fg-muted truncate">
                            {t('table.breakfastIncluded')}
                          </span>
                          <span className="text-[10px] tabular-nums text-fg text-right">
                            {fmt(row.breakfast_included)}
                          </span>
                        </div>
                        <div className="grid grid-cols-[1fr_auto] gap-x-1.5 items-baseline">
                          <span className="text-[10px] text-fg-muted truncate">
                            {t('table.breakfastExcluded')}
                          </span>
                          <span className="text-[10px] tabular-nums text-fg text-right">
                            {fmt(row.breakfast_excluded)}
                          </span>
                        </div>
                        <div className="grid grid-cols-[1fr_auto] gap-x-1.5 items-baseline">
                          <span className="text-[10px] text-fg-muted truncate">
                            {t('table.breakfastDirecto')}
                          </span>
                          <span className="text-[10px] tabular-nums text-fg text-right">
                            {fmt(row.breakfast_directo)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-1.5 pt-1.5 border-t border-amber-200/60 dark:border-amber-700/30 grid grid-cols-[1fr_auto] gap-x-1.5 items-baseline">
                        <span className="text-[9px] font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                          Total
                        </span>
                        <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 tabular-nums text-right">
                          {fmt(row.breakfast_total)}
                        </span>
                      </div>
                    </div>

                    {/* La Caseta group */}
                    <div className="px-2.5 py-2.5 flex flex-col">
                      <p className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-1.5">
                        {t('groups.laCaseta')}
                      </p>
                      <div className="space-y-0.5 flex-1">
                        <div className="grid grid-cols-[1fr_auto] gap-x-1.5 items-baseline">
                          <span className="text-[10px] text-fg-muted truncate">
                            {t('table.lunchFood')}
                          </span>
                          <span className="text-[10px] tabular-nums text-fg text-right">
                            {fmt(row.lunch_food)}
                          </span>
                        </div>
                        <div className="grid grid-cols-[1fr_auto] gap-x-1.5 items-baseline">
                          <span className="text-[10px] text-fg-muted truncate">
                            {t('table.lunchBev')}
                          </span>
                          <span className="text-[10px] tabular-nums text-fg text-right">
                            {fmt(row.lunch_bev)}
                          </span>
                        </div>
                        <div className="grid grid-cols-[1fr_auto] gap-x-1.5 items-baseline">
                          <span className="text-[10px] text-fg-muted truncate">
                            {t('table.dinnerFood')}
                          </span>
                          <span className="text-[10px] tabular-nums text-fg text-right">
                            {fmt(row.dinner_food)}
                          </span>
                        </div>
                        <div className="grid grid-cols-[1fr_auto] gap-x-1.5 items-baseline">
                          <span className="text-[10px] text-fg-muted truncate">
                            {t('table.dinnerBev')}
                          </span>
                          <span className="text-[10px] tabular-nums text-fg text-right">
                            {fmt(row.dinner_bev)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-1.5 pt-1.5 border-t border-emerald-200/60 dark:border-emerald-700/30 grid grid-cols-[1fr_auto] gap-x-1.5 items-baseline">
                        <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                          Total
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums text-right">
                          {fmt(row.la_caseta_total)}
                        </span>
                      </div>
                    </div>

                    {/* F&B Total — columna compacta */}
                    <div className="w-16 flex flex-col items-center justify-center gap-1 bg-fg/[0.03] dark:bg-fg/[0.05] px-2 py-2.5">
                      <p className="text-[8px] font-semibold text-fg-muted uppercase tracking-wide leading-none">
                        F&B
                      </p>
                      <span className="text-[11px] font-bold text-fg tabular-nums leading-none text-center">
                        {fmt(row.fnb_total)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Mobile totals card */}
            <div className="bg-surface border-2 border-border rounded-fp-md overflow-hidden">
              <div className="px-3 py-2 bg-surface-hover border-b border-border">
                <span className="text-xs font-bold text-fg uppercase tracking-wide">
                  Total del mes
                </span>
              </div>
              <div className="grid grid-cols-[1fr_1fr_auto] divide-x divide-border">
                <div className="px-2.5 py-2.5 text-center">
                  <p className="text-[9px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1">
                    {t('groups.breakfast')}
                  </p>
                  <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 tabular-nums">
                    {fmt(totBreakfast)}
                  </span>
                </div>
                <div className="px-2.5 py-2.5 text-center">
                  <p className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-1">
                    {t('groups.laCaseta')}
                  </p>
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {fmt(totCaseta)}
                  </span>
                </div>
                <div className="w-16 flex flex-col items-center justify-center gap-1 bg-fg/[0.03] dark:bg-fg/[0.05] px-2 py-2.5">
                  <p className="text-[8px] font-semibold text-fg-muted uppercase tracking-wide leading-none">
                    F&B
                  </p>
                  <span className="text-[11px] font-bold text-fg tabular-nums leading-none text-center">
                    {fmt(totFnb)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Manual entry modal */}
      {modal && (
        <ManualEntryModal
          initialDate={modal.date}
          initialValues={modal.values}
          onClose={() => setModal(null)}
          onSave={(payload) => doManual(payload)}
          lookupDate={lookupDate}
          isSaving={savingManual}
        />
      )}
    </div>
  )
}
