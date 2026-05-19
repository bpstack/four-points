# Política de migraciones — `backend/db-mysql/`

> Última revisión: 2026-05-20

Este documento recoge **cómo se gestionan los cambios de schema** en el proyecto y por qué se hace así. Si vas a tocar tablas, leelo entero antes.

---

## Estado actual (decisión vigente)

Se aplica un **patrón híbrido con doble escritura**:

1. **Cada cambio de schema produce un script incremental idempotente** en `backend/db-mysql/scripts/AAAAMMDD_<descripcion>.sql`. Ese script es el **único que se ejecuta** contra la BD viva (local y Aiven).
2. **El mismo cambio se espeja** en el archivo de instalación inicial correspondiente (`aiven/NN_<modulo>.sql`) editando el `CREATE TABLE` / `INSERT` original. Ese archivo **nunca se ejecuta** sobre una BD existente — solo sirve como representación legible del schema final.
3. La migración se **registra en `INDEX.md`** (tabla "Migraciones incrementales") con fecha, archivo, descripción y estado por entorno (`✅ local · ✅ Aiven`, `⏳ pendiente`, etc).

### Reglas prácticas

- **Nunca** ejecutar `MASTER_INSTALL.sql` ni los scripts `aiven/01_…` … `aiven/20_…` contra una BD con datos. Solo tienen sentido contra una BD vacía.
- **Nunca** modificar un script incremental ya commiteado (ni siquiera para "corregir"). Si algo salió mal, crear un nuevo script `AAAAMMDD_fix_…sql` que lo enmiende.
- Las migraciones **deben ser idempotentes**: protegerse con `information_schema.COLUMNS`, `INSERT IGNORE`, `CREATE TABLE IF NOT EXISTS`, etc. Plantilla en `scripts/20260519_add_scheduling_employee_display_order.sql`.
- Aplicar primero en **local** (`pnpm dev:local`), luego en **Aiven**.
- Charset/collation siempre: `utf8mb4` / `utf8mb4_0900_ai_ci`.

---

## Razones de la decisión

**A favor del espejo (lo que hacemos hoy):**

- El archivo `aiven/NN_*.sql` sigue siendo una foto legible del modelo. Onboarding y revisión rápida no requieren reconstruir mentalmente el schema a partir del histórico de scripts.
- Reconstrucción coherente: `MASTER_INSTALL.sql` (en una BD nueva) produce el schema real, sin tener que recordar aplicar también todos los incrementales antiguos.
- Diff de PRs más informativo: ves la columna nueva tanto en el script incremental (ejecución) como en el `CREATE TABLE` actualizado (documentación).

**Coste asumido:**

- Doble escritura cada vez. Olvidos posibles → divergencias entre archivo "documental" y BD real.
- Las migraciones más viejas pueden perder relevancia (la columna ya está en el `CREATE TABLE`, así que el script incremental queda como artefacto histórico que ya no aporta).
- Riesgo silencioso: alguien que vea el archivo "limpio" puede no enterarse de que esa columna ENTRÓ en una fecha concreta y que en BDs antiguas todavía no exista.

---

## Patrones alternativos considerados (no adoptados)

### Solo migraciones incrementales (estilo Rails / Django / Flyway / Liquibase)

`aiven/NN_*.sql` se congelaría en su estado inicial. Cualquier cambio posterior vive solo en `scripts/`. La reconstrucción sería siempre: instalación base + secuencia de migraciones por fecha.

- ✅ Una sola fuente de verdad. Sin riesgo de divergencia.
- ✅ Trazabilidad histórica máxima (cada cambio tiene fecha, autor, razón en cabecera).
- ✅ Estándar de la industria.
- ❌ El archivo base envejece y deja de ser un resumen útil del modelo — para entender el schema actual hay que leer base + N migraciones.
- ❌ Pierdes la "vista panorámica" en un solo archivo.

Pendiente de revisión: ver `TODO.md` → tarea **"Política de migraciones — revisitar"**.

### Herramienta de migraciones (knex, prisma migrate, dbmate, flyway)

No adoptada. Para el tamaño actual del equipo y del schema, la fricción de introducir una herramienta supera el beneficio. Si el equipo crece o el ritmo de cambios se acelera, reconsiderar.

---

## Cuándo revisar este documento

- Si el patrón híbrido empieza a generar divergencias reales (caso: la BD tiene una columna que el `aiven/NN_*.sql` no refleja, o viceversa). → Pasar al modelo de "solo incrementales" o adoptar herramienta.
- Si se incorpora gente nueva al proyecto y la fricción de entender el flujo se nota. → Reconsiderar.
- Si llega CI que valide el schema. → Reconsiderar.

Cualquier cambio en esta política se documenta aquí (sección de cambios al final si llega el caso) y se notifica en `TODO.md` / `Global-Plan.md`.

---

## Archivos relacionados

- `INDEX.md` — índice general, tabla "Migraciones incrementales"
- `MIGRATION_GUIDE.md` — guía de instalación inicial (scripts 01-20)
- `README.md` — overview de la carpeta
- `scripts/` — scripts incrementales, ordenados por fecha
- `aiven/NN_*.sql` — schema base reconstructible (espejado a mano)
