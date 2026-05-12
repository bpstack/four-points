// tests/auth/token-service.test.ts
// Regression tests for tokenService — pure functions, no DB.
// Used as the safety net before Sprint 1 touches auth flows.

import { describe, it, expect, beforeAll } from 'vitest'
import jwt from 'jsonwebtoken'

// Ensure SECRET_JWT_KEY exists before importing config-bound modules.
beforeAll(() => {
  if (!process.env.SECRET_JWT_KEY) {
    process.env.SECRET_JWT_KEY = 'test-secret-key-for-vitest-only-not-prod'
  }
})

// Import after env setup so config.ts reads the test secret.
const { generateAccessToken, generateRefreshToken, verifyToken } = await import(
  '../../services/auth/tokenService.js'
)

const VALID_USER = { id: 'user-uuid-1', username: 'alice', role: 'admin' }

describe('tokenService — happy path', () => {
  it('generateAccessToken returns a verifiable JWT carrying id/username/role', () => {
    const token = generateAccessToken(VALID_USER)
    const decoded = verifyToken(token)
    expect(decoded.id).toBe(VALID_USER.id)
    expect(decoded.username).toBe(VALID_USER.username)
    expect(decoded.role).toBe(VALID_USER.role)
  })

  it('access token expires in 15 minutes', () => {
    const token = generateAccessToken(VALID_USER)
    const decoded = jwt.decode(token) as { exp: number; iat: number }
    expect(decoded.exp - decoded.iat).toBe(15 * 60)
  })

  it('refresh token expires in 7 days', () => {
    const token = generateRefreshToken(VALID_USER)
    const decoded = jwt.decode(token) as { exp: number; iat: number }
    expect(decoded.exp - decoded.iat).toBe(7 * 24 * 60 * 60)
  })

  it('refresh token payload matches access token payload', () => {
    const access = verifyToken(generateAccessToken(VALID_USER))
    const refresh = verifyToken(generateRefreshToken(VALID_USER))
    expect(refresh.id).toBe(access.id)
    expect(refresh.username).toBe(access.username)
    expect(refresh.role).toBe(access.role)
  })
})

describe('tokenService — error cases', () => {
  it('rejects user without id when generating access token', () => {
    // @ts-expect-error testing invalid input
    expect(() => generateAccessToken({ username: 'x' })).toThrow(/inválido/i)
  })

  it('rejects user without id when generating refresh token', () => {
    // @ts-expect-error testing invalid input
    expect(() => generateRefreshToken({ username: 'x' })).toThrow(/inválido/i)
  })

  it('verifyToken throws "Token inválido" on garbage input', () => {
    expect(() => verifyToken('not.a.jwt')).toThrow(/inválido/i)
  })

  it('verifyToken throws "Token inválido" on token signed with wrong secret', () => {
    const foreign = jwt.sign({ id: 'x' }, 'a-different-secret', { expiresIn: '1h' })
    expect(() => verifyToken(foreign)).toThrow(/inválido/i)
  })

  it('verifyToken throws "Token expirado" on an already-expired token', () => {
    const expired = jwt.sign({ id: 'x' }, process.env.SECRET_JWT_KEY!, { expiresIn: -10 })
    expect(() => verifyToken(expired)).toThrow(/expirado/i)
  })
})
