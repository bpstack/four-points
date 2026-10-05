# SESSION — por dónde vamos

> **Qué responde:** dónde lo dejamos y qué toca después. · **Quién lo lee:**
> quien retome el trabajo. · **Cómo se poda:** se **sobrescribe** — git guarda
> la historia (`git log -p docs/SESSION.md`).

Lo que no encaje aquí es una decisión (a `DECISIONS.md`), un hallazgo (a su
propio fichero) o ruido (se borra).

**Última actualización:** 2026-10-05

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
- **Decisiones:** `DECISIONS.md`, hasta ADR-041.

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
   de IA). Ninguna está en el historial; se hace en los paneles y se comprueba
   que producción y preview siguen funcionando.
2. **Rastro de cambios en dinero:** ingresos de F&B, pagos y recuentos de caja,
   cobros de parking.
3. Las de prioridad media, empezando por las comprobaciones cortas (versión de
   Node y cron en Render) y el pago automático del día 10, que nunca ha
   funcionado.

## Esperando decisión

Nada ahora mismo.

## Cuidado con esto

- **`main` está protegida** (ruleset `protect-main`): solo entra por PR, con
  los checks `backend` y `frontend` en verde y como merge commit (sin squash ni
  rebase); no admite force push ni borrado. La rama de trabajo no tiene reglas.
- **Preview y producción comparten la BD de Aiven** y las cookies de sesión:
  lo que se prueba en preview cambia datos de producción, y entrar en preview
  sustituye la sesión de producción en ese navegador.
- **La cuenta demo es un admin** (`users.is_demo = 1`): lo que no deba tocar
  se bloquea en la ruta con `denyDemo`/`denyDemoWrites` o en
  `demoRestriction`. Una ruta nueva que escriba fuera de lo que reinicia el
  mock (usuarios, catálogos, configuración) necesita su guarda. Si cambia la
  base de horarios de la demo, se regenera el seed local con
  `pnpm seed:scheduling:export`.
- **Los `AGENTS.md` de módulo** ya se corrigieron, pero no son fuente fiable:
  se contrastan siempre con el código y la BD.
- **Nada de `docs/_archive/` se publica** (git lo ignora). Si algo de ahí debe
  ser público, se copia fuera.
- **Enlaces rotos conocidos:** 10 ficheros fuera de `docs/` citan
  `Global-Plan.md`, `SCHEDULING-SOLVER-PLAN.md` o `SCHEDULING-CONSTRAINTS.md`,
  ya archivados. Uno es `backend/db-mysql/aiven/19_scheduling.sql`, que no se
  toca (ADR-021); la sección equivalente es `docs/scheduling/constraints.md
  §7.5`. Los demás se arreglan al escribir cada módulo (ADR-010).
