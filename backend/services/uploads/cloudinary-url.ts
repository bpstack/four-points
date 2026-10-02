// services/uploads/cloudinary-url.ts

/**
 * True when `value` is an https URL on res.cloudinary.com inside our own
 * cloud (CLOUDINARY_CLOUD_NAME). The backend downloads stored PDF URLs and
 * returns their bytes, so any other host would let a client make the server
 * fetch internal or arbitrary addresses (SSRF).
 */
export function isOwnCloudinaryUrl(
  value: unknown,
  cloudName: string | undefined = process.env.CLOUDINARY_CLOUD_NAME
): boolean {
  if (typeof value !== 'string' || !cloudName) return false
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }
  return (
    url.protocol === 'https:' &&
    url.hostname === 'res.cloudinary.com' &&
    url.port === '' &&
    url.username === '' &&
    url.password === '' &&
    url.pathname.startsWith(`/${cloudName}/`)
  )
}
