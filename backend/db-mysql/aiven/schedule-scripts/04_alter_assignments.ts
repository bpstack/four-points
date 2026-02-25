/**
 * Script 04: ALTER scheduling_assignments
 * - Eliminar índice idx_is_manual
 * - Eliminar columna is_manual
 */
import pool from '../../../config/db.js'

async function main() {
  console.log('=== SCRIPT 04: ALTER scheduling_assignments ===\n')

  const conn = await pool.getConnection()

  try {
    // Estado antes
    console.log('--- Columnas ANTES ---')
    const [colsBefore] = await conn.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = 'hotel_db' AND TABLE_NAME = 'scheduling_assignments'
      ORDER BY ORDINAL_POSITION
    `)
    for (const col of colsBefore as any[]) {
      console.log(`  ${col.COLUMN_NAME}: ${col.COLUMN_TYPE}`)
    }

    // Paso 1: Eliminar índice
    console.log('\n1. Eliminando índice idx_is_manual...')
    try {
      await conn.query('ALTER TABLE scheduling_assignments DROP INDEX idx_is_manual')
      console.log('   ✅ Índice eliminado')
    } catch (err: any) {
      if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        console.log('   ⚠️  Índice ya no existe, continuando...')
      } else {
        throw err
      }
    }

    // Paso 2: Eliminar columna
    console.log('2. Eliminando columna is_manual...')
    try {
      await conn.query('ALTER TABLE scheduling_assignments DROP COLUMN is_manual')
      console.log('   ✅ Columna eliminada')
    } catch (err: any) {
      if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        console.log('   ⚠️  Columna ya no existe, continuando...')
      } else {
        throw err
      }
    }

    // Estado después
    console.log('\n--- Columnas DESPUÉS ---')
    const [colsAfter] = await conn.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = 'hotel_db' AND TABLE_NAME = 'scheduling_assignments'
      ORDER BY ORDINAL_POSITION
    `)
    for (const col of colsAfter as any[]) {
      console.log(`  ${col.COLUMN_NAME}: ${col.COLUMN_TYPE}`)
    }

    console.log('\n✅ Script 04 completado')
  } catch (err) {
    console.error('❌ Error:', err)
    process.exit(1)
  } finally {
    conn.release()
    await pool.end()
  }
}

main()
