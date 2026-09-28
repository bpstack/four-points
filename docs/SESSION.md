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
decisiones en `DECISIONS.md` (ADR-001 a ADR-009).

Fase actual: **1 — Documentación nueva**. Creados `DECISIONS.md`,
`SESSION.md` y `ROADMAP.md`; `docs/_archive/` ya está en `.gitignore`
pero todavía vacío.

## ⚠️ Empieza por aquí

1. **Archivar la documentación antigua en `docs/_archive/`** (ADR-003,
   ADR-009). Antes, enseñar al propietario la lista exacta de lo que se mueve.
2. Seguir con los pasos de la fase 1 en `ROADMAP.md`.

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
- **`TODO.md` de la raíz tiene una entrada local del PC `dz`** (_Mantenimiento
  local_): no debe pasar al `docs/TODO.md` público.
- **Las docs operativas se dejan como están** (ADR-003): no moverlas al
  archivar.
