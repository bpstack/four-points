/**
 * Script 02: ALTER scheduling_months
 * - Eliminar FK fk_sched_month_generated_by
 * - Eliminar columnas: generated_at, generated_by
 * - Cambiar ENUM status: ('draft','generated','published','archived') → ('draft','published')
 */
import pool from '../../../config/db.js'

async function main() {
  console.log('=== SCRIPT 02: ALTER scheduling_months ===\n')

  const conn = await pool.getConnection()

  try {
    // Paso 1: Verificar estado actual
    console.log('--- Estado ANTES ---')
    const [colsBefore] = await conn.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = 'hotel_db' AND TABLE_NAME = 'scheduling_months'
      ORDER BY ORDINAL_POSITION
    `)
    for (const col of colsBefore as any[]) {
      console.log(`  ${col.COLUMN_NAME}: ${col.COLUMN_TYPE}`)
    }

    // Paso 2: Eliminar FK de generated_by
    console.log('\n1. Eliminando FK fk_sched_month_generated_by...')
    try {
      await conn.query('ALTER TABLE scheduling_months DROP FOREIGN KEY fk_sched_month_generated_by')
      console.log('   ✅ FK eliminada')
    } catch (err: any) {
      if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        console.log('   ⚠️  FK ya no existe, continuando...')
      } else {
        throw err
      }
    }

    // Paso 3: Eliminar columnas generated_at y generated_by
    console.log('2. Eliminando columnas generated_at, generated_by...')
    try {
      await conn.query('ALTER TABLE scheduling_months DROP COLUMN generated_at, DROP COLUMN generated_by')
      console.log('   ✅ Columnas eliminadas')
    } catch (err: any) {
      if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        console.log('   ⚠️  Columnas ya no existen, continuando...')
      } else {
        throw err
      }
    }

    // Paso 4: Cambiar ENUM de status
    console.log('3. Cambiando ENUM status → (draft, published)...')
    await conn.query(`
      ALTER TABLE scheduling_months
      MODIFY COLUMN status ENUM('draft', 'published')
        COLLATE utf8mb4_0900_ai_ci
        NOT NULL DEFAULT 'draft'
        COMMENT 'Estado del planning: draft (en edición), published (publicado)'
    `)
    console.log('   ✅ ENUM actualizado')

    // Verificación final
    console.log('\n--- Estado DESPUÉS ---')
    const [colsAfter] = await conn.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = 'hotel_db' AND TABLE_NAME = 'scheduling_months'
      ORDER BY ORDINAL_POSITION
    `)
    for (const col of colsAfter as any[]) {
      console.log(`  ${col.COLUMN_NAME}: ${col.COLUMN_TYPE}`)
    }

    // Verificar FKs restantes
    console.log('\n--- FKs restantes ---')
    const [fks] = await conn.query(`
      SELECT CONSTRAINT_NAME
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = 'hotel_db'
        AND TABLE_NAME = 'scheduling_months'
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    `)
    for (const fk of fks as any[]) {
      console.log(`  ${fk.CONSTRAINT_NAME}`)
    }

    console.log('\n✅ Script 02 completado')
  } catch (err) {
    console.error('❌ Error:', err)
    process.exit(1)
  } finally {
    conn.release()
    await pool.end()
  }
}

main()
