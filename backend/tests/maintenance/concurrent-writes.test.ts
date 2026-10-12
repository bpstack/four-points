// tests/maintenance/concurrent-writes.test.ts
// Regression tests for two races. Two reports created at once read the same
// last id of the day and the second one died with a 500 on the duplicate key;
// it now retries with the next number. Photos were counted before the upload
// to Cloudinary, so uploads in parallel went past the limit of 5; the count is
// now repeated under a lock on the report when the photo is saved.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response } from 'express'
import type { ReportWithDetails } from '../../models/maintenance/index.js'

const connection = {
  beginTransaction: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  release: vi.fn(),
  query: vi.fn(),
  execute: vi.fn(),
}

vi.mock('../../config/db.js', () => ({
  default: {
    getConnection: vi.fn(async () => connection),
    query: vi.fn(async () => [[]]),
    execute: vi.fn(),
  },
}))

vi.mock('../../services/blacklist/cloudinary-service.js', () => ({
  CloudinaryService: {
    uploadImage: vi.fn(async () => ({ secure_url: 'https://x/y.jpg', public_id: 'maint/y' })),
    deleteImage: vi.fn(async () => undefined),
  },
}))

const { MaintenanceRepository, MAX_REPORT_IMAGES } =
  await import('../../repositories/maintenance/maintenance-repository.js')
const { MaintenanceController } =
  await import('../../controllers/maintenance/maintenance-controller.js')
const { CloudinaryService } = await import('../../services/blacklist/cloudinary-service.js')

const duplicate = () => Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY' })

const newReport = {
  title: 'Grifo',
  description: 'Gotea',
  location_type: 'room',
  location_description: 'Baño',
} as Parameters<typeof MaintenanceRepository.create>[0]

const insertedIds = () =>
  connection.query.mock.calls
    .filter(([q]) => /INSERT INTO maintenance_reports/.test(String(q)))
    .map(([, params]) => (params as unknown[])[0])

describe('creating maintenance reports at once', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    connection.query.mockReset()
    vi.restoreAllMocks()
    vi.spyOn(MaintenanceRepository, 'getById').mockResolvedValue({
      id: 'x',
    } as ReportWithDetails)
  })

  it('retries with the next number when another report took the id', async () => {
    connection.query.mockImplementation(async (q: string) => {
      const sql = String(q)
      if (/SELECT id FROM maintenance_reports/.test(sql)) {
        // The second read already sees the report that won the race
        return insertedIds().length === 0 ? [[]] : [[{ id: `${'0'.repeat(6)}-001` }]]
      }
      if (/INSERT INTO maintenance_reports/.test(sql) && insertedIds().length === 1) {
        throw duplicate()
      }
      return [{ affectedRows: 1 }]
    })

    await MaintenanceRepository.create(newReport, 'u1', 'admin')

    const ids = insertedIds().map((id) => String(id).split('-')[1])
    expect(ids).toEqual(['001', '002'])
    // Each attempt is its own transaction, so the retry reads the new last id
    expect(connection.beginTransaction).toHaveBeenCalledTimes(2)
    expect(connection.rollback).toHaveBeenCalledOnce()
    expect(connection.commit).toHaveBeenCalledOnce()
  })

  it('gives up after a few attempts', async () => {
    connection.query.mockImplementation(async (q: string) => {
      if (/INSERT INTO maintenance_reports/.test(String(q))) throw duplicate()
      return [[]]
    })

    await expect(MaintenanceRepository.create(newReport, 'u1', 'admin')).rejects.toThrow(
      'Duplicate entry'
    )
    expect(connection.beginTransaction).toHaveBeenCalledTimes(5)
  })

  it('does not retry other errors', async () => {
    connection.query.mockImplementation(async (q: string) => {
      if (/INSERT INTO maintenance_reports/.test(String(q))) throw new Error('boom')
      return [[]]
    })

    await expect(MaintenanceRepository.create(newReport, 'u1', 'admin')).rejects.toThrow('boom')
    expect(connection.beginTransaction).toHaveBeenCalledOnce()
  })
})

describe('the photo limit holds for uploads in parallel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    connection.query.mockReset()
    vi.restoreAllMocks()
  })

  const image = {
    file_name: 'a.jpg',
    file_path: 'https://x/a.jpg',
    file_size: 10,
    mime_type: 'image/jpeg',
    public_id: 'maint/a',
  }

  it('counts again under a lock on the report and saves nothing when full', async () => {
    connection.query.mockImplementation(async (q: string) => {
      if (/COUNT\(\*\)/.test(String(q))) return [[{ total: MAX_REPORT_IMAGES }]]
      return [[{ id: '121026-001' }]]
    })

    expect(await MaintenanceRepository.addImage('121026-001', image, 'u1')).toBeNull()

    const sql = connection.query.mock.calls.map(([q]) => String(q))
    expect(sql[0]).toMatch(/FROM maintenance_reports WHERE id = \? FOR UPDATE/)
    expect(sql.some((q) => /INSERT INTO maintenance_images/.test(q))).toBe(false)
    expect(connection.commit).toHaveBeenCalledOnce()
  })

  it('saves the photo while there is room', async () => {
    connection.query.mockImplementation(async (q: string) => {
      const sql = String(q)
      if (/COUNT\(\*\)/.test(sql)) return [[{ total: MAX_REPORT_IMAGES - 1 }]]
      if (/INSERT INTO maintenance_images/.test(sql)) return [{ insertId: 9 }]
      if (/FROM maintenance_images WHERE id/.test(sql)) {
        return [[{ id: 9, report_id: '121026-001', uploaded_at: '2026-10-12', ...image }]]
      }
      return [[{ id: '121026-001' }]]
    })

    const saved = await MaintenanceRepository.addImage('121026-001', image, 'u1')
    expect(saved?.id).toBe(9)
  })

  it('the upload that loses the race answers 400 and removes its file from Cloudinary', async () => {
    vi.spyOn(MaintenanceRepository, 'getById').mockResolvedValue({
      id: '121026-001',
      is_deleted: false,
      images: [],
    } as unknown as ReportWithDetails)
    vi.spyOn(MaintenanceRepository, 'addImage').mockResolvedValue(null)

    const res = { status: vi.fn(), json: vi.fn() }
    res.status.mockReturnValue(res)
    const req = {
      user: { id: 'u1' },
      params: { id: '121026-001' },
      file: { buffer: Buffer.from('x'), originalname: 'a.jpg', mimetype: 'image/jpeg', size: 10 },
    }

    await MaintenanceController.uploadImage(req as unknown as Request, res as unknown as Response)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(CloudinaryService.deleteImage).toHaveBeenCalledWith('maint/y')
  })
})
