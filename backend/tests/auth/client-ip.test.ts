// tests/auth/client-ip.test.ts
// `trust proxy 3` relies on Render's chain (client -> Cloudflare -> LB 10.x ->
// local proxy). If the chain changed, req.ip could become a value sent by the
// client and the login limits could be dodged. clientIpKey keeps req.ip while
// the chain has the expected shape and fails closed otherwise.

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { Request } from 'express'
import {
  clientIpKey,
  isCloudflareIp,
  isExpectedProxyChain,
  isPrivateIp,
} from '../../config/client-ip.js'

function req(remote: string, xff: string | undefined, ip: string): Request {
  return {
    ip,
    socket: { remoteAddress: remote },
    headers: xff === undefined ? {} : { 'x-forwarded-for': xff },
  } as unknown as Request
}

describe('ranges', () => {
  it('classifies Cloudflare and private addresses', () => {
    expect(isCloudflareIp('104.23.1.2')).toBe(true)
    expect(isCloudflareIp('2606:4700::1')).toBe(true)
    expect(isCloudflareIp('203.0.113.7')).toBe(false)
    expect(isPrivateIp('10.204.3.9')).toBe(true)
    expect(isPrivateIp('::1')).toBe(true)
    expect(isPrivateIp('::ffff:127.0.0.1')).toBe(true)
    expect(isPrivateIp('203.0.113.7')).toBe(false)
  })
})

describe('clientIpKey in production', () => {
  const env = process.env.NODE_ENV
  beforeAll(() => {
    process.env.NODE_ENV = 'production'
  })
  afterAll(() => {
    process.env.NODE_ENV = env
  })

  it('uses req.ip for the expected chain', () => {
    const r = req('::1', '198.51.100.20, 104.23.1.2, 10.204.3.9', '198.51.100.20')
    expect(isExpectedProxyChain(r)).toBe(true)
    expect(clientIpKey(r)).toBe('198.51.100.20')
  })

  it('a spoofed left entry does not change the expected-chain result', () => {
    const r = req(
      '::1',
      '1.2.3.4, 198.51.100.20, 104.23.1.2, 10.204.3.9',
      '198.51.100.20' // trust proxy 3 still picks the third from the right
    )
    expect(clientIpKey(r)).toBe('198.51.100.20')
  })

  it('fails closed when a hop disappears: keys on the nearest public hop', () => {
    // Render without Cloudflare: req.ip would now be the client-sent 1.2.3.4
    const r = req('::1', '1.2.3.4, 198.51.100.20, 10.204.3.9', '1.2.3.4')
    expect(isExpectedProxyChain(r)).toBe(false)
    expect(clientIpKey(r)).toBe('198.51.100.20')
  })

  it('fails closed with no forwarded header at all', () => {
    const r = req('203.0.113.9', undefined, '203.0.113.9')
    expect(clientIpKey(r)).toBe('203.0.113.9')
  })
})

describe('clientIpKey outside production', () => {
  it('keeps req.ip (local dev has no proxy chain)', () => {
    expect(clientIpKey(req('::1', undefined, '::1'))).toBe('::1')
  })
})
