# SESSION — por dónde vamos

> **Qué responde:** dónde lo dejamos y qué toca después. · **Quién lo lee:**
> quien retome el trabajo. · **Cómo se poda:** se **sobrescribe** — git guarda
> la historia (`git log -p docs/SESSION.md`).

Lo que no encaje aquí es una decisión (a `DECISIONS.md`), un hallazgo (a su
propio fichero) o ruido (se borra).

**Última actualización:** 2026-09-28 · PC principal (`dz`)

---

## Estado

Preparación del repositorio para publicarlo como open source. Orden de fases en
`ROADMAP.md`; decisiones en `DECISIONS.md` (ADR-001 a ADR-028); procedimiento de
la limpieza del historial en `GITCLEAN.md`. El plan original (`OPEN-SOURCE.md`)
está en `docs/_archive/`.

Fase actual: **1c — Resolver `TODO.md` y probarlo en producción** (ADR-027). Las
fases 1 y 1b quedaron cerradas el 2026-09-28; detalle en
`docs/_archive/roadmap-history.md` (local).

## ⚠️ Empieza por aquí

1. **Fase 1c**: se hace todo `TODO.md`, de 🔴 a 🟢, y se prueba en producción
   antes de limpiar el historial. El clon limpio y el repo público nuevo
   (ADR-006, ya aceptada) vienen después.
2. **Qué se publica** (ADR-026): los ficheros de trabajo, todas las ramas y los
   `AGENTS.md`/`CLAUDE.md`. No se publica `docs/_archive/`.
3. **Idiomas:** se trabaja en español; la documentación pública de `docs/` va en
   inglés y no cita ADR ni `TODO.md`. `DECISIONS.md`, `ROADMAP.md`, `SESSION.md`
   y `TODO.md` siguen en español.
4. **Material de consulta:** `docs/_archive/` refleja las rutas originales.

## Hallazgos

**Método por módulo** (ADR-018): documentar → revisión `security` L3 → comprobar
lo grave → `TODO.md`. Aplicado el 2026-09-28 a los 12 módulos (general con
mensajería y base de datos incluidas).

Los hallazgos de la lectura del código (seguridad, docs desalineadas, código
muerto, decisiones previas a publicar) están en `TODO.md`, y **se resuelven
todos antes de publicar** (ADR-027).

## Esperando decisión

Nada ahora mismo. Cómo se trabaja en la 1c (orden y flujo de push) está en
`ROADMAP.md`.

## Volcados de BD

Los cuatro `backend/db-mysql/backup/backup_hotel_db_{aiven,local}_2026*.sql`
salieron del árbol el 2026-09-28 (`git rm --cached`; siguen en el disco del PC
`dz`, ignorados por `.gitignore`). En el historial siguen estos cuatro y además
`backup_hotel_db-aiven.sql` y `backup_hotel_db-local.sql`; entraron en
`dad3cdc`, `f5d47d6` y `7ac45e7`. **No se han abierto.** Se eliminan del
historial en la fase 2, en todas las ramas: `main`, `chore/audit-prep-sprint-0`,
`feature/ai-schedule-generator`, `feature/auth-hardening` y
`feature/observability-pino` (sin tags).

## Cuidado con esto

- **Los `CLAUDE.md`/`AGENTS.md` de módulo no son fuente fiable**: el de logbook
  citaba tres tablas que nunca existieron, y varios más tenían datos
  desactualizados. Se contrastan siempre con el código y la BD; las correcciones
  encontradas quedan en `TODO.md` y siguen sin aplicarse a los `AGENTS.md`.
- **Nada de `docs/_archive/` se publica**, tampoco `roadmap-history.md`
  (ADR-009). Si algo de ahí debe ser público, se copia fuera.
- **`backend/db-mysql/aiven/19_scheduling.sql` sigue citando
  `SCHEDULING-CONSTRAINTS.md §7.5`** en un comentario: los scripts 01–19 no se
  tocan (ADR-021). La sección equivalente es
  `docs/scheduling/constraints.md §7.5`.
- **Enlaces rotos conocidos** tras archivar: `backend/README.md` (enlaces a
  `docs/backend/…`) y comentarios que citan `Global-Plan.md` o
  `SCHEDULING-SOLVER-PLAN.md`. Se arreglan al escribir cada módulo (ADR-010).
- **Candidatos a privados para la fase 2**, además de los volcados: los dos
  Excel archivados (`PLANNING 2026.xlsx`, el Excel de presencias),
  que siguen en el historial, y los 18 `.http` de `backend/API REST/`
  (peticiones de prueba; suelen llevar tokens o contraseñas). Ninguno abierto.
