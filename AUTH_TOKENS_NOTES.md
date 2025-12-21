# Notas rápidas: autenticación y API (frontend)

- Estrategia única: cookies HttpOnly para access/refresh, sin `localStorage` (dev y prod).
- `apiClient` es el único fetcher; siempre usa `credentials: 'include'` y refresco por cookies. En 401 o refresh fallido redirige a `/login` y limpia cookies.
- Route handlers de auth (login/refresh/me/logout/register) validan método y respuestas, manejan cookies HttpOnly y devuelven errores claros.
- `API_BASE_URL` (cliente) y `SERVER_API_BASE_URL` (server actions/route handlers) se definen en `frontend/app/lib/env.ts`. No usar `process.env` directo en módulos.
- Subida/descarga (FormData/Blob) también depende de cookies; no agrega headers de autorización ni toca `localStorage`.
- Server Actions (maintenance/blacklist/parking) leen token de `cookies()` y usan `SERVER_API_BASE_URL`. Seguir el mismo patrón si se crean más actions.
- Hooks React Query deben usar `apiClient` y mantener claves consistentes; invalidar tras mutaciones (ver `conciliation/cashier`).
