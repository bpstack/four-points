# SESSION — por dónde vamos

> **Qué responde:** dónde lo dejamos y qué toca después. · **Quién lo lee:**
> quien retome el trabajo. · **Cómo se poda:** se **sobrescribe** — git guarda
> la historia (`git log -p docs/SESSION.md`).

Lo que no encaje aquí es una decisión (a `DECISIONS.md`), un hallazgo (a su
propio fichero) o ruido (se borra).

**Última actualización:** 2026-10-05

---

## Estado

Fase actual: **4 — Publicación** (`ROADMAP.md`). Las fases 1c y 2 quedaron
cerradas el 2026-10-05: las brechas de «Antes de publicar» arregladas y
probadas, y el historial de `main` y `claude/compassionate-planck-gh6aof` limpio
y auditado (`GITCLEAN.md`).

El historial limpio está en `bpstack/four-points`, **todavía privado**. El
original sigue privado como `four-points-archive`. Vercel y Render despliegan ya
desde el nuevo, en producción y en preview (`VERIFY.md`, «Cambio al repositorio
nuevo»). Decisiones en `DECISIONS.md`, hasta ADR-039.

La demo pública (fase 5) está hecha en código y probada en preview el
2026-10-05: cuenta demo con botón, bloqueos, límites, reinicio diario,
Configuración → Demo, instalación local con `pnpm setup:local` y `demo-admin`
retirado. `DEMO_MODE` y `NEXT_PUBLIC_DEMO_MODE` solo están en preview.

## ⚠️ Empieza por aquí

1. **Este repositorio va a ser público**, también su historial: lo que se
   commitee no se puede borrar después sin reescribirlo. Nada de secretos, hosts
   o usuarios de la BD, IDs de servicios, rutas locales ni datos del personal o
   de la empresa.
2. **Clones nuevos:** activar los hooks una vez con
   `git config core.hooksPath .githooks` (no viene con el clon; ver
   `AGENTS.md`).
3. **Idiomas:** se trabaja en español; la documentación pública de `docs/` va en
   inglés y no cita ADR ni `TODO.md`. `DECISIONS.md`, `ROADMAP.md`,
   `SESSION.md`, `TODO.md`, `VERIFY.md` y `GITCLEAN.md` siguen en español.

## Siguiente

1. Terminar la demo: `TODO.md`, «Demo pública en la propia web: lo que
   falta» (base de horarios, migración del rol en Aiven, variables en
   producción tras el merge).
2. PR a `main` y probar el botón demo en la web.
3. Pasar `four-points` a público y activar secret scanning y push protection.
4. «Después de publicar» de `TODO.md`, empezando por la rotación de
   credenciales (se puede adelantar).

Hecho el 2026-10-05: Vercel y Render despliegan solos desde este repositorio
(producción y preview), `four-points-archive` está archivado y Aiven tiene
usuarios anonimizados y datos ficticios (`mock-data.sql`).

## Esperando decisión

Nada ahora mismo.

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
- **La cuenta demo es un admin** (`users.is_demo = 1`): lo que no deba tocar
  se bloquea en la ruta con `denyDemo`/`denyDemoWrites` o en
  `demoRestriction`. Una ruta nueva que escriba fuera de lo que reinicia el
  mock (usuarios, catálogos, configuración) necesita su guarda.
- **Enlaces rotos conocidos** tras archivar: `backend/README.md` (enlaces a
  `docs/backend/…`) y comentarios que citan `Global-Plan.md` o
  `SCHEDULING-SOLVER-PLAN.md`. Se arreglan al escribir cada módulo (ADR-010).
  _Sin repasar desde el 2026-09-28._
