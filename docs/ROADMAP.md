# ROADMAP — Four-Points (publicación como open source)

> **Qué responde:** en qué orden se hace el trabajo y por qué ese orden. ·
> **Quién lo lee:** quien abre o cierra una fase, **no en cada sesión**. ·
> **Cómo se poda:** al cerrar una fase, su detalle se reduce a un resultado y un
> puntero.

🔴 **Lo terminado sale del plan.** Una fase cerrada se queda en una o dos
líneas; su detalle pasa a `docs/_archive/roadmap-history.md` (local, ADR-009).
⚠️ Cerrar no es marcar `[x]` y dejarlo: el detalle se va.

🔴 **Solo es un roadmap porque el orden importa.** Lo que no dependa de otra
cosa va a `TODO.md`.

## Fases

| Fase | Qué produce                                                              | Depende de |
| ---- | ------------------------------------------------------------------------ | ---------- |
| 1    | `docs/` nueva por módulos, escrita desde el código; lo antiguo archivado | —          |
| 1b   | Lo trascendental de `docs/_archive/` rescatado a `docs/` o a `TODO.md`   | 1          |
| 1c   | «Antes de publicar» de `TODO.md` resuelto y probado en producción        | 1b         |
| 2    | Clon con el historial limpio (dos ramas) + `docs/GITCLEAN.md`            | 1c         |
| 4    | Repositorio público nuevo con el historial limpio (dos ramas)            | 2          |
| 5    | Demo pública en la propia web, con datos ficticios y reinicio diario     | 4          |

El orden lo fija ADR-001, revisado por ADR-022 (fase 1b) y ADR-027 (fase 1c, que
además absorbe la antigua fase 3 de tareas pendientes). ADR-033 limita la 1c a lo
que hay que resolver antes de publicar. La fase 4 sigue ADR-006, ya aceptada, y
ADR-035 deja en dos las ramas que se publican.

---

## Fase 1 — Documentación nueva ✅ cerrada (2026-09-28)

Los 12 módulos documentados y revisados con `security` L3, más el `README.md` de
la raíz (ADR-008). Detalle en `docs/_archive/roadmap-history.md` (local).

## Fase 1b — Rescate del archivo ✅ cerrada (2026-09-28)

Lo trascendental de `docs/_archive/` rescatado a `docs/` y `TODO.md`, comprobado
contra el código; `TODO-old.md` vaciado y borrado. Detalle en
`docs/_archive/roadmap-history.md` (local).

## Fase 1c — Resolver «Antes de publicar» ✅ cerrada (2026-10-05)

Las brechas de seguridad arregladas y probadas en producción antes de tocar el
historial (ADR-027, ADR-033), PR #7 a #10. Detalle en
`docs/_archive/roadmap-history.md` (local).

## Fase 2 — Limpieza del historial ✅ cerrada (2026-10-05)

Historial de `main` y `claude/compassionate-planck-gh6aof` reescrito y auditado
(ADR-035). Resultado en `GITCLEAN.md`.

## Fase 4 — Publicación ✅ cerrada (2026-10-05)

`bpstack/four-points` es público desde el 2026-10-05 (tras la PR #5,
`a40c6a4`), con secret scanning y push protection activados y sin alertas
al publicar. Vercel y Render despliegan desde él y el original está
archivado. Comprobado el 2026-10-05: ningún valor de
`backend/.env` aparece en los 662 commits de todas las ramas, salvo dos valores
públicos por defecto (el usuario `avnadmin` de Aiven y `localhost:11434` de
Ollama). La rotación de credenciales (ADR-007) no bloquea: va en «Después de
publicar» de `TODO.md`.

## Fase 5 — Demo pública ✅ cerrada (2026-10-05)

Que cualquiera pruebe la aplicación en la propia web, que es solo un escaparate
(ADR-037): un admin demo restringido que entra con un botón, datos ficticios,
generación de horarios y reinicio diario; y quien quiera verlo todo lo instala
en local con admin completo (ADR-038, ADR-039). En producción desde el
2026-10-05 (PR #3 y #4, `DEMO_MODE` en Render y Vercel), probada en preview y
en la web.
