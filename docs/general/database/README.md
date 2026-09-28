# Base de datos

Resumen de la base de datos, contrastado con Aiven el 2026-09-28. La fuente de
verdad del esquema y de las migraciones es
[`backend/db-mysql/`](../../../backend/db-mysql/) (ADR-016); este documento la
resume y enlaza. Visión general del proyecto en [`../README.md`](../README.md).

## Qué problema resuelve

Guarda todo lo que la aplicación maneja —usuarios, avisos, reservas, caja,
grupos, horarios…— en un solo sitio, y fija cómo se cambia su estructura sin
romper los datos que ya hay.

## Quién la usa

- **El backend**, a través de un _pool_ de conexiones (`backend/config/db.ts`).
  Es el único que se conecta: el frontend nunca habla con la BD.
- **Quien cambia el esquema**, con los scripts de `backend/db-mysql/scripts/`.

## Qué contiene

**Una sola base, `hotel_db`, en MySQL 8 sobre Aiven**, con datos de prueba
(ADR-015). No hay base local de desarrollo. Hoy tiene **66 tablas y 3 vistas**.

Tablas por módulo:

- **Núcleo**: `users`, `roles`, `departments`.
- **Logbook** (4), **parking** (5), **grupos** (5 + `hotel_groups`), **caja**
  (8 + `payment_methods`), **conciliación** (4), **lista negra** (1),
  **mantenimiento** (3), **mensajería** (3), **notificaciones** (2),
  **backoffice** (5 tablas + 3 vistas `v_bo_*`), **horarios** (12),
  **checklist** (6), **F&B** (2).
- **Modo demo**: `demo_activity_log`.

**Roles** (tabla `roles`): 1 `recepcionista`, 2 `admin`, 3 `mantenimiento`, 6
`group-admin`, 7 `demo-admin` (el usuario demo está desactivado).

**Lógica que vive en la propia BD** (no en el código):

- **Triggers**: 5 en `parking_bookings` (generan el código de reserva y
  mantienen el calendario de disponibilidad; ver
  [`docs/parking/`](../../parking/README.md)) y 1 en `cashier_shifts`.
- **Funciones y procedimientos** de parking: 2 funciones y 5 procedimientos. El
  código solo usa `check_availability`; el resto, incluido el que genera el
  calendario (`generate_availability`), nadie lo llama.
- **Evento** `cleanup_old_messages`: cada día borra los mensajes de más de 90
  días (ver [`messages/`](../messages/README.md)).

## Qué reglas cumple

- **Todo cambio de esquema es un script nuevo** en
  `backend/db-mysql/scripts/AAAAMMDD_descripcion.sql`, **idempotente** (se
  puede ejecutar dos veces sin romper nada) y registrado en
  `backend/db-mysql/INDEX.md`. Un script ya commiteado no se edita: si falló,
  se escribe otro que lo corrija.
- **`aiven/` es el esquema base congelado** a fecha 2026-05-20. El nombre
  engaña: no es «la BD de Aiven», sino la instalación inicial que ejecuta
  `MASTER_INSTALL.sql`. Nunca se ejecuta contra una base con datos.
- **Juego de caracteres**: `utf8mb4` con `utf8mb4_0900_ai_ci`, que no distingue
  mayúsculas ni tildes al comparar textos.
- **Hora**: el servidor de Aiven está en **UTC**. Lo que la BD calcula con
  `NOW()` o `CURDATE()` va 1–2 horas por detrás de Madrid; el backend calcula
  «hoy» en hora de Madrid por su cuenta.
- **Conexión cifrada**: TLS con el certificado de Aiven en
  `backend/config/certs/`.

**Estado de las migraciones**: las 15 que registra `INDEX.md` están aplicadas en
Aiven (comprobado el 2026-09-28).

## Cómo viaja la información

```
backend (repositorios) ─► pool mysql2 ─► TLS ─► MySQL en Aiven (hotel_db)
                                                   │
                                   triggers · procedimientos · evento diario
```

1. El backend lee `DB_ENVIRONMENT=aiven` y las variables `AIVEN_*`, abre un
   _pool_ con TLS y, al arrancar, prueba la conexión hasta 3 veces (Aiven puede
   tardar en despertar).
2. Los repositorios lanzan consultas parametrizadas (`?`); algunas escrituras
   usan transacciones.
3. Parte del trabajo lo hace la BD sola: los triggers de parking al insertar o
   cambiar una reserva y el evento de limpieza de mensajes.

## Qué hay en `backend/db-mysql/`

- **`aiven/`**: los 20 scripts del esquema base (`01`–`20`, más `99` de
  verificación) y una copia del certificado de Aiven.
- **`scripts/`**: las 15 migraciones incrementales y utilidades: copias de
  seguridad, recreación de la base local, comprobación de _collation_,
  arreglos de datos de un solo uso y scripts de consulta rápida en
  `scripts/basics/`.
- **`backup/`**: volcados de la base.
- **Cinco documentos** que se solapan: `CLAUDE.md`, `README.md`, `INDEX.md`,
  `MIGRATIONS_POLICY.md` y `MIGRATION_GUIDE.md`. Varios datos que dan están
  desactualizados (ver `TODO.md`).
