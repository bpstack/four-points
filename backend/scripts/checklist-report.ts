/**
 * checklist-report.ts
 *
 * Muestra las tareas completadas y comentarios de un run de checklist.
 *
 * Uso:
 *   pnpm exec tsx --env-file=.env scripts/checklist-report.ts
 *   pnpm exec tsx --env-file=.env scripts/checklist-report.ts cl-night-audit 2026-05-08
 *   pnpm exec tsx --env-file=.env scripts/checklist-report.ts cl-morning-shift 2026-05-08
 *
 * Parámetros opcionales (posicionales):
 *   1. checklist_id  — ej: cl-night-audit, cl-morning-shift, cl-afternoon-shift (default: cl-night-audit)
 *   2. hotel_date    — formato YYYY-MM-DD (default: hoy)
 */

import db from '../config/db.js';
import { getTodayMadrid } from '../config/date-utils.js';

const CHECKLIST_ID = process.argv[2] ?? 'cl-night-audit';
const HOTEL_DATE   = process.argv[3] ?? getTodayMadrid();

const fmt = (d: any) => d instanceof Date ? d.toISOString().slice(0, 19).replace('T', ' ') : String(d).slice(0, 19);

async function main() {
  // 1. Encontrar el run
  const [runs] = await (db as any).query(
    `SELECT id, checklist_id, hotel_date, started_at
     FROM checklist_runs
     WHERE checklist_id = ? AND DATE(hotel_date) = ? AND reset_at IS NULL
     ORDER BY started_at DESC
     LIMIT 1`,
    [CHECKLIST_ID, HOTEL_DATE]
  );

  if (!runs.length) {
    console.log(`No se encontró ningún run para "${CHECKLIST_ID}" en fecha ${HOTEL_DATE}`);
    process.exit(0);
  }

  const run = runs[0];
  console.log(`\n=== ${run.checklist_id} | ${HOTEL_DATE} (run_id=${run.id}) ===\n`);

  // 2. Tareas completadas
  const [steps] = await (db as any).query(
    `SELECT
       css.step_id,
       css.done,
       css.done_at,
       u.username AS done_by
     FROM checklist_step_state css
     LEFT JOIN users u ON u.id = css.done_by_user_id
     WHERE css.run_id = ?
     ORDER BY css.done DESC, css.done_at`,
    [run.id]
  );

  const done   = steps.filter((s: any) => s.done === 1);
  const pending = steps.filter((s: any) => s.done !== 1);

  console.log(`Completadas (${done.length}):`);
  if (done.length) {
    done.forEach((s: any) =>
      console.log(`  ✓ ${s.step_id.padEnd(12)}  ${fmt(s.done_at)}  por: ${s.done_by ?? '—'}`)
    );
  } else {
    console.log('  (ninguna)');
  }

  console.log(`\nPendientes (${pending.length}):`);
  if (pending.length) {
    pending.forEach((s: any) => console.log(`  · ${s.step_id}`));
  } else {
    console.log('  (ninguna)');
  }

  // 3. Comentarios
  const [comments] = await (db as any).query(
    `SELECT
       csc.step_id,
       csc.body  AS comentario,
       csc.created_at,
       u.username AS autor
     FROM checklist_step_comments csc
     LEFT JOIN users u ON u.id = csc.user_id
     WHERE csc.run_id = ?
     ORDER BY csc.created_at`,
    [run.id]
  );

  console.log(`\nComentarios (${comments.length}):`);
  if (comments.length) {
    comments.forEach((c: any) =>
      console.log(`  [${fmt(c.created_at)}] ${c.step_id} | ${c.autor ?? '—'}: ${c.comentario}`)
    );
  } else {
    console.log('  (ninguno)');
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
