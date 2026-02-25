/**
 * Script 06: Verificación completa del esquema final
 * Ejecutar después de scripts 01-05 para validar que todo es correcto.
 * Comprueba: columnas huérfanas, ENUMs, FKs, índices, config, datos.
 */
import pool from '../../../config/db.js'

let errors = 0
let checks = 0

function check(label: string, condition: boolean) {
  checks++
  if (condition) {
    console.log(`  ✅ ${label}`)
  } else {
    errors++
    console.log(`  ❌ ${label}`)
  }
}

async function main() {
  console.log('=== SCRIPT 06: VERIFICACIÓN COMPLETA ===\n')

  const conn = await pool.getConnection()

  try {
    // =============================================
    // 1. COLUMNAS HUÉRFANAS
    // =============================================
    console.log('--- 1. Columnas huérfanas ---')

    // scheduling_months: NO debe tener generated_at, generated_by
    const [monthCols] = await conn.query(`
      SELECT COLUMN_NAME FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = 'hotel_db' AND TABLE_NAME = 'scheduling_months'
    `)
    const monthColNames = (monthCols as any[]).map(c => c.COLUMN_NAME)
    check('scheduling_months: generated_at eliminada', !monthColNames.includes('generated_at'))
    check('scheduling_months: generated_by eliminada', !monthColNames.includes('generated_by'))

    // scheduling_assignments: NO debe tener is_manual
    const [assignCols] = await conn.query(`
      SELECT COLUMN_NAME FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = 'hotel_db' AND TABLE_NAME = 'scheduling_assignments'
    `)
    const assignColNames = (assignCols as any[]).map(c => c.COLUMN_NAME)
    check('scheduling_assignments: is_manual eliminada', !assignColNames.includes('is_manual'))

    // =============================================
    // 2. ENUMs CORRECTOS
    // =============================================
    console.log('\n--- 2. ENUMs ---')

    // scheduling_months.status
    const [monthStatus] = await conn.query(`
      SELECT COLUMN_TYPE FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = 'hotel_db' AND TABLE_NAME = 'scheduling_months' AND COLUMN_NAME = 'status'
    `)
    const statusEnum = (monthStatus as any[])[0].COLUMN_TYPE
    check(`scheduling_months.status = ${statusEnum}`,
      statusEnum === "enum('draft','published')")

    // scheduling_history.action
    const [histAction] = await conn.query(`
      SELECT COLUMN_TYPE FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = 'hotel_db' AND TABLE_NAME = 'scheduling_history' AND COLUMN_NAME = 'action'
    `)
    const actionEnum = (histAction as any[])[0].COLUMN_TYPE
    check('scheduling_history.action: NO contiene generated',
      !actionEnum.includes('generated'))
    check('scheduling_history.action: contiene reset',
      actionEnum.includes('reset'))

    // =============================================
    // 3. FOREIGN KEYS
    // =============================================
    console.log('\n--- 3. Foreign Keys ---')

    // scheduling_months: NO debe tener fk_sched_month_generated_by
    const [monthFks] = await conn.query(`
      SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = 'hotel_db' AND TABLE_NAME = 'scheduling_months' AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    `)
    const monthFkNames = (monthFks as any[]).map(f => f.CONSTRAINT_NAME)
    check('scheduling_months: FK generated_by eliminada',
      !monthFkNames.includes('fk_sched_month_generated_by'))
    check('scheduling_months: FK published_by existe',
      monthFkNames.includes('fk_sched_month_published_by'))
    check('scheduling_months: FK created_by existe',
      monthFkNames.includes('fk_sched_month_created_by'))

    // =============================================
    // 4. ÍNDICES
    // =============================================
    console.log('\n--- 4. Índices ---')

    const [assignIdx] = await conn.query(`
      SELECT DISTINCT INDEX_NAME FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = 'hotel_db' AND TABLE_NAME = 'scheduling_assignments'
    `)
    const assignIdxNames = (assignIdx as any[]).map(i => i.INDEX_NAME)
    check('scheduling_assignments: idx_is_manual eliminado',
      !assignIdxNames.includes('idx_is_manual'))

    // =============================================
    // 5. CONFIG
    // =============================================
    console.log('\n--- 5. scheduling_config ---')

    const [configRows] = await conn.query('SELECT config_key FROM scheduling_config')
    const configKeys = (configRows as any[]).map(r => r.config_key)
    check('config: ai_provider eliminada', !configKeys.includes('ai_provider'))
    check('config: sin scoring_weight_*',
      !configKeys.some((k: string) => k.startsWith('scoring_weight_')))
    check('config: sin ai_*',
      !configKeys.some((k: string) => k.startsWith('ai_')))

    // Keys que SÍ deben existir
    const requiredKeys = [
      'min_morning_staff', 'max_morning_staff',
      'min_afternoon_staff', 'max_afternoon_staff',
      'min_night_staff', 'max_night_staff',
      'min_night_block', 'max_night_block',
      'min_monthly_libre', 'max_monthly_libre',
      'max_consecutive_work_days', 'min_consecutive_libre',
      'min_rest_hours',
    ]
    for (const key of requiredKeys) {
      check(`config: ${key} existe`, configKeys.includes(key))
    }

    // =============================================
    // 6. DATOS TRANSACCIONALES VACÍOS
    // =============================================
    console.log('\n--- 6. Datos transaccionales vacíos ---')

    const transTables = ['scheduling_months', 'scheduling_days', 'scheduling_assignments', 'scheduling_constraints', 'scheduling_history']
    for (const table of transTables) {
      const [rows] = await conn.query(`SELECT COUNT(*) as count FROM ${table}`)
      const count = (rows as any[])[0].count
      check(`${table}: ${count} registros (vacía)`, count === 0)
    }

    // =============================================
    // 7. DATOS DE REFERENCIA INTACTOS
    // =============================================
    console.log('\n--- 7. Datos de referencia ---')

    const [shifts] = await conn.query('SELECT COUNT(*) as count FROM scheduling_shifts')
    check(`scheduling_shifts: ${(shifts as any[])[0].count} turnos`, (shifts as any[])[0].count > 0)

    const [config] = await conn.query('SELECT COUNT(*) as count FROM scheduling_config')
    check(`scheduling_config: ${(config as any[])[0].count} keys`, (config as any[])[0].count > 0)

    // =============================================
    // RESULTADO FINAL
    // =============================================
    console.log('\n========================================')
    console.log(`  Checks: ${checks - errors}/${checks} pasados`)
    if (errors === 0) {
      console.log('  ✅ VERIFICACIÓN COMPLETA: TODO CORRECTO')
    } else {
      console.log(`  ❌ VERIFICACIÓN FALLIDA: ${errors} errores`)
    }
    console.log('========================================\n')

    process.exit(errors > 0 ? 1 : 0)
  } catch (err) {
    console.error('❌ Error:', err)
    process.exit(1)
  } finally {
    conn.release()
    await pool.end()
  }
}

main()
