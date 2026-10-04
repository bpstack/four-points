// app/lib/helpers/private-file.ts
// Private files (invoice PDFs, stamps, signatures, photos) are served by the
// backend: the API returns a path like /api/backoffice/assets/5/file instead
// of a Cloudinary URL. The session cookie goes with it because the API is on
// the same site.

import { API_BASE_URL } from '@/app/lib/env'

export function privateFileUrl(path: string | null | undefined): string {
  if (!path) return ''
  return path.startsWith('/api/') ? `${API_BASE_URL}${path}` : path
}
