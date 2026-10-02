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

// Cloudinary folders each module uploads to (services/blacklist/cloudinary-service.ts)
export const CLOUDINARY_FOLDERS = {
  blacklist: 'blacklist',
  invoices: 'backoffice/invoices',
} as const

/**
 * True when `publicId` names a file inside `folder`. Public ids reach the
 * delete calls from the client or from stored rows the client wrote, so
 * without this a request could destroy any file of the cloud.
 */
export function isPublicIdInFolder(publicId: unknown, folder: string): publicId is string {
  return (
    typeof publicId === 'string' &&
    publicId.startsWith(`${folder}/`) &&
    /^[A-Za-z0-9_\-/]+$/.test(publicId) &&
    !publicId.includes('//') &&
    !publicId.endsWith('/')
  )
}

/** True for a URL of our cloud whose file sits in `folder` (e.g. blacklist). */
export function isOwnCloudinaryFileIn(
  value: unknown,
  folder: string,
  cloudName: string | undefined = process.env.CLOUDINARY_CLOUD_NAME
): boolean {
  return (
    isOwnCloudinaryUrl(value, cloudName) &&
    new URL(value as string).pathname.includes(`/${folder}/`)
  )
}
