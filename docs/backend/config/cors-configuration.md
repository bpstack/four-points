# CORS Configuration

**Archivo fuente:** `backend/index.ts` (líneas 56–89)

---

## Orígenes permitidos

```typescript
const allowedOrigins = [
  'http://localhost:3000',                  // desarrollo local
  'https://four-points.stackbp.es',        // producción (custom domain)
  'https://four-points.vercel.app',        // producción (Vercel)
  'https://api.four-points.stackbp.es',   // API domain propio
  'https://four-points.onrender.com',     // backend Render (server-to-server)
  process.env.FRONTEND_URL,               // URL adicional configurable
].filter(Boolean) as string[]

// Todos los preview deployments de Vercel (*.vercel.app)
const vercelPreviewPattern = /\.vercel\.app$/
```

---

## Middleware CORS

```typescript
app.use(
  cors({
    origin: (origin, callback) => {
      // Sin origin → Postman, server-to-server, mobile apps → permitir
      if (!origin) {
        callback(null, true)
        return
      }
      // Lista explícita + patrón Vercel previews
      if (allowedOrigins.includes(origin) || vercelPreviewPattern.test(origin)) {
        callback(null, true)
      } else {
        logger.warn({ origin }, '[CORS] Blocked origin')
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie'],
  })
)
```

---

## Puntos críticos

| Punto | Motivo |
|-------|--------|
| `credentials: true` | Obligatorio para que las cookies HttpOnly viajen cross-origin |
| `allowedHeaders: ['Cookie']` | Permite que el navegador envíe la cookie de sesión |
| `exposedHeaders: ['Set-Cookie']` | Permite que el navegador lea `Set-Cookie` en respuesta |
| `PATCH` en `methods` | Necesario para `PATCH /assignments/:id` (scheduling) |
| Sin origin → permitir | Postman, Render interno, mobile apps no envían `Origin` |

---

## Variable de entorno adicional

```env
# .env
FRONTEND_URL=https://mi-dominio-custom.com   # opcional, para dominios extra
```

---

## Logging de bloqueos

Los orígenes bloqueados se registran con `logger.warn` (Pino), visible en los logs del servidor:

```
[CORS] Blocked origin  origin="https://dominio-no-permitido.com"
```
