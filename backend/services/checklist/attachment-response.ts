// services/checklist/attachment-response.ts

import type { Attachment } from '../../repositories/checklist/checklist-comments.repository.js'

// Attachments are private files: the client gets the API path that serves
// them, never the signed Cloudinary URL. public_id stays on the server too:
// it is what deletes the file in Cloudinary, and the frontend never needs it
export type PublicAttachment = Omit<Attachment, 'public_id'>

export function attachmentFilePath(attachmentId: number): string {
  return `/api/checklists/attachments/${attachmentId}/file`
}

export function withoutPublicId({ public_id: _publicId, ...rest }: Attachment): PublicAttachment {
  return { ...rest, file_url: attachmentFilePath(rest.id) } as PublicAttachment
}
