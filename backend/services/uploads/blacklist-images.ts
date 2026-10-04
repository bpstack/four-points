// services/uploads/blacklist-images.ts
// A blacklist entry keeps its photos as a list in the row. They used to be
// Cloudinary URLs; now they are API paths, /api/blacklist/images/<file>, where
// <file> is the Cloudinary file name (`blacklist_<time>_<name>.<ext>`). The
// endpoint builds the signed URL on the server, so the photo is private and
// the signature never reaches the browser.

import { CLOUDINARY_FOLDERS, isOwnCloudinaryFileIn } from './cloudinary-url.js'

const FOLDER = CLOUDINARY_FOLDERS.blacklist
export const BLACKLIST_IMAGE_PREFIX = '/api/blacklist/images/'

// blacklist_1759...-name.jpg: what uploadImage names files in this folder
const FILE_PATTERN = /^blacklist_\d+_[A-Za-z0-9_-]{1,50}\.(jpg|jpeg|png|webp|gif)$/

export function isBlacklistImageFile(file: string): boolean {
  return FILE_PATTERN.test(file)
}

export function blacklistImagePath(publicId: string, format: string): string {
  const name = publicId.split('/').pop() || publicId
  return `${BLACKLIST_IMAGE_PREFIX}${name}.${format}`
}

export function isBlacklistImagePath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.startsWith(BLACKLIST_IMAGE_PREFIX) &&
    isBlacklistImageFile(value.slice(BLACKLIST_IMAGE_PREFIX.length))
  )
}

/**
 * A stored image as the API path. Rows written before 2026-10-04 hold the
 * Cloudinary URL of the file: same file name, so it maps to the same path
 */
export function toBlacklistImagePath(stored: string): string | null {
  if (isBlacklistImagePath(stored)) return stored
  if (isOwnCloudinaryFileIn(stored, FOLDER)) {
    const file = new URL(stored).pathname.split('/').pop() || ''
    return isBlacklistImageFile(file) ? `${BLACKLIST_IMAGE_PREFIX}${file}` : null
  }
  return null
}

/** Cloudinary public id and format of an image file name */
export function parseBlacklistImageFile(file: string): { publicId: string; format: string } {
  const dot = file.lastIndexOf('.')
  return { publicId: `${FOLDER}/${file.slice(0, dot)}`, format: file.slice(dot + 1) }
}
