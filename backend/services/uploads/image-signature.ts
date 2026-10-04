// services/uploads/image-signature.ts

// First bytes of each accepted format. The declared mimetype is whatever the
// client says; these are what the file really is
const SIGNATURES: [type: string, matches: (b: Buffer) => boolean][] = [
  ['image/jpeg', (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff],
  [
    'image/png',
    (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  ],
  ['image/gif', (b) => ['GIF87a', 'GIF89a'].includes(b.subarray(0, 6).toString('latin1'))],
  [
    'image/webp',
    (b) =>
      b.subarray(0, 4).toString('latin1') === 'RIFF' &&
      b.subarray(8, 12).toString('latin1') === 'WEBP',
  ],
]

/** The image type the bytes start with (JPG, PNG, GIF or WebP), or null. */
export function detectImageType(buffer: Buffer): string | null {
  return SIGNATURES.find(([, matches]) => matches(buffer))?.[0] ?? null
}

/**
 * True when the bytes are a JPG, PNG, GIF or WebP. The declared type may
 * differ (a PNG saved as .jpg is still a valid image).
 */
export function isImageFile(buffer: Buffer): boolean {
  return detectImageType(buffer) !== null
}
