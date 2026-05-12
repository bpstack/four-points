# TODO — Four-Points PMS

> **Cómo leer este documento:** lista accionable para la próxima sesión.
> El plan estratégico vive en `Global-Plan.md`. Las decisiones de scheduling en `SCHEDULING-DECISIONS-LOG.md` y `SCHEDULING-CONSTRAINTS.md`.

---

## Estado actual (2026-05-12)

- **Sprint 0** ✅ cerrado — PR #4 (`chore/audit-prep-sprint-0`)
- **Sprint 1** ✅ casi cerrado — PR #5 (auth hardening) + PR #6 (Pino logger)
- **Sprint 2** ⏳ pendiente — refresh token rotation, render.yaml + vercel.json, Cloudflare Access, Sentry

Backend en Render funcionando. Solver Python operativo (ver §"Python solver — estado actual" abajo).

---

## Sprint 2 — Próxima sesión

### Orden recomendado de ataque

1. **H1-13 Sentry** — bloqueado hasta que crees cuenta en sentry.io. Solo trae el DSN y lo cierro en 10 min.
2. **H1-16 render.yaml + vercel.json** — pura config, sin riesgo. Recetas listas en §"Ficheros listos para copiar" abajo.
3. **H1-17 Cloudflare Zero Trust Access** — 100% panel, sin código. Guía paso a paso en §"Guía Cloudflare Zero Trust Access".
4. **H2-1 Refresh token rotation** — el más arriesgado. Tabla `refresh_tokens`, rotación en cada uso, revocación al logout. Merece sesión propia.

### Precondición antes de Sprint 2

Verificar que el merge de Sprint 1 (PR #6) lleva ≥24h estable en producción.

---

## Ficheros listos para copiar

### A) `backend/render.yaml`

```yaml
# Render Blueprint — captura el estado funcional actual.
# Para activar: dashboard Render → servicio → Settings → Connect Blueprint
# Los secretos (sync: false) se gestionan en el panel; el resto vive aquí.

services:
  - type: web
    name: four-points-api
    runtime: node
    rootDir: backend
    buildCommand: pnpm install && pnpm run build
    startCommand: pnpm start
    healthCheckPath: /
    autoDeploy: true

    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: "4000"
      - key: DB_ENVIRONMENT
        value: aiven

      # Auth
      - key: SECRET_JWT_KEY
        sync: false
      - key: SALT_ROUNDS
        value: "10"

      # Aiven MySQL (valores en panel, no se commitean)
      - key: AIVEN_DB_HOST
        sync: false
      - key: AIVEN_DB_PORT
        value: "23225"
      - key: AIVEN_DB_USER
        value: avnadmin
      - key: AIVEN_PASSWORD
        sync: false
      - key: AIVEN_DB_NAME
        value: hotel_db

      # Cloudinary
      - key: CLOUDINARY_CLOUD_NAME
        sync: false
      - key: CLOUDINARY_API_KEY
        sync: false
      - key: CLOUDINARY_API_SECRET
        sync: false

      # Frontend para CORS
      - key: FRONTEND_URL
        value: https://four-points.stackbp.es

      # Observabilidad (Pino)
      - key: LOG_LEVEL
        value: info

      # AI Schedule (si se sigue usando)
      - key: AI_ENABLED
        value: "true"
      - key: CLAUDE_API_KEY
        sync: false
      - key: CLAUDE_MODEL
        value: claude-sonnet-4-20250514
      - key: GEMINI_API_KEY
        sync: false
      - key: GEMINI_MODEL
        value: gemini-2.0-flash

      # Sentry (cuando H1-13 esté listo)
      # - key: SENTRY_DSN
      #   sync: false
```

**⚠ Antes de aplicar:**
- Verificar `region` y `plan` del servicio actual en Render → añadir aquí si difieren del default.
- Confirmar el `startCommand` actual en el panel. Si es distinto a `pnpm start`, ajustar.
- Revisar `autoDeploy`: si tienes deploys manuales, cambiar a `false`.

### B) `frontend/vercel.json`

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "regions": ["cdg1"],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" },
        { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains" }
      ]
    }
  ]
}
```

Vercel auto-detecta Next.js — no hace falta `buildCommand` ni `framework`. Región cdg1 (París) por latencia óptima desde España.

### C) `backend/scheduling-solver/.python-version`

```
3.11
```

Ancla la versión de Python que usa Render. Sin esto, si Render cambia el buildpack por defecto, las wheels precompiladas de `ortools` podrían dejar de encajar y el build romperá silenciosamente.

**Antes de crear:** verificar qué versión de Python usa Render actualmente. En el log de un deploy reciente, buscar líneas tipo `Python 3.x.x`. Usar esa versión exacta.

---

## Guía Cloudflare Zero Trust Access (H1-17)

**Objetivo:** capa de login (Google o email magic link) delante de `four-points.stackbp.es`. Sólo tú y tu equipo entráis. Free tier hasta 50 usuarios.

**⚠ Importante:** el backend (`api.four-points.stackbp.es`) **NO** lo metas detrás de CF Access. Si lo haces, el frontend no puede llamarlo (las peticiones fetch del browser no pasan la auth). Sólo el frontend va detrás de Access.

### Pasos (en este orden)

**1. Mover DNS del dominio a Cloudflare** (si no está ya)
- Crear cuenta en `cloudflare.com` (free tier).
- Añadir el dominio `stackbp.es` → CF te da 2 nameservers.
- En tu registrador (donde compraste el dominio) → cambiar nameservers a los de CF.
- Esperar propagación (5-30 min).

**2. Apuntar `four-points.stackbp.es` a Vercel vía CF**
- CF dashboard → DNS → Records.
- CNAME `four-points` → `cname.vercel-dns.com` (lo que Vercel pide).
- **Proxy status: orange cloud activado** (esto es clave — sin esto, no hay Access).

**3. Activar Zero Trust**
- CF dashboard → menú izquierdo → **Zero Trust**.
- Te pide crear un team name (ej: `bpstack`).
- Plan: **Free** (≤50 usuarios — suficiente).

**4. Configurar identity provider**
- Zero Trust → Settings → Authentication → Login methods.
- Añadir **Google** (más simple) o **One-time PIN** (email magic link).
- Para Google: te pide OAuth credentials de Google Cloud Console (~5 min).

**5. Crear Access Application**
- Zero Trust → Access → Applications → **Add an application**.
- Tipo: **Self-hosted**.
- Application name: `Four-Points PMS`.
- Session duration: 24 horas.
- Application domain: `four-points.stackbp.es`.
- **Identity providers**: marca el que configuraste.
- **Policies**:
  - Name: `Allowed users`.
  - Action: `Allow`.
  - Include: `Emails → tu email, tu equipo, etc.`.

**6. Verificar**
- Abre `https://four-points.stackbp.es` en una ventana de incógnito.
- Debe redirigir a la pantalla de CF Access → login Google → entra a la app.

---

## Python solver — estado actual

### Funciona porque

1. `backend/package.json` tiene un script `build`:
   ```
   "build": "python3 -m venv scheduling-solver/venv && scheduling-solver/venv/bin/pip install --no-cache-dir ortools pydantic"
   ```
2. El **Node buildpack de Render incluye `python3` por defecto** (lo necesita para node-gyp y bindings nativos como bcrypt/sharp).
3. En el panel de Render el build command es `pnpm install && pnpm run build` (o Render lo deduce automáticamente desde el script `build` de package.json).
4. El daemon Python se spawnea desde Node al arrancar (`solver-client.ts`) y `warmupSolver()` precalienta ortools.

### Riesgos residuales (cerrar en Sprint 2 o cuando toque)

| Riesgo | Severidad | Fix |
|---|---|---|
| Versión de Python no anclada. Si Render actualiza el buildpack y cambia la versión por defecto, las wheels de `ortools` podrían no encajar y el build romperá silenciosamente | 🟡 Medio | Crear `backend/scheduling-solver/.python-version` (contenido arriba en §"Ficheros listos para copiar") |
| Daemon Python puede crashear silenciosamente. Sólo lo notas cuando alguien intenta generar un horario y recibe 500. `warmupSolver()` corre al arrancar pero su fallo no bloquea el server | 🟡 Medio | Cuando H1-13 (Sentry) esté listo, capturar errores del daemon allí. Alternativa: endpoint `/health/solver` que prueba el daemon con un input mínimo |
| Cold start tras inactividad (Render free tier suspende tras 15 min sin tráfico). Primera petición tras el sleep: Node arranca (~3s) + daemon Python carga ortools (~10-15s) | 🟢 Bajo | Solución real: plan pagado de Render. Workaround: pinger externo cada 10 min |
| Build lento por reinstalación de ortools en cada deploy (~5-10 min en free/starter, ~350MB) | 🟢 Bajo | Habilitar **build cache** en Render (planes pagados) o aceptar el tiempo |

### Sin impacto (verificado)

- **Aiven**: el solver es stateless respecto a la BD. Node lee de Aiven, construye el input, manda al daemon Python, escribe el resultado a Aiven. Python no toca la BD directamente.

---

## H2-1 Refresh token rotation — contexto para sesión propia

**Por qué importa:** hoy un refresh token comprometido (XSS, body leak, log leak) es válido 7 días sin posibilidad de invalidarlo manualmente. Cambio de password no invalida tokens emitidos previamente.

**Diseño aproximado:**

1. Nueva tabla en Aiven + local:
   ```sql
   CREATE TABLE refresh_tokens (
     id INT AUTO_INCREMENT PRIMARY KEY,
     user_id CHAR(36) NOT NULL,
     token_hash VARCHAR(255) NOT NULL,
     issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     expires_at TIMESTAMP NOT NULL,
     revoked_at TIMESTAMP NULL,
     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
     INDEX idx_user_id (user_id),
     INDEX idx_token_hash (token_hash)
   );
   ```
2. `generateRefreshToken()` también inserta el hash en la tabla.
3. `refreshToken` controller:
   - Valida JWT.
   - Verifica que el hash existe en BD y `revoked_at IS NULL`.
   - Marca el token actual como revocado (rotación).
   - Emite nuevo refresh token + lo inserta.
4. `logout` controller: marca el token actual como revocado.
5. `updatePassword`: revoca todos los tokens del usuario (`UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ?`).
6. Cron diario: limpia tokens expirados (`DELETE WHERE expires_at < NOW() - INTERVAL 30 DAY`).

**Riesgo del cambio:** si rompe algo, todas las sesiones activas se cierran y los usuarios deben volver a loguearse. Hacer en una ventana de tráfico bajo.

**Migración:**
- DDL local primero: `backend/db-mysql/scripts/YYYYMMDD_create_refresh_tokens.sql`.
- Después incluir en `aiven/02_core_tables.sql` o crear `aiven/22_refresh_tokens.sql` + actualizar `MASTER_INSTALL_AIVEN.sql`.

**Tests a añadir:**
- Login crea row en `refresh_tokens`.
- Refresh consume el token viejo (queda `revoked_at`) y crea uno nuevo.
- Refresh con token revocado → 403.
- Logout revoca el token.
- Cambio de password revoca todos los tokens del usuario.

---

## Plan de la nueva sesión

```
[verificar Sprint 1 estable ≥24h en prod]
   ↓
[crear cuenta sentry.io] → traer DSN → cerrar H1-13 (10 min)
   ↓
[rama feature/infra-as-code]
   · crear render.yaml, vercel.json, .python-version
   · verificar valores reales contra panel Render
   · PR → main
   ↓
[seguir guía Cloudflare paso a paso desde el panel]
   · sin código, sólo dashboard CF
   ↓
[rama feature/refresh-token-rotation]
   · DDL local + aiven
   · controllers (login, refresh, logout, updatePassword)
   · tests específicos
   · PR → main
   ↓
[meta de Sprint 2 alcanzada → empezar a meter datos reales]
```
