// scripts/migrate-private-files.ts
// One-off migration (2026-10-04): files uploaded to Cloudinary before uploads
// became private are `upload` (public). This turns them into `authenticated`,
// purges the CDN copy, and stores the new signed secure_url in the rows that
// point to them, so the API endpoints keep serving them. Avatars stay public.
//
//   DB_ENVIRONMENT=aiven pnpm exec tsx scripts/migrate-private-files.ts           (dry run)
//   DB_ENVIRONMENT=aiven pnpm exec tsx scripts/migrate-private-files.ts --apply
//
// Idempotent: a second run finds nothing left to migrate. Blacklist rows also
// get their stored URLs rewritten to API paths (services/uploads/blacklist-images.ts).

import 'dotenv/config'
import { v2 as cloudinary } from 'cloudinary'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import db from '../config/db.js'
import { toBlacklistImagePath } from '../services/uploads/blacklist-images.js'

const APPLY = process.argv.includes('--apply')
const PRIVATE_FOLDERS = ['backoffice/', 'blacklist/', 'maintenance/', 'checklist/']

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

interface Resource {
  public_id: string
  resource_type: 'image' | 'raw'
}

async function listPublic(resourceType: 'image' | 'raw'): Promise<Resource[]> {
  const out: Resource[] = []
  let next: string | undefined
  do {
    const page = await cloudinary.api.resources({
      resource_type: resourceType,
      type: 'upload',
      max_results: 500,
      next_cursor: next,
    })
    for (const r of page.resources)
      out.push({ public_id: r.public_id, resource_type: resourceType })
    next = page.next_cursor
  } while (next)
  return out
}

// Rows that store the URL of a file, by public id
async function updateRows(r: Resource, secureUrl: string): Promise<number> {
  const updates: Array<[string, string[]]> = []
  if (r.resource_type === 'raw' && r.public_id.startsWith('backoffice/invoices/')) {
    updates.push([
      'UPDATE bo_invoices SET original_pdf_url = ? WHERE original_pdf_public_id = ?',
      [],
    ])
    updates.push([
      'UPDATE bo_invoices SET validated_pdf_url = ? WHERE validated_pdf_public_id = ?',
      [],
    ])
  } else if (r.public_id.startsWith('backoffice/assets/')) {
    updates.push(['UPDATE bo_assets SET cloudinary_url = ? WHERE cloudinary_public_id = ?', []])
  } else if (r.public_id.startsWith('maintenance/')) {
    updates.push(['UPDATE maintenance_images SET file_path = ? WHERE public_id = ?', []])
  } else if (r.public_id.startsWith('checklist/')) {
    updates.push(['UPDATE checklist_step_attachments SET file_url = ? WHERE public_id = ?', []])
  }
  let changed = 0
  for (const [sql] of updates) {
    const [res] = await db.query<ResultSetHeader>(sql, [secureUrl, r.public_id])
    changed += res.affectedRows
  }
  return changed
}

async function main(): Promise<void> {
  console.log(APPLY ? '== APPLY ==' : '== DRY RUN (nothing changes; --apply to migrate) ==')

  const all = [...(await listPublic('image')), ...(await listPublic('raw'))]
  const toMigrate = all.filter((r) => PRIVATE_FOLDERS.some((f) => r.public_id.startsWith(f)))
  const kept = all.filter((r) => !toMigrate.includes(r))

  console.log(`\nPublic files to make private: ${toMigrate.length}`)
  for (const r of toMigrate) console.log(`  ${r.resource_type}  ${r.public_id}`)
  console.log(`\nPublic files left as they are: ${kept.length}`)
  for (const r of kept) console.log(`  ${r.resource_type}  ${r.public_id}`)

  const [blacklistRows] = await db.query<(RowDataPacket & { id: number; images: string })[]>(
    "SELECT id, images FROM blacklist_entries WHERE images IS NOT NULL AND images <> '[]'"
  )
  console.log(`\nBlacklist rows with photos: ${blacklistRows.length}`)

  if (!APPLY) {
    await db.end()
    return
  }

  for (const r of toMigrate) {
    const renamed = await cloudinary.uploader.rename(r.public_id, r.public_id, {
      resource_type: r.resource_type,
      type: 'upload',
      to_type: 'authenticated',
      invalidate: true,
    })
    const rows = await updateRows(r, renamed.secure_url)
    console.log(`  migrated ${r.public_id} (${rows} row(s) updated)`)
  }

  for (const row of blacklistRows) {
    const stored: string[] = typeof row.images === 'string' ? JSON.parse(row.images) : row.images
    const paths = stored.map(toBlacklistImagePath).filter((p): p is string => p !== null)
    await db.query('UPDATE blacklist_entries SET images = ? WHERE id = ?', [
      JSON.stringify(paths),
      row.id,
    ])
    console.log(`  blacklist ${row.id}: ${stored.length} URL(s) -> ${paths.length} path(s)`)
  }

  await db.end()
}

main().catch(async (err) => {
  console.error(err)
  await db.end()
  process.exit(1)
})
