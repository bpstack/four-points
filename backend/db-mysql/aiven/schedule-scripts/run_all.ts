/**
 * Script maestro: ejecuta todas las migraciones en orden
 * Uso: npx tsx db-mysql/aiven/schedule-scripts/run_all.ts
 *
 * Ejecuta secuencialmente:
 *   01_clean_data.ts    → Vaciar tablas transaccionales
 *   02_alter_months.ts  → ALTER scheduling_months
 *   03_alter_history.ts → ALTER scheduling_history
 *   04_alter_assignments.ts → ALTER scheduling_assignments
 *   07_add_source_constraint_id.ts → ADD source_constraint_id a scheduling_assignments
 *   05_clean_config.ts  → Limpiar config (ai, scoring)
 *   06_verify_all.ts    → Verificación completa
 */
import pool from '../../../config/db.js'

async function runStep(label: string, fn: (conn: any) => Promise<void>) {
  const conn = await pool.getConnection()
  try {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`  ${label}`)
    console.log('='.repeat(60))
    await fn(conn)
  } finally {
    conn.release()
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗')
  console.log('║  MIGRACIÓN SCHEDULING: Generación auto → Manual        ║')
  console.log('╚══════════════════════════════════════════════════════════╝')

  try {
    // ==========================================
    // 01: LIMPIAR DATOS TRANSACCIONALES
    // ==========================================
    await runStep('01: LIMPIAR DATOS TRANSACCIONALES', async (conn) => {
      await conn.query('SET FOREIGN_KEY_CHECKS = 0')
      const tables = [
        'scheduling_history',
        'scheduling_assignments',
        'scheduling_constraints',
        'scheduling_days',
        'scheduling_months',
      ]
      for (const table of tables) {
        await conn.query(`TRUNCATE TABLE ${table}`)
        console.log(`  TRUNCATED: ${table}`)
      }
      await conn.query('SET FOREIGN_KEY_CHECKS = 1')
    })

    // ==========================================
    // 02: ALTER scheduling_months
    // ==========================================
    await runStep('02: ALTER scheduling_months', async (conn) => {
      // Eliminar FK
      try {
        await conn.query(
          'ALTER TABLE scheduling_months DROP FOREIGN KEY fk_sched_month_generated_by'
        )
        console.log('  FK fk_sched_month_generated_by eliminada ✅')
      } catch (err: any) {
        if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
          console.log('  FK ya no existe ⚠️')
        } else throw err
      }

      // Eliminar columnas
      try {
        await conn.query(
          'ALTER TABLE scheduling_months DROP COLUMN generated_at, DROP COLUMN generated_by'
        )
        console.log('  Columnas generated_at, generated_by eliminadas ✅')
      } catch (err: any) {
        if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
          console.log('  Columnas ya no existen ⚠️')
        } else throw err
      }

      // Cambiar ENUM
      await conn.query(`
        ALTER TABLE scheduling_months
        MODIFY COLUMN status ENUM('draft', 'published')
          COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'draft'
          COMMENT 'Estado del planning: draft (en edición), published (publicado)'
      `)
      console.log('  ENUM status → (draft, published) ✅')
    })

    // ==========================================
    // 03: ALTER scheduling_history
    // ==========================================
    await runStep('03: ALTER scheduling_history', async (conn) => {
      await conn.query(`
        ALTER TABLE scheduling_history
        MODIFY COLUMN action ENUM(
          'created', 'published', 'unpublished', 'assignment_changed',
          'constraint_added', 'constraint_approved', 'constraint_rejected',
          'manual_edit', 'reset'
        ) COLLATE utf8mb4_0900_ai_ci NOT NULL
          COMMENT 'Tipo de acción realizada'
      `)
      console.log('  ENUM action actualizado (sin generated, con reset) ✅')
    })

    // ==========================================
    // 04: ALTER scheduling_assignments
    // ==========================================
    await runStep('04: ALTER scheduling_assignments', async (conn) => {
      // Eliminar índice
      try {
        await conn.query('ALTER TABLE scheduling_assignments DROP INDEX idx_is_manual')
        console.log('  Índice idx_is_manual eliminado ✅')
      } catch (err: any) {
        if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
          console.log('  Índice ya no existe ⚠️')
        } else throw err
      }

      // Eliminar columna
      try {
        await conn.query('ALTER TABLE scheduling_assignments DROP COLUMN is_manual')
        console.log('  Columna is_manual eliminada ✅')
      } catch (err: any) {
        if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
          console.log('  Columna ya no existe ⚠️')
        } else throw err
      }
    })

    // ==========================================
    // 07: ADD source_constraint_id
    // ==========================================
    await runStep('07: ADD source_constraint_id to scheduling_assignments', async (conn) => {
      // Añadir columna
      try {
        await conn.query(
          "ALTER TABLE scheduling_assignments ADD COLUMN source_constraint_id INT NULL COMMENT 'Constraint origen (si la celda está precargada/bloqueada)' AFTER shift_code"
        )
        console.log('  Columna source_constraint_id añadida ✅')
      } catch (err: any) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log('  Columna ya existe ⚠️')
        } else throw err
      }

      // Añadir índice
      try {
        await conn.query(
          'ALTER TABLE scheduling_assignments ADD INDEX idx_source_constraint_id (source_constraint_id)'
        )
        console.log('  Índice idx_source_constraint_id añadido ✅')
      } catch (err: any) {
        if (err.code === 'ER_DUP_KEYNAME') {
          console.log('  Índice ya existe ⚠️')
        } else throw err
      }

      // Añadir FK
      try {
        await conn.query(`
          ALTER TABLE scheduling_assignments
          ADD CONSTRAINT fk_sched_assign_source_constraint
          FOREIGN KEY (source_constraint_id)
          REFERENCES scheduling_constraints (id)
          ON DELETE SET NULL
          ON UPDATE CASCADE
        `)
        console.log('  FK fk_sched_assign_source_constraint añadida ✅')
      } catch (err: any) {
        if (err.code === 'ER_FK_DUP_NAME') {
          console.log('  FK ya existe ⚠️')
        } else throw err
      }
    })

    // ==========================================
    // 05: LIMPIAR CONFIG
    // ==========================================
    await runStep('05: LIMPIAR scheduling_config', async (conn) => {
      const [r1] = (await conn.query(
        "DELETE FROM scheduling_config WHERE config_key = 'ai_provider'"
      )) as any
      console.log(`  ai_provider: ${r1.affectedRows} eliminadas`)

      const [r2] = (await conn.query(
        "DELETE FROM scheduling_config WHERE config_key LIKE 'scoring_weight_%'"
      )) as any
      console.log(`  scoring_weight_*: ${r2.affectedRows} eliminadas`)

      const [r3] = (await conn.query(
        "DELETE FROM scheduling_config WHERE config_key LIKE 'ai_%'"
      )) as any
      console.log(`  ai_*: ${r3.affectedRows} eliminadas`)

      const [remaining] = await conn.query(
        'SELECT config_key, config_value FROM scheduling_config ORDER BY id'
      )
      console.log(`\n  Config restante (${(remaining as any[]).length} keys):`)
      for (const row of remaining as any[]) {
        console.log(`    ${row.config_key} = ${row.config_value}`)
      }
    })

    // ==========================================
    // 06: VERIFICACIÓN COMPLETA
    // ==========================================
    let errors = 0
    let checks = 0
    const check = (label: string, ok: boolean) => {
      checks++
      if (!ok) errors++
      console.log(`  ${ok ? '✅' : '❌'} ${label}`)
    }

    await runStep('06: VERIFICACIÓN COMPLETA', async (conn) => {
      // Columnas huérfanas
      console.log('\n  [Columnas]')
      const [mCols] = await conn.query(`
        SELECT COLUMN_NAME FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = 'hotel_db' AND TABLE_NAME = 'scheduling_months'
      `)
      const mColNames = (mCols as any[]).map((c: any) => c.COLUMN_NAME)
      check('months: generated_at eliminada', !mColNames.includes('generated_at'))
      check('months: generated_by eliminada', !mColNames.includes('generated_by'))

      const [aCols] = await conn.query(`
        SELECT COLUMN_NAME FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = 'hotel_db' AND TABLE_NAME = 'scheduling_assignments'
      `)
      const aColNames = (aCols as any[]).map((c: any) => c.COLUMN_NAME)
      check('assignments: is_manual eliminada', !aColNames.includes('is_manual'))
      check('assignments: source_constraint_id existe', aColNames.includes('source_constraint_id'))

      // ENUMs
      console.log('\n  [ENUMs]')
      const [mStatus] = await conn.query(`
        SELECT COLUMN_TYPE FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = 'hotel_db' AND TABLE_NAME = 'scheduling_months' AND COLUMN_NAME = 'status'
      `)
      check(
        `months.status = ${(mStatus as any[])[0].COLUMN_TYPE}`,
        (mStatus as any[])[0].COLUMN_TYPE === "enum('draft','published')"
      )

      const [hAction] = await conn.query(`
        SELECT COLUMN_TYPE FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = 'hotel_db' AND TABLE_NAME = 'scheduling_history' AND COLUMN_NAME = 'action'
      `)
      const actionType = (hAction as any[])[0].COLUMN_TYPE
      check('history.action: sin generated', !actionType.includes("'generated'"))
      check('history.action: con reset', actionType.includes("'reset'"))

      // FKs
      console.log('\n  [Foreign Keys]')
      const [mFks] = await conn.query(`
        SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = 'hotel_db' AND TABLE_NAME = 'scheduling_months' AND CONSTRAINT_TYPE = 'FOREIGN KEY'
      `)
      const fkNames = (mFks as any[]).map((f: any) => f.CONSTRAINT_NAME)
      check('months: FK generated_by eliminada', !fkNames.includes('fk_sched_month_generated_by'))
      check('months: FK published_by existe', fkNames.includes('fk_sched_month_published_by'))
      check('months: FK created_by existe', fkNames.includes('fk_sched_month_created_by'))

      // Índices
      console.log('\n  [Índices]')
      const [aIdx] = await conn.query(`
        SELECT DISTINCT INDEX_NAME FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = 'hotel_db' AND TABLE_NAME = 'scheduling_assignments'
      `)
      check(
        'assignments: idx_is_manual eliminado',
        !(aIdx as any[]).map((i: any) => i.INDEX_NAME).includes('idx_is_manual')
      )
      check(
        'assignments: idx_source_constraint_id existe',
        (aIdx as any[]).map((i: any) => i.INDEX_NAME).includes('idx_source_constraint_id')
      )

      // Config
      console.log('\n  [Config]')
      const [cfgRows] = await conn.query('SELECT config_key FROM scheduling_config')
      const keys = (cfgRows as any[]).map((r: any) => r.config_key)
      check('config: sin ai_provider', !keys.includes('ai_provider'))
      check(
        'config: sin scoring_weight_*',
        !keys.some((k: string) => k.startsWith('scoring_weight_'))
      )
      check('config: min_morning_staff existe', keys.includes('min_morning_staff'))
      check('config: max_consecutive_work_days existe', keys.includes('max_consecutive_work_days'))

      // Tablas vacías
      console.log('\n  [Datos transaccionales]')
      for (const t of [
        'scheduling_months',
        'scheduling_days',
        'scheduling_assignments',
        'scheduling_constraints',
        'scheduling_history',
      ]) {
        const [r] = await conn.query(`SELECT COUNT(*) as c FROM ${t}`)
        check(`${t}: vacía`, (r as any[])[0].c === 0)
      }

      // Referencia intacta
      console.log('\n  [Datos referencia]')
      const [shifts] = await conn.query('SELECT COUNT(*) as c FROM scheduling_shifts')
      check(`scheduling_shifts: ${(shifts as any[])[0].c} turnos`, (shifts as any[])[0].c > 0)
    })

    // ==========================================
    // RESULTADO FINAL
    // ==========================================
    console.log('\n' + '═'.repeat(60))
    console.log(`  Checks: ${checks - errors}/${checks} pasados`)
    if (errors === 0) {
      console.log('  ✅ MIGRACIÓN COMPLETA: TODO CORRECTO')
    } else {
      console.log(`  ❌ MIGRACIÓN CON ERRORES: ${errors} fallos`)
    }
    console.log('═'.repeat(60) + '\n')

    await pool.end()
    process.exit(errors > 0 ? 1 : 0)
  } catch (err) {
    console.error('\n❌ ERROR FATAL:', err)
    await pool.end()
    process.exit(1)
  }
}

main()
