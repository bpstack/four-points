# Sistema Demo - Four Points

Sistema de demostración que permite a usuarios externos probar la aplicación con funcionalidad limitada.

## Credenciales Demo

```
Usuario: demo
Password: demo987654
```

## Comportamiento

### Lo que el usuario demo PUEDE hacer:

**Visualmente:**
- Ver TODO igual que un admin (dashboard, backoffice, reportes, usuarios, departamentos, etc.)

**Acciones permitidas:**
- Crear reservas de parking (`POST /api/parking/bookings`)
- Agregar comentarios en logbooks (`POST /api/logbooks/:id/comments`)
- Crear reportes de mantenimiento (`POST /api/maintenance`)
- Cerrar sesión (`POST /api/auth/logout`)

### Lo que el usuario demo NO puede hacer:

- Cualquier otra operación de escritura (POST/PUT/PATCH/DELETE)
- Modificar usuarios
- Eliminar registros
- Cerrar turnos de caja
- Modificar conciliaciones
- etc.

### Respuesta cuando se bloquea una acción:

**Backend (403 Forbidden):**
```json
{
  "success": false,
  "error": "Acción no disponible en modo demo. Esta es una cuenta de demostración con funcionalidad limitada.",
  "demo": true
}
```

**Frontend:**
El `apiClient` detecta `demo: true` y muestra un toast informativo con icono de candado.

---

## Archivos del Sistema

### Backend

| Archivo | Descripción |
|---------|-------------|
| `middlewares/demoRestriction.ts` | Middleware principal que bloquea escrituras no permitidas |
| `middlewares/authenticateToken.ts` | Llama a `demoRestriction()` después de autenticar |
| `middlewares/roleCheck.ts` | Incluye `demo-admin` en todos los checks de rol |
| `db-mysql/15_demo_user.sql` | Script SQL para crear rol y usuario (LOCAL + AIVEN) |

### Frontend

| Archivo | Descripción |
|---------|-------------|
| `app/lib/apiClient.ts` | Clase `ApiError` con flag `demo`, función `handleApiError()` con toast |
| `app/lib/helpers/utils.ts` | Función `isAdminRole()` que retorna `true` para `admin` y `demo-admin` |
| `app/components/profile/SettingsPanel.tsx` | Usa `isAdminRole()` para mostrar tabs: Usuarios, Departamentos, Reportes |
| `app/dashboard/page.tsx` | Usa `isAdminRole()` para mostrar sección BackOffice en dashboard |
| `app/ui/dashboard/nav-links.tsx` | Usa `isAdminRole()` para mostrar link "Back Office" en menú |
| `app/ui/dashboard/sidenav.tsx` | Pasa `currentUserRole` a NavLinks para control de visibilidad |

### Generados automáticamente

| Archivo | Descripción |
|---------|-------------|
| `registrosDemo.md` | Log de intentos bloqueados (raíz del proyecto backend) |

---

## Instalación

### 1. Ejecutar SQL

**Local (MySQL con utf8mb4_unicode_ci):**
```bash
mysql -u root -p hotel_db < backend/db-mysql/15_demo_user.sql
```

**Aiven (MySQL con utf8mb3_general_ci):**
1. Abrir `15_demo_user.sql`
2. Comentar la sección "VERSION LOCAL" (líneas 14-38)
3. Descomentar la sección "VERSION AIVEN" (líneas 44-70)
4. Ejecutar en Aiven

> **Nota:** En este caso específico, ambas versiones son idénticas porque solo hacemos INSERT en tablas existentes. La separación es por consistencia con otros scripts.

### 2. Verificar instalación

```sql
SELECT u.id, u.username, r.name as role 
FROM users u 
JOIN roles r ON u.role_id = r.id 
WHERE u.username = 'demo';
```

Resultado esperado:
```
+----------------------------------+----------+------------+
| id                               | username | role       |
+----------------------------------+----------+------------+
| demo-user-0000-0000-000000000001 | demo     | demo-admin |
+----------------------------------+----------+------------+
```

### 3. Probar

1. Iniciar sesión como `demo` / `demo987654`
2. Verificar acceso visual a:
   - Dashboard con sección BackOffice
   - Menú lateral con link "Back Office"
   - Settings → tabs Usuarios, Departamentos, Reportes
3. Intentar una acción bloqueada (ej: crear usuario) → debe mostrar toast de demo

---

## Desinstalación (Remover Demo Mode)

### Paso 1: Backend - Eliminar llamada al middleware

**Archivo:** `backend/middlewares/authenticateToken.ts`

```typescript
// ELIMINAR import:
import { demoRestriction } from './demoRestriction.js'

// ELIMINAR llamada (línea ~54):
demoRestriction(req, res, next)

// RESTAURAR next() después de asignar req.user:
req.user = {
  id: decoded.id,
  username: decoded.username,
  email: '',
  role: decoded.role,
}
next() // ← añadir esta línea
```

### Paso 2: Backend - Eliminar archivo middleware

```bash
rm backend/middlewares/demoRestriction.ts
```

### Paso 3: Base de datos - Eliminar usuario y rol

```sql
USE hotel_db;

DELETE FROM users WHERE id = 'demo-user-0000-0000-000000000001';
DELETE FROM roles WHERE id = 7;
```

### Paso 4 (Opcional): Backend - Limpiar roleCheck.ts

**Archivo:** `backend/middlewares/roleCheck.ts`

Remover `'demo-admin'` de los arrays:
- `isAdmin`: `['admin', 'demo-admin']` → `['admin']`
- `isOwnerOrAdmin`: quitar check de `demo-admin`
- `canManageGroups`: `['admin', 'group-admin', 'demo-admin']` → `['admin', 'group-admin']`
- `canViewGroups`: quitar `'demo-admin'`
- `canManageCashier`: quitar `'demo-admin'`
- `canViewReports`: `['admin', 'demo-admin']` → `['admin']`
- `canAccessMaintenance`: quitar `'demo-admin'`

> Esto es opcional - sin usuarios demo-admin, no afecta nada.

### Paso 5 (Opcional): Frontend - Revertir isAdminRole

**Archivo:** `frontend/app/lib/helpers/utils.ts`

```typescript
// Cambiar de:
export function isAdminRole(role: string | undefined | null): boolean {
  if (!role) return false
  const normalizedRole = role.toLowerCase().trim()
  return normalizedRole === 'admin' || normalizedRole === 'demo-admin'
}

// A:
export function isAdminRole(role: string | undefined | null): boolean {
  if (!role) return false
  return role.toLowerCase().trim() === 'admin'
}
```

> También opcional - sin usuarios demo-admin, no afecta nada.

### Paso 6 (Opcional): Frontend - Revertir apiClient.ts

El código de `ApiError` y `handleApiError` no causa problemas si se deja.

---

## Personalización

### Modificar acciones permitidas

Editar `DEMO_ALLOWED_ROUTES` en `backend/middlewares/demoRestriction.ts`:

```typescript
const DEMO_ALLOWED_ROUTES: Array<{ method: string; pattern: RegExp }> = [
  // Auth
  { method: 'POST', pattern: /^\/api\/auth\/logout$/ },

  // Parking - crear reservas
  { method: 'POST', pattern: /^\/api\/parking\/bookings$/ },

  // Logbooks - agregar comentarios
  { method: 'POST', pattern: /^\/api\/logbooks\/\d+\/comments$/ },

  // Maintenance - crear reportes
  { method: 'POST', pattern: /^\/api\/maintenance$/ },

  // Añadir más rutas aquí...
]
```

### Modificar visibilidad frontend

Para ocultar secciones específicas al demo-admin, modificar la función `isAdminRole()` o crear una nueva función que excluya demo-admin para ciertas features.

---

## Logs de Intentos Bloqueados

Los intentos de escritura bloqueados se registran en `registrosDemo.md`:

```markdown
| Timestamp | Usuario | Método | Ruta | Body (truncado) |
|-----------|---------|--------|------|-----------------|
| 2025-01-15T10:30:00.000Z | demo | DELETE | /api/users/123 | {} |
| 2025-01-15T10:31:00.000Z | demo | PUT | /api/cashier/daily/close | {"notes":"test"} |
```

---

## Notas Técnicas

- **Rol:** `demo-admin` con ID 7 en tabla `roles`
- **Usuario:** ID `demo-user-0000-0000-000000000001`
- **Orden de ejecución:** `authenticateToken` → `demoRestriction` → handler
- **GET siempre permitidos:** El usuario demo puede ver todo
- **Diseño no invasivo:** Fácil de remover sin afectar otras funcionalidades
- **Frontend helper:** `isAdminRole()` centraliza la lógica de visibilidad
