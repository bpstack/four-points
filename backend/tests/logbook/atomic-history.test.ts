// tests/logbook/atomic-history.test.ts
// Regression tests: logbook had no transaction, so a failure between a change
// and its history row left changes without audit, or history for a delete
// that did not happen (the delete wrote its history first). Each change and
// its history now commit or roll back together through withTransaction.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

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
    query: vi.fn(),
    execute: vi.fn(),
  },
}))

const { withTransaction, dbx } = await import('../../config/transaction.js')
const { default: db } = await import('../../config/db.js')

describe('withTransaction', () => {
  beforeEach(() => vi.clearAllMocks())

  it('runs on one connection and commits', async () => {
    const seen = await withTransaction(async () => dbx())
    expect(seen).toBe(connection)
    expect(connection.beginTransaction).toHaveBeenCalledOnce()
    expect(connection.commit).toHaveBeenCalledOnce()
    expect(connection.rollback).not.toHaveBeenCalled()
    expect(connection.release).toHaveBeenCalledOnce()
  })

  it('rolls back and rethrows when the work fails', async () => {
    await expect(
      withTransaction(async () => {
        throw new Error('history insert failed')
      })
    ).rejects.toThrow('history insert failed')
    expect(connection.rollback).toHaveBeenCalledOnce()
    expect(connection.commit).not.toHaveBeenCalled()
    expect(connection.release).toHaveBeenCalledOnce()
  })

  it('joins an outer transaction instead of opening another', async () => {
    await withTransaction(() => withTransaction(async () => dbx()))
    expect(db.getConnection).toHaveBeenCalledOnce()
    expect(connection.commit).toHaveBeenCalledOnce()
  })

  it('outside a transaction dbx is the pool', () => {
    expect(dbx()).toBe(db)
  })
})

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = (...p: string[]) => readFileSync(join(root, ...p), 'utf8')

describe('logbook uses it', () => {
  it('every logbook repository queries through dbx()', () => {
    for (const file of [
      'logbook-repository.ts',
      'logbookComments-repository.ts',
      'logbookCommentsHistory-repository.ts',
      'logbookHistory-repository.ts',
      'logbookReads-repository.ts',
    ]) {
      const source = read('repositories', 'logbook', file)
      expect(source, file).not.toMatch(/\bdb\.(query|execute)\b/)
    }
  })

  it('create, update and delete of entries and comments run in a transaction', () => {
    const logbook = read('controllers', 'logbook', 'logbook-controllers.ts')
    const comments = read('controllers', 'logbook', 'logbookComments-controllers.ts')
    const service = read('services', 'logbook', 'logbookHistory-service.ts')
    expect(logbook.match(/await withTransaction\(/g)?.length).toBe(2)
    expect(comments.match(/await withTransaction\(/g)?.length).toBe(3)
    expect(service).toContain('return withTransaction(() => updateWithHistory(')
  })

  it('the delete writes its history after the soft delete succeeds', () => {
    const logbook = read('controllers', 'logbook', 'logbook-controllers.ts')
    const start = logbook.indexOf('export async function deleteLogbookController')
    const body = logbook.slice(start)
    expect(body.indexOf('softDeleteLogbook')).toBeLessThan(body.indexOf('deleteLogbookHistory'))
  })

  it('read, unread, solve and reopen run in a transaction', () => {
    const reads = read('controllers', 'logbook', 'logbookReads-controllers.ts')
    for (const fn of [
      'logBookReadByUser',
      'unmarkLogbookRead',
      'logbookSolvedByUser',
      'markLogbookPending',
    ]) {
      expect(reads, fn).toContain(`await withTransaction(() => ${fn}(`)
    }
  })
})
