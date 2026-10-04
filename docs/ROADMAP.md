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
| 2    | Clon con el historial limpio (todas las ramas) + `docs/GITCLEAN.md`      | 1c         |
| 4    | Repositorio público nuevo con el historial limpio (todas las ramas)      | 2          |
| 5    | Demo pública en un entorno aparte, con datos ficticios y reinicio diario | 4          |

El orden lo fija ADR-001, revisado por ADR-022 (fase 1b) y ADR-027 (fase 1c, que
además absorbe la antigua fase 3 de tareas pendientes). ADR-033 limita la 1c a lo
que hay que resolver antes de publicar. La fase 4 sigue ADR-006, ya aceptada.

---

## Fase 1 — Documentación nueva ✅ cerrada (2026-09-28)

Los 12 módulos documentados y revisados con `security` L3, más el `README.md` de
la raíz (ADR-008). Detalle en `docs/_archive/roadmap-history.md` (local).

## Fase 1b — Rescate del archivo ✅ cerrada (2026-09-28)

Lo trascendental de `docs/_archive/` rescatado a `docs/` y `TODO.md`, comprobado
contra el código; `TODO-old.md` vaciado y borrado. Detalle en
`docs/_archive/roadmap-history.md` (local).

## Fase 1c — Resolver «Antes de publicar» y probarlo en producción ← **actual**

La sección «Antes de publicar» de `TODO.md`, de 🔴 a 🟢, arreglada y probada en
producción (Render, Vercel y Aiven) antes de tocar el historial (ADR-027,
alcance limitado por ADR-033). Cada punto se borra de `TODO.md` cuando está
hecho y probado. «Después de publicar» queda para el repositorio público.

- **Orden:** primero los fallos transversales de autenticación (hechos), después
  las brechas de cada módulo, y al final las decisiones de publicación (licencia
  y analítica). Los secretos y datos privados del repo se resuelven en la fase 2.
- **Flujo:** en la rama `claude/compassionate-planck-gh6aof` y su entorno
  preview (ADR-030). El agente arregla, verifica y commitea; el propietario hace
  push, el agente lo prueba en preview y lo anota en `VERIFY.md`. A `main` entra
  por PR con merge commit (ADR-031).
- Hecho al empezar: los 4 volcados de BD fuera del árbol (`git rm --cached` +
  `.gitignore`); del historial se quitan en la fase 2.

## Fase 2 — Limpieza del historial

Análisis, propuesta, limpieza con `git-filter-repo` y auditoría, sobre un clon y
sin push, **en todas las ramas** (ADR-026). Reglas, procedimiento y candidatos
conocidos en `GITCLEAN.md`; la lista de privados la aprueba el propietario
(ADR-005).

## Fase 4 — Publicación

Crear el repositorio público y subir el historial limpio de todas las ramas
(ADR-026). Rotar las credenciales que aparezcan en lo eliminado (ADR-007).

## Fase 5 — Demo pública

Un entorno para que cualquiera pruebe la aplicación sin tocar producción:
`demo.four-points.stackbp.es` con su propia BD (`hotel_demo` en Aiven), datos
ficticios, secretos propios, usuarios demo públicos por rol y reinicio nocturno
de la BD. Reutiliza la infraestructura del preview y el rol `demo-admin`.
Diseño y decisiones pendientes en `TODO.md`, «Demo pública» (propuesta aceptada
por el propietario el 2026-10-04).
