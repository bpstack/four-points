/**
 * Script 07: ADD source_constraint_id to scheduling_assignments
 * - Añadir columna source_constraint_id para trazabilidad de asignaciones precargadas desde constraints aprobadas
 * - Añadir índice
 * - Añadir FK a scheduling_constraints(id)
 */
import pool from '../../../config/db.js'

async function main() {
  console.log('=== SCRIPT 07: ADD source_constraint_id to scheduling_assignments ===\n')

  const conn = await pool.getConnection()

  try {
    // Estado antes
    console.log('--- Columnas ANTES ---')
    const [colsBefore] = await conn.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = 'hotel_db' AND TABLE_NAME = 'scheduling_assignments'
      ORDER BY ORDINAL_POSITION
    `)
    for (const col of colsBefore as any[]) {
      console.log(`  ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} (NULL=${col.IS_NULLABLE})`)
    }

    // Paso 1: Añadir columna
    console.log('\n1. Añadiendo columna source_constraint_id...')
    try {
      await conn.query(
        "ALTER TABLE scheduling_assignments ADD COLUMN source_constraint_id INT NULL COMMENT 'Constraint origen (si la celda está precargada/bloqueada)' AFTER shift_code"
      )
      console.log('   ✅ Columna añadida')
    } catch (err: any) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('   ⚠️  La columna ya existe, continuando...')
      } else {
        throw err
      }
    }

    // Paso 2: Añadir índice
    console.log('2. Añadiendo índice idx_source_constraint_id...')
    try {
      await conn.query('ALTER TABLE scheduling_assignments ADD INDEX idx_source_constraint_id (source_constraint_id)')
      console.log('   ✅ Índice añadido')
    } catch (err: any) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('   ⚠️  El índice ya existe, continuando...')
      } else {
        throw err
      }
    }

    // Paso 3: Añadir FK
    console.log('3. Añadiendo FK fk_sched_assign_source_constraint...')
    try {
      await conn.query(`
        ALTER TABLE scheduling_assignments
        ADD CONSTRAINT fk_sched_assign_source_constraint
        FOREIGN KEY (source_constraint_id)
        REFERENCES scheduling_constraints (id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
      `)
      console.log('   ✅ FK añadida')
    } catch (err: any) {
      if (err.code === 'ER_FK_DUP_NAME') {
        console.log('   ⚠️  La FK ya existe, continuando...')
      } else if (err.code === 'ER_CANNOT_ADD_FOREIGN') {
        console.log('   ❌ No se pudo crear la FK (verifica que scheduling_constraints existe y que el tipo coincide)')
        throw err
      } else {
        throw err
      }
    }

    // Estado después
    console.log('\n--- Columnas DESPUÉS ---')
    const [colsAfter] = await conn.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = 'hotel_db' AND TABLE_NAME = 'scheduling_assignments'
      ORDER BY ORDINAL_POSITION
    `)
    for (const col of colsAfter as any[]) {
      console.log(`  ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} (NULL=${col.IS_NULLABLE})`)
    }

    console.log('\n✅ Script 07 completado')
  } catch (err) {
    console.error('❌ Error:', err)
    process.exit(1)
  } finally {
    conn.release()
    await pool.end()
  }
}

main()
