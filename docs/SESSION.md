# SESSION — por dónde vamos

> **Qué responde:** dónde lo dejamos y qué toca después. · **Quién lo lee:**
> quien retome el trabajo. · **Cómo se poda:** se **sobrescribe** — git guarda
> la historia (`git log -p docs/SESSION.md`).

Lo que no encaje aquí es una decisión (a `DECISIONS.md`), un hallazgo (a su
propio fichero) o ruido (se borra).

**Última actualización:** 2026-09-28 · PC principal (`dz`)

---

## Estado

Preparación del repositorio para publicarlo como open source. Plan en
`OPEN-SOURCE.md` (raíz, sin versionar); orden de fases en `ROADMAP.md`;
decisiones en `DECISIONS.md` (ADR-001 a ADR-010).

Fase actual: **1 — Documentación nueva**. La documentación antigua ya está
archivada en `docs/_archive/` (ADR-010); lo hecho se registra en
`docs/_archive/roadmap-history.md` (local).

## ⚠️ Empieza por aquí

1. **Decidir la estructura de `docs/`** (fichero o carpeta por módulo) y
   empezar por el módulo general. Siguiente paso de la fase 1 en `ROADMAP.md`.
2. **Material de consulta:** `docs/_archive/` refleja las rutas originales
   (`docs/_archive/docs/backend/…`, `docs/_archive/frontend/docs/…`,
   `docs/_archive/Global-Plan.md`…).

## Esperando decisión

- **Volcados de BD en `main`: se deja para más adelante** (decisión del
  propietario, 2026-09-28). Cuatro ficheros versionados en `HEAD` y subidos al
  remoto privado:
  - `backend/db-mysql/backup/backup_hotel_db_aiven_20260226_010814.sql`
  - `backend/db-mysql/backup/backup_hotel_db_aiven_20260512_112814.sql`
  - `backend/db-mysql/backup/backup_hotel_db_local_20260226_011428.sql`
  - `backend/db-mysql/backup/backup_hotel_db_local_20260512_112901.sql`

  En el historial hay además `backup_hotel_db-aiven.sql` y
  `backup_hotel_db-local.sql`, ya borrados. Entraron en `dad3cdc`, `f5d47d6` y
  `7ac45e7`. **No se han abierto.** Se eliminan del historial en la fase 2.

- **ADR-006 (repo nuevo desde clon limpio)** sigue 🔶 propuesta.
- **¿Se publican los `CLAUDE.md` / `AGENTS.md`**, o se quitan antes de publicar?
- **Qué ramas se publican** además de `main`: `chore/audit-prep-sprint-0`,
  `feature/ai-schedule-generator`, `feature/auth-hardening`,
  `feature/observability-pino`. Sin tags. Se decide más adelante.

## Cuidado con esto

- **Nada de `docs/_archive/` se publica**, tampoco `roadmap-history.md`
  (ADR-009). Si algo de ahí debe ser público, se copia fuera.
- **El antiguo `TODO.md` de la raíz (ahora en `docs/_archive/TODO.md`) tiene
  una entrada local del PC `dz`** (_Mantenimiento local_: borrar los `.bak` de
  la limpieza de permisos): no debe pasar al `docs/TODO.md` público.
- **Enlaces rotos conocidos** tras archivar: `backend/README.md` (enlaces a
  `docs/backend/…`) y comentarios que citan `Global-Plan.md` o
  `SCHEDULING-SOLVER-PLAN.md`. Se arreglan al escribir cada módulo (ADR-010).
- **Candidatos a privados para la fase 2**, además de los volcados: los dos
  Excel archivados (`PLANNING 2026.xlsx`, `Presencias - Marzo.xlsx`),
  que siguen en el historial.
- **Quedan carpetas vacías** en `docs/` y `frontend/docs/` tras archivar. Git no
  las ve; se pueden borrar a mano.
