/**
 * Script 01: Limpiar datos transaccionales de scheduling
 * Vacía: history, assignments, constraints, days, months
 * PRESERVA: config, shifts, employees, contracts, rules
 */
import pool from '../../../config/db.js'

async function main() {
  console.log('=== SCRIPT 01: LIMPIAR DATOS TRANSACCIONALES ===\n')

  const conn = await pool.getConnection()

  try {
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

    // Verificación
    console.log('\n--- Verificación ---')
    for (const table of tables) {
      const [rows] = await conn.query(`SELECT COUNT(*) as count FROM ${table}`)
      const count = (rows as any[])[0].count
      console.log(`  ${table}: ${count} registros ${count === 0 ? '✅' : '❌'}`)
    }

    console.log('\n✅ Script 01 completado')
  } catch (err) {
    console.error('❌ Error:', err)
    process.exit(1)
  } finally {
    conn.release()
    await pool.end()
  }
}

main()
