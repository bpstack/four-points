# 🗄️ Database Configuration (Local + Aiven)

**Archivo:** `backend/config/db.ts`

---

## Configuración Híbrida

```typescript
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

dotenv.config()

const presets = {
  local: {
    host: process.env.LOCAL_DB_HOST || 'localhost',
    port: parseInt(process.env.LOCAL_DB_PORT) || 3306,
    user: process.env.LOCAL_DB_USER || 'root',
    password: process.env.LOCAL_DB_PASSWORD,
    database: process.env.LOCAL_DB_NAME || 'hotel_db',
  },
  aiven: {
    host: process.env.AIVEN_DB_HOST,
    port: parseInt(process.env.AIVEN_DB_PORT) || 23225,
    user: process.env.AIVEN_DB_USER || 'avnadmin',
    password: process.env.AIVEN_PASSWORD,
    database: process.env.AIVEN_DB_NAME || 'hotel_db',
    ssl: {
      ca: fs.readFileSync(
        path.join(__dirname, 'certs', 'ca-certificate.pem'),
      ),
      rejectUnauthorized: true,
    },
  },
}

const environment = process.env.DB_ENVIRONMENT || 'local'
const config = presets[environment]
```

---

## Pool de Conexiones

```typescript
const pool = mysql.createPool(config)

// Verificación al inicio
pool
  .getConnection()
  .then((connection) => {
    console.log('✅ Conexión MySQL exitosa')
    connection.release()
  })
  .catch((err) => {
    console.error('❌ Error de conexión MySQL:', err.message)
    process.exit(1)
  })

export default pool
```

---

## Diferencias Local vs Aiven

| Aspecto | Local | Aiven |
|---------|-------|-------|
| Puerto | 3306 | 23225 |
| SSL | ❌ No | ✅ Requerido |
| Host | localhost | *.aivencloud.com |
| User | root | avnadmin |

