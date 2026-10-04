# Política de migraciones — `backend/db-mysql/`

> Última revisión: 2026-05-20 (transición a "solo incrementales")

Este documento recoge **cómo se gestionan los cambios de schema** en el proyecto. Si vas a tocar tablas, leelo entero antes.

---

## Estado actual

Patrón **solo incrementales**, estilo Rails/Django/Flyway. Una sola fuente de verdad: la secuencia ordenada de scripts en `backend/db-mysql/scripts/`.

### Reglas

1. **`aiven/NN_*.sql` está congelado** desde el 2026-05-20. Cabecera `⚠️ FROZEN` en cada archivo. Son snapshot histórico del install base, **no se editan nunca**.
2. **Cada cambio de schema** = un nuevo script en `backend/db-mysql/scripts/AAAAMMDD_<descripcion>.sql`. Idempotente. Ejecutable sobre BD viva.
3. **Registro obligatorio en `INDEX.md`** (tabla "Migraciones incrementales") con fecha, archivo, descripción, estado por entorno (`✅ local · ✅ Aiven`, `⏳ pendiente`, etc).
4. **Nunca modificar un script commiteado**. Si algo salió mal, crear nuevo script `AAAAMMDD_fix_…sql` que lo enmiende.
5. Las migraciones **deben ser idempotentes**: protegerse con `information_schema.COLUMNS`, `INSERT IGNORE`, `CREATE TABLE IF NOT EXISTS`, etc. Plantilla en `scripts/20260519_add_scheduling_employee_display_order.sql`.
6. Aplicar primero en **local**, luego en **Aiven**, con `scripts/apply-migration.sh local|aiven <fichero> [--dry-run]` (lee las credenciales de `backend/.env`; detalle en `AGENTS.md`, «Applying a migration»). Actualizar columna "Estado" de `INDEX.md`.
7. Charset/collation siempre: `utf8mb4` / `utf8mb4_0900_ai_ci`.

### Reconstrucción desde cero

```bash
# 1. Base congelada (snapshot 2026-05-20)
mysql -u root -p < MASTER_INSTALL.sql

# 2. Todos los incrementales en orden cronológico
for f in scripts/*.sql; do mysql -u root -p hotel_db < "$f"; done
```

Idempotencia garantiza que aplicar todos los scripts dos veces no rompe nada.

---

## Por qué este modelo

**Antes (híbrido, hasta 2026-05-19):** doble escritura. Cada cambio se replicaba en `aiven/NN_*.sql` (espejo manual) y en `scripts/` (ejecución real). Coste asumido: divergencia silenciosa entre el archivo "documental" y la BD real cuando se olvidaba el espejo.

**Ahora (solo incrementales, desde 2026-05-20):** los `aiven/NN_*.sql` quedan como snapshot del schema en el momento del congelamiento. Todo cambio posterior vive en `scripts/`. Beneficios:

- Una sola fuente de verdad. Sin riesgo de divergencia.
- Trazabilidad histórica máxima (cada cambio tiene fecha, autor, razón en cabecera).
- Sin ejecución accidental del install completo sobre BD con datos (porque `MASTER_INSTALL.sql` ya no representa el estado actual — solo el del 2026-05-20).
- Estándar de la industria.

**Coste asumido:** el snapshot envejece. Para entender el schema actual hay que leer base congelada + N scripts. Compensado parcialmente por:

- Lista cronológica completa en `INDEX.md` (tabla "Migraciones incrementales").
- Scripts retroactivos `[RETROACTIVE]` documentan cambios pre-2026-04-25 que entraron editando `aiven/` directamente. Reconstrucción histórica desde commits.

---

## Reconstrucción retroactiva (histórico pre-2026-04-25)

`scripts/` empieza el 2026-04-25 (`20260425_create_scheduling_employee_requests.sql`). Cambios anteriores entraron editando directo `aiven/NN_*.sql` sin script incremental.

Esos cambios se han reconstruido a posteriori como scripts marcados `[RETROACTIVE]` con fecha extraída del commit original. Ver `INDEX.md` para la lista completa. Todos idempotentes y no-op contra la BD viva actual.

---

## Cuándo cambiar este modelo

- Si el equipo crece > 1-2 devs y necesita sincronización formal → considerar herramienta (dbmate / flyway / prisma migrate).
- Si llega CI que valide schema → automatizar aplicación de scripts.
- Si el snapshot base resulta confuso → renombrar `aiven/NN_*.sql` a `aiven/baseline-YYYYMMDD/` para enfatizar que es congelado.

---

## Archivos relacionados

- `INDEX.md` — índice general, tabla "Migraciones incrementales"
- `MIGRATION_GUIDE.md` — guía de instalación inicial (scripts 01-20 congelados)
- `README.md` — overview de la carpeta
- `scripts/` — scripts incrementales, ordenados por fecha. Única fuente de verdad para cambios desde 2026-05-20.
- `aiven/NN_*.sql` — snapshot congelado del install base. No editar.
