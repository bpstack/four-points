// next.config.ts
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./app/i18n/request.ts')

const isDev = process.env.NODE_ENV === 'development'
const apiOrigin = new URL(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').origin
const gaEnabled = !!process.env.NEXT_PUBLIC_GA_ID
// Vercel injects its feedback toolbar (vercel.live) into preview deployments
const vercelPreview = process.env.VERCEL_ENV === 'preview'

// Static CSP, without nonces: a nonce needs every page rendered per request.
// Next's own inline scripts need 'unsafe-inline'; what this blocks is any
// script, connection, frame or form towards an origin not listed here.
const csp = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'",
    ...(isDev ? ["'unsafe-eval'"] : []),
    ...(gaEnabled ? ['https://www.googletagmanager.com'] : []),
    ...(vercelPreview ? ['https://vercel.live'] : []),
  ],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': [
    "'self'",
    'blob:',
    'data:',
    apiOrigin,
    'https://res.cloudinary.com',
    'https://images.unsplash.com',
    ...(gaEnabled ? ['https://*.google-analytics.com', 'https://*.googletagmanager.com'] : []),
    ...(vercelPreview ? ['https://vercel.com'] : []),
  ],
  'font-src': ["'self'", ...(vercelPreview ? ['https://vercel.live'] : [])],
  'connect-src': [
    "'self'",
    apiOrigin,
    ...(gaEnabled
      ? [
          'https://*.google-analytics.com',
          'https://*.analytics.google.com',
          'https://*.googletagmanager.com',
        ]
      : []),
    ...(vercelPreview ? ['https://vercel.live', 'wss://ws-us3.pusher.com'] : []),
  ],
  // PDF viewer: blob: iframe; PDF.js worker: bundled file
  'frame-src': ["'self'", 'blob:', ...(vercelPreview ? ['https://vercel.live'] : [])],
  'worker-src': ["'self'", 'blob:'],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
}

const contentSecurityPolicy = [
  ...Object.entries(csp).map(([directive, sources]) => `${directive} ${sources.join(' ')}`),
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // The checklist loader picks its folder at runtime: trace both
  outputFileTracingIncludes: {
    '/**': ['./content/checklist/**/*', './content-private/checklist/**/*'],
  },
  experimental: {
    optimizePackageImports: ['react-icons'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
}

export default withNextIntl(nextConfig)
