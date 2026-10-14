// services/cron/cron-schedule.ts
// When each scheduled job is due, in Madrid wall time. Render's free plan puts
// the backend to sleep, so node-cron misses its times: on start the backend
// asks every job for its due period and runs the ones not done yet
// (cron_job_runs). A job only catches up its current period, never older ones.

const TIMEZONE = 'Europe/Madrid'

export const CRON_JOBS = [
  'notifications',
  'checklist-reset',
  'checklist-purge',
  'batch-payment',
] as const
export type CronJob = (typeof CRON_JOBS)[number]

// node-cron expression of each job, in Europe/Madrid
export const CRON_EXPRESSIONS: Record<CronJob, string> = {
  notifications: '0 7 * * *',
  'checklist-reset': '30 6 * * *',
  'checklist-purge': '0 4 * * 1',
  'batch-payment': '59 23 10 * *',
}

interface MadridTime {
  year: number
  month: number // 1-12
  day: number
  weekday: number // 0 = Monday … 6 = Sunday
  minutes: number // since midnight
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const formatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIMEZONE,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  weekday: 'short',
  hour: 'numeric',
  minute: 'numeric',
  hourCycle: 'h23',
})

export function madridTime(now: Date): MadridTime {
  const parts = Object.fromEntries(formatter.formatToParts(now).map((p) => [p.type, p.value]))
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    weekday: WEEKDAYS.indexOf(parts.weekday),
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  }
}

const pad = (n: number) => String(n).padStart(2, '0')

// Calendar date `daysBack` days before y-m-d, as YYYY-MM-DD (UTC arithmetic: no DST)
function dateBefore(year: number, month: number, day: number, daysBack: number): string {
  const d = new Date(Date.UTC(year, month - 1, day - daysBack))
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

const at = (hour: number, minute: number) => hour * 60 + minute

/**
 * The period a job is due for at `now`, or null when its time has not come yet
 * in the current period. Daily jobs: YYYY-MM-DD. The weekly purge: the date of
 * its Monday. A missed day or week is covered by the next run.
 *
 * The batch payment (YYYY-MM) is never null: before day 10 at 23:59 it is still
 * due for the previous month's period, so a month the backend slept through
 * from the 10th to its end is paid on the next start instead of skipped.
 */
export function duePeriod(job: CronJob, now: Date): string | null {
  const t = madridTime(now)
  const today = `${t.year}-${pad(t.month)}-${pad(t.day)}`

  switch (job) {
    case 'notifications':
      return t.minutes >= at(7, 0) ? today : null
    case 'checklist-reset':
      return t.minutes >= at(6, 30) ? today : null
    case 'checklist-purge':
      if (t.weekday === 0 && t.minutes < at(4, 0)) return null
      return dateBefore(t.year, t.month, t.day, t.weekday)
    case 'batch-payment': {
      if (t.day > 10 || (t.day === 10 && t.minutes >= at(23, 59))) {
        return `${t.year}-${pad(t.month)}`
      }
      const previous = previousMonth(t.year, t.month)
      return `${previous.year}-${pad(previous.month)}`
    }
  }
}

function previousMonth(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
}

// The batch payment of period YYYY-MM pays the invoices of the month before it
export function batchPaymentTarget(period: string): { year: number; month: number } {
  const [year, month] = period.split('-').map(Number)
  return previousMonth(year, month)
}
