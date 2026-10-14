# SESSION — por dónde vamos

> **Qué responde:** dónde lo dejamos y qué toca después. · **Quién lo lee:**
> quien retome el trabajo. · **Cómo se poda:** se **sobrescribe** — git guarda
> la historia (`git log -p docs/SESSION.md`).

Lo que no encaje aquí es una decisión (a `DECISIONS.md`), un hallazgo (a su
propio fichero) o ruido (se borra).

**Última actualización:** 2026-10-14

---

## Estado

**El repositorio es público** desde el 2026-10-05 (`bpstack/four-points`), con
secret scanning y push protection activados y sin alertas. El proceso de
publicación terminó: documentación nueva, arreglos previos, historial reescrito
y auditado, publicación y demo. Sus documentos (`ROADMAP.md`, `GITCLEAN.md`,
`VERIFY.md`) están archivados; cómo recuperarlos, en ADR-041.

- **Producción:** `four-points.stackbp.es` (Vercel) y
  `api.four-points.stackbp.es` (Render), sobre Aiven. Demo pública activa
  (`DEMO_MODE`), descrita en `docs/demo/README.md`.
- **Preview:** `preview.four-points.stackbp.es` y
  `api-preview.four-points.stackbp.es`, desde
  `claude/compassionate-planck-gh6aof`, sobre la misma BD de Aiven.
- **Local:** `pnpm setup:local` instala desde cero con admin completo, datos
  ficticios y la base de horarios de la demo (`scheduling-seed.sql`).
- **Repositorio original:** `four-points-archive`, archivado y privado.
- **Decisiones:** `DECISIONS.md`, hasta ADR-047.
- **Harness:** capa 1 en `backend/AGENTS.md` y `frontend/AGENTS.md`; el
  `AGENTS.md` raíz guarda lo común y los tres niveles se enlazan entre sí
  (ADR-042, ADR-043). La sesión se abre en la raíz y activa el Node de cada lado
  antes de cada comando (ADR-044). CI comprueba el formato de todo el Markdown
  versionado.
- **Revisión de OpenCode, cerrada el 2026-10-12:** sus 20 ramas `opencode/*`
  están fusionadas en esta rama (PR #7–#26) y probadas en preview; las
  migraciones `20261011_keep_group_history_on_delete.sql` y
  `20261012_unique_invoice_supplier_number.sql`, aplicadas en Aiven. En `main`
  desde el PR #28.
- **`main` al día con la rama** desde el PR #31 (2026-10-14, merge `4c4567a`),
  comprobado en preview y producción:
  - PR #30: las tareas programadas se ponen al día al arrancar y el pago
    automático del día 10 funciona (ADR-046); los errores de `auth` y de los
    middlewares llevan `code`; el historial de grupos solo anota lo que cambia.
  - PR #31: fechas y horas (ADR-047). El backend corre en UTC en cualquier
    máquina; «hoy» y el día de un instante se calculan en Madrid; las horas de
    parking son el reloj del hotel. Los historiales muestran fechas legibles y
    estados traducidos.
- **Rama local `opencode-tasks`** (solo en el PC principal, no se publica):
  trabajo delegado a OpenCode con una directriz cerrada (ficheros permitidos,
  tabla de cambios, verificación); se revisa, se commitea y entra en la rama de
  preview con fast-forward.

## ⚠️ Empieza por aquí

1. **El repositorio es público**, también su historial: lo que se commitee se
   publica al momento y no se puede borrar sin reescribir la historia. Nada de
   secretos, hosts o usuarios de la BD, IDs de servicios, rutas locales ni datos
   del personal o de la empresa. Push protection solo frena los secretos con
   formato conocido.
2. **Flujo:** commit en `claude/compassionate-planck-gh6aof` → push → probar en
   preview → PR a `main` con merge commit. `main` no acepta push directo.
3. **Clones nuevos:** activar los hooks una vez con
   `git config core.hooksPath .githooks` (no viene con el clon; ver
   `AGENTS.md`).
4. **Idiomas:** se trabaja en español; la documentación pública de `docs/` va en
   inglés y no cita ADR ni `TODO.md`. `DECISIONS.md`, `SESSION.md` y `TODO.md`
   siguen en español.

## Siguiente

«Después de publicar» de `TODO.md`, por prioridad:

1. **Rotar las credenciales de producción** (BD, clave JWT, Cloudinary, claves
   de IA). Ninguna de ellas está en el historial, pero sí la contraseña en claro
   de un usuario de la aplicación (`test-login.js`, commit `8595ec0`): cambiarla
   también. Se hace en los paneles y se comprueba que producción y preview
   siguen funcionando.
2. Las de prioridad media.

Los errores conocidos que se aceptan sin arreglarlos ahora están en
`docs/_archive/TODO.md` (ADR-045).

## Esperando decisión

Nada ahora mismo.

## Cuidado con esto

- **`main` está protegida** (ruleset `protect-main`): solo entra por PR, con los
  checks `backend` y `frontend` en verde y como merge commit (sin squash ni
  rebase); no admite force push ni borrado. La rama de trabajo no tiene reglas.
- **Preview y producción comparten la BD de Aiven** y las cookies de sesión: lo
  que se prueba en preview cambia datos de producción, y entrar en preview
  sustituye la sesión de producción en ese navegador.
- **Preview y producción comparten `cron_job_runs`:** el primer backend que
  arranca después de la hora de una tarea la hace por los dos (ADR-046).
- **La cuenta demo es un admin** (`users.is_demo = 1`): lo que no deba tocar se
  bloquea en la ruta con `denyDemo`/`denyDemoWrites` o en `demoRestriction`. Una
  ruta nueva que escriba fuera de lo que reinicia el mock (usuarios, catálogos,
  configuración) necesita su guarda. Si cambia la base de horarios de la demo,
  se regenera el seed local con `pnpm seed:scheduling:export`.
- **Los `AGENTS.md` de módulo** ya se corrigieron, pero no son fuente fiable: se
  contrastan siempre con el código y la BD.
- **Nada de `docs/_archive/` se publica** (git lo ignora). Si algo de ahí debe
  ser público, se copia fuera.
- **Enlaces rotos conocidos:** 3 ficheros fuera de `docs/` citan todavía
  `Global-Plan.md`, `SCHEDULING-SOLVER-PLAN.md` o `SCHEDULING-CONSTRAINTS.md`,
  ya archivados: `backend/db-mysql/MASTER_INSTALL.sql`,
  `backend/db-mysql/aiven/19_scheduling.sql` y
  `backend/db-mysql/scripts/20260512_add_scheduling_solver_runs_and_requests.sql`.
  Son SQL ya aplicados y no se tocan (ADR-021); la sección equivalente es
  `docs/scheduling/constraints.md §7.5`.
