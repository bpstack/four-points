import type { Request, Response } from 'express'
import { parseOperaPdf } from '../../services/fnb/pdf-parser.service.js'
import { loadCategories } from '../../services/fnb/fnb-categories.cache.js'
import * as repo from '../../repositories/fnb/fnb.repository.js'

export async function uploadPdf(req: Request, res: Response) {
  const file = (req as any).file as Express.Multer.File | undefined
  if (!file?.buffer) {
    res.status(400).json({ error: 'No PDF uploaded' })
    return
  }

  console.log(`[fnb-upload] File received: ${file.originalname} (${file.mimetype}, ${file.size} bytes)`)

  const parsed = await parseOperaPdf(file.buffer)
  console.log(`[fnb-upload] Parsed: date=${parsed.date}, entries=${parsed.entries.length}`)

  if (!parsed.date) {
    res.status(422).json({ error: 'No se pudo extraer la fecha del PDF (filtro "Date DD/MM/YY" no encontrado)' })
    return
  }
  if (!parsed.entries.length) {
    res.status(422).json({ error: 'No se encontraron códigos F&B rastreados en el PDF' })
    return
  }

  const categories = await loadCategories()
  const catMap = Object.fromEntries(categories.map(c => [c.code, c]))

  await repo.upsertMany(parsed.date, parsed.entries)

  res.json({
    date: parsed.date,
    updated: parsed.entries.map(e => ({
      code: e.code,
      name: catMap[e.code]?.name ?? e.code,
      amount: e.amount,
    })),
    totals: repo.computeTotals(parsed.entries),
    grandTotal: parsed.grandTotal,
  })
}
