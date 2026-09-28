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
| 1c   | Todo `TODO.md` resuelto y probado en producción                          | 1b         |
| 2    | Clon con el historial limpio (todas las ramas) + `docs/GITCLEAN.md`      | 1c         |
| 4    | Repositorio público nuevo con el historial limpio (todas las ramas)      | 2          |

El orden lo fija ADR-001, revisado por ADR-022 (fase 1b) y ADR-027 (fase 1c, que
además absorbe la antigua fase 3 de tareas pendientes). La fase 4 sigue ADR-006,
ya aceptada.

---

## Fase 1 — Documentación nueva ✅ cerrada (2026-09-28)

Los 12 módulos documentados y revisados con `security` L3, más el `README.md` de
la raíz (ADR-008). Detalle en `docs/_archive/roadmap-history.md` (local).

## Fase 1b — Rescate del archivo ✅ cerrada (2026-09-28)

Lo trascendental de `docs/_archive/` rescatado a `docs/` y `TODO.md`, comprobado
contra el código; `TODO-old.md` vaciado y borrado. Detalle en
`docs/_archive/roadmap-history.md` (local).

## Fase 1c — Resolver `TODO.md` y probarlo en producción ← **actual**

Todo `TODO.md`, de 🔴 a 🟢, arreglado y probado en producción (Render, Vercel y
Aiven) antes de tocar el historial (ADR-027). Cada punto se borra de `TODO.md`
cuando está hecho y probado.

- **Orden:** primero los fallos transversales de autenticación (quién puede
  hacerse `admin`, tokens intercambiables, usuario desactivado, refresco que no
  mira la BD…), que afectan a todo; después, módulo a módulo, de 🔴 a 🟢.
- **Flujo:** por lotes (un tema o un módulo) en `main`. El agente arregla,
  verifica en local y commitea; el propietario hace push cuando quiere probarlo
  en producción y cuenta el resultado.
- Hecho al empezar: los 4 volcados de BD fuera del árbol (`git rm --cached` +
  `.gitignore`); del historial se quitan en la fase 2.

## Fase 2 — Limpieza del historial

Análisis, propuesta, limpieza con `git-filter-repo` y auditoría, sobre un clon y
sin push, **en todas las ramas** (ADR-026). La lista de privados la aprueba el
propietario (ADR-005). Hallazgo previo: volcados de BD en
`backend/db-mysql/backup/` (ver `SESSION.md`).

## Fase 4 — Publicación

Crear el repositorio público y subir el historial limpio de todas las ramas
(ADR-026). Rotar las credenciales que aparezcan en lo eliminado (ADR-007).
