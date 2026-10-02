// services/checklist/attachment-response.ts

import type { Attachment } from '../../repositories/checklist/checklist-comments.repository.js'

// public_id stays on the server: it is what deletes the file in Cloudinary,
// and the frontend never needs it
export type PublicAttachment = Omit<Attachment, 'public_id'>

export function withoutPublicId({ public_id: _publicId, ...rest }: Attachment): PublicAttachment {
  return rest
}
