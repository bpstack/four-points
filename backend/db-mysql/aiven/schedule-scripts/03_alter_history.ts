/**
 * Script 03: ALTER scheduling_history
 * - Cambiar ENUM action: quitar 'generated', añadir 'reset'
 */
import pool from '../../../config/db.js'

async function main() {
  console.log('=== SCRIPT 03: ALTER scheduling_history ===\n')

  const conn = await pool.getConnection()

  try {
    // Estado antes
    console.log('--- ENUM action ANTES ---')
    const [before] = await conn.query(`
      SELECT COLUMN_TYPE
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = 'hotel_db'
        AND TABLE_NAME = 'scheduling_history'
        AND COLUMN_NAME = 'action'
    `)
    console.log(`  ${(before as any[])[0].COLUMN_TYPE}`)

    // Cambiar ENUM
    console.log('\n1. Cambiando ENUM action...')
    await conn.query(`
      ALTER TABLE scheduling_history
      MODIFY COLUMN action ENUM(
        'created',
        'published',
        'unpublished',
        'assignment_changed',
        'constraint_added',
        'constraint_approved',
        'constraint_rejected',
        'manual_edit',
        'reset'
      ) COLLATE utf8mb4_0900_ai_ci
        NOT NULL
        COMMENT 'Tipo de acción realizada'
    `)
    console.log('   ✅ ENUM actualizado')

    // Estado después
    console.log('\n--- ENUM action DESPUÉS ---')
    const [after] = await conn.query(`
      SELECT COLUMN_TYPE
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = 'hotel_db'
        AND TABLE_NAME = 'scheduling_history'
        AND COLUMN_NAME = 'action'
    `)
    console.log(`  ${(after as any[])[0].COLUMN_TYPE}`)

    console.log('\n✅ Script 03 completado')
  } catch (err) {
    console.error('❌ Error:', err)
    process.exit(1)
  } finally {
    conn.release()
    await pool.end()
  }
}

main()
