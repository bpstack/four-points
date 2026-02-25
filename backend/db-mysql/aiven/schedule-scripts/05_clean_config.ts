/**
 * Script 05: Limpiar scheduling_config
 * - Eliminar: ai_provider, scoring_weight_*, ai_*
 * - Mantener: todas las keys de validación/cobertura/noches/libres/descanso
 */
import pool from '../../../config/db.js'

async function main() {
  console.log('=== SCRIPT 05: LIMPIAR scheduling_config ===\n')

  const conn = await pool.getConnection()

  try {
    // Estado antes
    console.log('--- Config ANTES ---')
    const [before] = await conn.query('SELECT config_key, config_value FROM scheduling_config ORDER BY id')
    for (const row of before as any[]) {
      console.log(`  ${row.config_key} = ${row.config_value}`)
    }

    // Eliminar keys de IA
    console.log('\n1. Eliminando ai_provider...')
    const [r1] = await conn.query("DELETE FROM scheduling_config WHERE config_key = 'ai_provider'") as any
    console.log(`   ${r1.affectedRows > 0 ? '✅' : '⚠️  No existía'} (${r1.affectedRows} filas)`)

    // Eliminar keys de scoring
    console.log('2. Eliminando scoring_weight_*...')
    const [r2] = await conn.query("DELETE FROM scheduling_config WHERE config_key LIKE 'scoring_weight_%'") as any
    console.log(`   ${r2.affectedRows > 0 ? '✅' : '⚠️  No existían'} (${r2.affectedRows} filas)`)

    // Eliminar cualquier otra config de IA
    console.log('3. Eliminando ai_*...')
    const [r3] = await conn.query("DELETE FROM scheduling_config WHERE config_key LIKE 'ai_%'") as any
    console.log(`   ${r3.affectedRows > 0 ? '✅' : '⚠️  No existían'} (${r3.affectedRows} filas)`)

    // Estado después
    console.log('\n--- Config DESPUÉS ---')
    const [after] = await conn.query('SELECT config_key, config_value FROM scheduling_config ORDER BY id')
    for (const row of after as any[]) {
      console.log(`  ${row.config_key} = ${row.config_value}`)
    }
    console.log(`  Total: ${(after as any[]).length} keys`)

    console.log('\n✅ Script 05 completado')
  } catch (err) {
    console.error('❌ Error:', err)
    process.exit(1)
  } finally {
    conn.release()
    await pool.end()
  }
}

main()
