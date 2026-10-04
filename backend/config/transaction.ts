// config/transaction.ts
// Transactions without passing the connection around: withTransaction runs fn
// with a connection stored in AsyncLocalStorage, and repositories that call
// dbx() use that connection while it is active and the pool otherwise.

import { AsyncLocalStorage } from 'node:async_hooks'
import type { Pool } from 'mysql2/promise'
import db from './db.js'

type QueryRunner = Pick<Pool, 'query' | 'execute'>

const storage = new AsyncLocalStorage<QueryRunner>()

// Connection of the active transaction, or the pool
export function dbx(): QueryRunner {
  return storage.getStore() ?? db
}

// Commits when fn resolves, rolls back when it throws. Nested calls join the
// outer transaction
export async function withTransaction<T>(fn: () => Promise<T>): Promise<T> {
  if (storage.getStore()) return fn()

  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()
    const result = await storage.run(connection, fn)
    await connection.commit()
    return result
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}
