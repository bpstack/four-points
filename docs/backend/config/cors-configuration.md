# 🔒 CORS Configuration

**Archivo:** `backend/index.ts`

---

## Configuración de Orígenes

```typescript
const allowedOrigins = [
  'http://localhost:3000',      // PC desarrollo
  'http://127.0.0.1:3000',      // Alternativa localhost
  process.env.FRONTEND_URL_NETWORK,    // Móvil en red local
  process.env.FRONTEND_URL_PRODUCTION, // Producción
].filter(Boolean)
```

---

## Middleware CORS

```typescript
app.use(
  cors({
    origin: function (origin, callback) {
      // Permitir requests sin origin (Postman, apps móviles)
      if (!origin) return callback(null, true)

      if (allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        console.log('❌ CORS bloqueado para:', origin)
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,  // ← CRÍTICO para cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie'],
  }),
)
```

---

## ⚠️ Puntos Críticos

1. **credentials: true** - Obligatorio para autenticación por sesiones
2. **allowedHeaders** - Incluir 'Cookie' y 'Authorization'
3. **exposedHeaders** - Permitir acceso a 'Set-Cookie' desde JS
4. **Origen dinámico** - MySQL Workbench y apps móviles no envían origin

---

## Acceso desde Móvil

Asegurar que la IP de red esté en `allowedOrigins`:

```env
FRONTEND_URL_NETWORK=http://192.168.1.34:3000
```

