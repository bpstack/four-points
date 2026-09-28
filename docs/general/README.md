# General — Four-Points

Lo que afecta al proyecto en su conjunto: qué es, quién lo usa, cómo está
construido y cómo viaja la información. Cada módulo funcional tiene su propia
carpeta en `docs/`.

## Qué problema resuelve

La operativa interna de un hotel —lo que no gestiona el PMS comercial— suele
repartirse entre hojas de cálculo, papel y mensajes sueltos. Four-Points la
reúne en una sola aplicación web: libro de consigna, parking, mantenimiento,
grupos, caja, lista negra, horarios del personal, checklists de turno, ingresos
de F&B y backoffice de facturas. Complementa al PMS del hotel (Opera, del que
importa informes en PDF), no lo sustituye. Cada persona tiene su usuario y
permisos según su rol.

## Quién lo usa

El personal del hotel, cada uno con **un rol**:

- **`admin`**: todo. Es el único que crea usuarios, gestiona departamentos, ve
  informes y escribe en backoffice.
- **`recepcionista`**: módulos operativos (consigna, parking, caja, lista negra,
  conciliación, checklist, F&B, mantenimiento). Los grupos solo los consulta.
- **`group-admin`**: lo mismo que recepción y, además, gestiona grupos y recibe
  sus avisos.
- **`mantenimiento`**: solo el módulo de mantenimiento, más las funciones comunes
  (perfil, mensajes, notificaciones, búsqueda).
- **`demo-admin`**: ve todo como `admin`, pero solo puede escribir en una lista
  blanca (cerrar sesión, crear una reserva de parking, comentar en consigna, abrir
  un parte de mantenimiento). Cada intento bloqueado queda registrado.

El menú lateral solo oculta a quien no es administrador los enlaces de backoffice
y horarios. **Quien decide de verdad es el backend**: cada ruta comprueba el rol
y responde `403` si no corresponde.

## Qué puede hacer

**Módulos funcionales** — cada uno documentado en su carpeta: `logbook`,
`parking`, `maintenance`, `groups`, `scheduling`, `checklist`, `cashier`, `fnb`,
`backoffice`, `blacklist`, `conciliation`.

**Funciones comunes a toda la aplicación** (se documentan aquí):

- **Acceso**: inicio de sesión con usuario y contraseña. No hay registro
  público: los usuarios los crea un `admin`.
- **Perfil** (`/dashboard/profile`): datos propios, avatar, cambio de usuario y
  de contraseña (ambos piden la contraseña actual). En _Ajustes_, los
  administradores gestionan usuarios, departamentos e informes.
- **Mensajería interna**: conversaciones directas y grupos entre usuarios, con
  mensajes urgentes que llegan como notificación. Vive dentro del perfil.
  Detalle en [`messages/`](messages/README.md).
- **Notificaciones**: campana en la cabecera, que se refresca cada minuto. Las
  genera el sistema (avisos de grupos: pagos, rooming list, llegadas), un
  `admin` a mano o un mensaje nuevo.
- **Búsqueda global** y **actividad reciente** en el panel de inicio.
- **Idioma** español o inglés y **tema** claro u oscuro.

## Qué datos maneja

- **MySQL 8** en Aiven, una sola base (`hotel_db`) con datos de prueba, que
  usan tanto el despliegue como el desarrollo (ADR-015). Resumen en
  [`database/`](database/README.md); esquema, scripts y política de
  migraciones en [`backend/db-mysql/`](../../backend/db-mysql/).
- **Usuarios y roles**: tablas `users` y `roles`. Las contraseñas se guardan con
  bcrypt. Borrar un usuario no lo elimina: se desactiva y se renombra.
- **Ficheros** (avatares, fotos de mantenimiento y de lista negra, PDF de
  facturas): en **Cloudinary**, no en el servidor.
- **Hora**: todo lo que depende del día se calcula en `Europe/Madrid`.

## Qué reglas cumple

**Sesión**

- Al iniciar sesión el backend emite dos JWT en cookies HttpOnly:
  `access_token` (15 min) y `refresh_token` (7 días). En producción las cookies
  valen para todo `.four-points.stackbp.es`.
- Cuando una petición recibe `401`, el cliente pide un token nuevo y la repite.
  Cada renovación emite también un `refresh_token` nuevo, así que la sesión se
  alarga mientras se use.
- Las sesiones **no se guardan en base de datos**: no hay forma de cerrarlas
  desde el servidor antes de que caduquen. Cambiar la contraseña borra las
  cookies del navegador desde el que se hace.

**Protección**

- Límites de peticiones por IP: 300 cada 15 min en toda la API; 5 intentos de
  login cada 15 min por IP y usuario; 3 cambios de contraseña por hora.
- Cabeceras de seguridad con Helmet en el backend y en Vercel. CORS acepta los
  dominios propios, las previsualizaciones de Vercel y las peticiones sin
  cabecera `Origin` (herramientas, servidor a servidor).
- En producción, los errores no controlados devuelven un mensaje genérico.

**Base de datos**

- Todo cambio de esquema es un script nuevo, idempotente, en
  `backend/db-mysql/scripts/` y registrado en su `INDEX.md`. Nunca se ejecuta
  la instalación completa contra una base con datos.

**Tareas programadas** (hora de Madrid, dentro del proceso del backend)

| Cuándo          | Qué hace                                                           |
| --------------- | ------------------------------------------------------------------ |
| Cada día, 06:30 | Reinicia los checklists del día                                    |
| Cada día, 07:00 | Envía las notificaciones programadas y genera los avisos de grupos |
| Lunes, 04:00    | Borra el registro de eventos de checklist de más de 7 días         |
| Día 10, 23:59   | Marca como pagadas las facturas validadas del mes anterior         |

## Cómo viaja la información

```
Navegador ──────────────► Frontend  (Next.js · Vercel)
    │                        │  componentes de servidor: serverFetch
    │  fetch + cookies       ▼
    └──────────────────► Backend   (Express · Render)
                             │  rutas → controladores → servicios → repositorios
                             ├──► MySQL        (Aiven)
                             ├──► Cloudinary   (ficheros)
                             └──► Solver Python (horarios, proceso hijo)
```

1. El navegador llama **directamente** al backend
   (`api.four-points.stackbp.es`) con `credentials: 'include'`, a través de
   `app/lib/apiClient.ts`, que también renueva el token. No hay un proxy
   intermedio: la única excepción es la creación de usuarios, que pasa por
   `app/api/auth/register`.
2. Los componentes de servidor usan `app/lib/serverFetch.ts`, que reenvía la
   cookie de acceso al backend.
3. `proxy.ts` (el middleware de Next.js 16) redirige al login si no hay
   cookies de sesión. Solo mira si existen y si han caducado: la firma la
   comprueba el backend.
4. En el backend, cada petición pasa por `authenticateToken` → comprobación de
   rol → controlador → validación con Zod → servicio → repositorio → MySQL.
5. El estado de servidor en el cliente lo gestiona React Query; Zustand guarda
   el estado local de algunos módulos (caja, grupos, mantenimiento,
   notificaciones).

## Stack

- **Frontend**: Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS 3,
  NextUI, React Query 5, Zustand 5, next-intl 4 y Zod 3.
- **Backend**: Express 5 y TypeScript ejecutado con `tsx` (sin compilar),
  mysql2, Zod 4, pino, node-cron y multer.
- **Horarios**: Python 3.11 y OR-Tools (CP-SAT), como proceso persistente
  lanzado por el backend.
- **Tests**: Vitest en el backend (auth, checklist, F&B, horarios) y pytest en
  el solver. El frontend no tiene tests.

`frontend/` y `backend/` son dos proyectos pnpm independientes, cada uno con su
lockfile. Node ≥ 22.16.

## Despliegue

| Pieza    | Dónde      | Detalle                                                                  |
| -------- | ---------- | ------------------------------------------------------------------------ |
| Frontend | Vercel     | `four-points.stackbp.es`, región `cdg1` (París)                          |
| Backend  | Render     | `api.four-points.stackbp.es`. El build crea el entorno Python del solver |
| BD       | Aiven      | MySQL con TLS; certificado CA en `backend/config/certs/`                 |
| Ficheros | Cloudinary |                                                                          |

## Desarrollo local

```bash
cd backend && pnpm install && pnpm dev:aiven   # API contra Aiven; el frontend la busca en :4000
cd frontend && pnpm install && pnpm dev        # http://localhost:3000
```

Variables del backend: `PORT` (4000 en local), `NODE_ENV`, `SECRET_JWT_KEY`,
`SALT_ROUNDS`, `DB_ENVIRONMENT=aiven`, `AIVEN_DB_*` + `AIVEN_PASSWORD`, `CLOUDINARY_*`, `LOG_LEVEL`, `FRONTEND_URL`.
Del frontend: `NEXT_PUBLIC_API_URL`, `NEXT_SERVER_API_URL` (opcional) y
`NEXT_PUBLIC_APP_URL`, que la ruta de creación de usuarios usa para aceptar el
origen de la petición.
