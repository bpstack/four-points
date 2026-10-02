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
  // The folder prefix is what matters. Ids stored before names were sanitised
  // keep the original file name (spaces, accents), so they are allowed
  return (
    typeof publicId === 'string' &&
    publicId.startsWith(`${folder}/`) &&
    !publicId.endsWith('/') &&
    !publicId.includes('//') &&
    !publicId.split('/').includes('..') &&
    !/[\u0000-\u001f\\]/.test(publicId)
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

/**
 * File name part of a new public_id: no extension, only letters, digits,
 * "_" and "-", at most 50 characters. The original name could carry "/"
 * (a nested folder), spaces or any other character into the id.
 */
export function safePublicName(filename: string): string {
  const name = filename
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 50)
  return name || 'file'
}
