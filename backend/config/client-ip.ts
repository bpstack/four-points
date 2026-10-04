// config/client-ip.ts
// Client IP for rate limits, robust to a change in Render's proxy chain.
//
// index.ts trusts exactly 3 hops (`trust proxy 3`) for the chain seen on
// 2026-09-29: client -> Cloudflare -> Render LB (10.x) -> local proxy (::1).
// If Render removed a hop, req.ip would become whatever the client sent in
// X-Forwarded-For and the login limits could be dodged; if it added one,
// req.ip would be a shared Cloudflare address. Nothing would tell.
//
// clientIpKey uses req.ip only when the chain still has that shape. Otherwise
// it fails closed: it keys on the nearest public hop, which the client cannot
// forge (limits get stricter, never looser), and logs a warning once an hour.

import { BlockList, isIP } from 'node:net'
import type { Request } from 'express'
import { logger } from './logger.js'

// https://www.cloudflare.com/ips-v4 and /ips-v6, fetched 2026-10-04
const CLOUDFLARE_V4 = [
  '173.245.48.0/20',
  '103.21.244.0/22',
  '103.22.200.0/22',
  '103.31.4.0/22',
  '141.101.64.0/18',
  '108.162.192.0/18',
  '190.93.240.0/20',
  '188.114.96.0/20',
  '197.234.240.0/22',
  '198.41.128.0/17',
  '162.158.0.0/15',
  '104.16.0.0/13',
  '104.24.0.0/14',
  '172.64.0.0/13',
  '131.0.72.0/22',
]
const CLOUDFLARE_V6 = [
  '2400:cb00::/32',
  '2606:4700::/32',
  '2803:f800::/32',
  '2405:b500::/32',
  '2405:8100::/32',
  '2a06:98c0::/29',
  '2c0f:f248::/32',
]
const PRIVATE_V4 = ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '127.0.0.0/8']
const PRIVATE_V6 = ['::1/128', 'fc00::/7', 'fe80::/10']

function blockList(v4: string[], v6: string[]): BlockList {
  const list = new BlockList()
  for (const cidr of v4) {
    const [net, prefix] = cidr.split('/')
    list.addSubnet(net, Number(prefix), 'ipv4')
  }
  for (const cidr of v6) {
    const [net, prefix] = cidr.split('/')
    list.addSubnet(net, Number(prefix), 'ipv6')
  }
  return list
}

const cloudflare = blockList(CLOUDFLARE_V4, CLOUDFLARE_V6)
const privateNets = blockList(PRIVATE_V4, PRIVATE_V6)

// IPv4-mapped IPv6 (::ffff:1.2.3.4) as plain IPv4
export function normalizeIp(ip: string): string {
  return ip.startsWith('::ffff:') ? ip.substring(7) : ip
}

function inList(list: BlockList, ip: string): boolean {
  const addr = normalizeIp(ip)
  const family = isIP(addr)
  if (family === 0) return false
  return list.check(addr, family === 4 ? 'ipv4' : 'ipv6')
}

export const isCloudflareIp = (ip: string): boolean => inList(cloudflare, ip)
export const isPrivateIp = (ip: string): boolean => inList(privateNets, ip)

function forwardedFor(req: Request): string[] {
  const header = req.headers['x-forwarded-for']
  const value = Array.isArray(header) ? header.join(',') : header || ''
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

// The shape `trust proxy 3` was set for: the socket is the local proxy, the
// last forwarded hop is Render's private balancer and the one before it is
// Cloudflare
export function isExpectedProxyChain(req: Request): boolean {
  const remote = req.socket?.remoteAddress || ''
  const hops = forwardedFor(req)
  if (!isPrivateIp(remote) || hops.length < 3) return false
  return isPrivateIp(hops[hops.length - 1]) && isCloudflareIp(hops[hops.length - 2])
}

let lastWarning = 0

export function clientIpKey(req: Request): string {
  if (process.env.NODE_ENV !== 'production') {
    return normalizeIp(req.ip || req.socket?.remoteAddress || 'unknown')
  }

  if (isExpectedProxyChain(req)) return normalizeIp(req.ip || 'unknown')

  // Nearest public hop: added by our own proxies, not by the client
  const remote = req.socket?.remoteAddress || ''
  const nearestFirst = [remote, ...forwardedFor(req).reverse()]
  const publicHop = nearestFirst.find((ip) => isIP(normalizeIp(ip)) && !isPrivateIp(ip))

  if (Date.now() - lastWarning > 60 * 60 * 1000) {
    lastWarning = Date.now()
    logger.warn(
      {
        event: 'unexpected_proxy_chain',
        hops: forwardedFor(req).length,
        remotePrivate: isPrivateIp(remote),
      },
      '[SECURITY] proxy chain changed: rate limits keyed on the nearest public hop; review trust proxy in index.ts'
    )
  }

  return normalizeIp(publicHop || remote || 'unknown')
}
