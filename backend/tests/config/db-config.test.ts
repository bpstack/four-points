// tests/config/db-config.test.ts
// The remote preset was renamed from `aiven` (ADR-048). While the deployed
// services still set the old names, both have to open the same connection:
// a miss here takes production down at startup.

import { describe, it, expect, vi, afterEach } from 'vitest'

const REMOTE = [
  'REMOTE_DB_HOST',
  'REMOTE_DB_PORT',
  'REMOTE_DB_USER',
  'REMOTE_DB_PASSWORD',
  'REMOTE_DB_NAME',
]
const LEGACY = [
  'AIVEN_DB_HOST',
  'AIVEN_DB_PORT',
  'AIVEN_DB_USER',
  'AIVEN_PASSWORD',
  'AIVEN_DB_NAME',
]

// Empty, not deleted: dotenv does not fill a variable that is already set, so
// a developer's backend/.env cannot leak into the test
async function load(env: Record<string, string>) {
  vi.resetModules()
  for (const key of [...REMOTE, ...LEGACY]) vi.stubEnv(key, '')
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value)
  return import('../../config/db-config.js')
}

afterEach(() => vi.unstubAllEnvs())

describe('config/db-config.ts remote preset', () => {
  it('reads REMOTE_DB_* with DB_ENVIRONMENT=remote', async () => {
    const { dbConfig, environment } = await load({
      DB_ENVIRONMENT: 'remote',
      REMOTE_DB_HOST: 'db.example.test',
      REMOTE_DB_PORT: '3306',
      REMOTE_DB_USER: 'app',
      REMOTE_DB_PASSWORD: 'new-secret',
      REMOTE_DB_NAME: 'hotel_db',
    })
    expect(environment).toBe('remote')
    expect(dbConfig).toMatchObject({
      host: 'db.example.test',
      port: 3306,
      user: 'app',
      password: 'new-secret',
      database: 'hotel_db',
    })
    expect(dbConfig.ssl).toBeDefined()
  })

  it('still accepts DB_ENVIRONMENT=aiven and the AIVEN_* names', async () => {
    const { dbConfig, environment } = await load({
      DB_ENVIRONMENT: 'aiven',
      AIVEN_DB_HOST: 'old.example.test',
      AIVEN_DB_PORT: '23225',
      AIVEN_DB_USER: 'old-user',
      AIVEN_PASSWORD: 'old-secret',
    })
    expect(environment).toBe('remote')
    expect(dbConfig).toMatchObject({
      host: 'old.example.test',
      port: 23225,
      user: 'old-user',
      password: 'old-secret',
      database: 'hotel_db',
    })
  })

  it('prefers the new name when both are set', async () => {
    const { dbConfig } = await load({
      DB_ENVIRONMENT: 'aiven',
      AIVEN_DB_HOST: 'old.example.test',
      AIVEN_DB_PORT: '23225',
      AIVEN_DB_USER: 'old-user',
      AIVEN_PASSWORD: 'old-secret',
      REMOTE_DB_HOST: 'db.example.test',
      REMOTE_DB_PASSWORD: 'new-secret',
    })
    expect(dbConfig).toMatchObject({
      host: 'db.example.test',
      port: 23225,
      user: 'old-user',
      password: 'new-secret',
    })
  })

  it('names the new variable when the password is missing', async () => {
    await expect(load({ DB_ENVIRONMENT: 'remote' })).rejects.toThrow('REMOTE_DB_PASSWORD')
  })

  it('rejects an unknown preset', async () => {
    await expect(load({ DB_ENVIRONMENT: 'constructor' })).rejects.toThrow('Entorno no válido')
  })
})
