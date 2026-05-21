import type { Request, Response } from 'express'
import * as repo from '../../repositories/fnb/fnb.repository.js'
import { fnbMonthQuerySchema, fnbDateQuerySchema } from '../../validations/fnb/fnb.validations.js'

export async function getMonthly(req: Request, res: Response) {
  const parsed = fnbMonthQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid query', details: parsed.error.flatten() })
    return
  }
  const { year, month } = parsed.data
  const rows = await repo.getMonthlyData(year, month)
  const categories = await repo.getCategories()
  res.json({ year, month, rows, categories })
}

export async function getDaily(req: Request, res: Response) {
  const parsed = fnbDateQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid query' })
    return
  }
  const entries = await repo.getDailyEntries(parsed.data.from, parsed.data.to)
  res.json({ entries })
}

export async function getCategories(_req: Request, res: Response) {
  const categories = await repo.getCategories()
  res.json({ categories })
}

export async function deleteDay(req: Request, res: Response) {
  const { date } = req.params
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'Invalid date format (YYYY-MM-DD)' })
    return
  }
  const deleted = await repo.deleteDay(date)
  res.json({ deleted, date })
}
