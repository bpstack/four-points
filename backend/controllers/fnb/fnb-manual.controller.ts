import type { Request, Response } from 'express'
import { z } from 'zod'
import * as repo from '../../repositories/fnb/fnb.repository.js'
import { trackedCodesSet, loadCategories } from '../../services/fnb/fnb-categories.cache.js'

const bodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  values: z.record(z.string(), z.number()),
})

export async function manualEntry(req: Request, res: Response) {
  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() })
    return
  }

  const validCodes = await trackedCodesSet()
  const { date, values } = parsed.data
  const entries = Object.entries(values)
    .filter(([code]) => validCodes.has(code))
    .map(([code, amount]) => ({ code, amount: Number(amount) }))

  if (!entries.length) {
    res.status(400).json({ error: 'No valid category codes provided' })
    return
  }

  await repo.upsertMany(date, entries)

  const categories = await loadCategories()
  const catMap = Object.fromEntries(categories.map(c => [c.code, c]))

  res.json({
    date,
    updated: entries.map(e => ({ code: e.code, name: catMap[e.code]?.name ?? e.code, amount: e.amount })),
    totals: repo.computeTotals(entries),
  })
}
