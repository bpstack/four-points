import dotenv from 'dotenv'
dotenv.config() // Esto carga el archivo .env en process.env
import mysql from 'mysql2/promise'

async function testConnection() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  })

  const [rows] = await connection.execute('SELECT NOW() as now')
  console.log('Conexión OK, hora del servidor:', rows[0].now)
  await connection.end()
}

testConnection().catch(console.error)
