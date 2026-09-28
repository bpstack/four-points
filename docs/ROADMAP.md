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

| Fase | Qué produce                                                                | Depende de |
| ---- | -------------------------------------------------------------------------- | ---------- |
| 1    | `docs/` nueva por módulos, escrita desde el código; lo antiguo archivado   | —          |
| 1b   | Lo trascendental de `docs/_archive/` rescatado a `docs/` o a `TODO.md`     | 1          |
| 2    | Clon con el historial limpio y auditado en local + `docs/GITCLEAN.md`      | 1, 1b      |
| 3    | Tareas pendientes repartidas en `docs/README.md`, `ROADMAP.md` y `TODO.md` | 1          |
| 4    | Repositorio público nuevo con el historial limpio                          | 2, 3       |

El orden de 1 → 2 → 3 lo fija ADR-001; la 1b se intercala antes de la 2
(ADR-022). La fase 4 depende de ADR-006, que sigue 🔶 propuesta.

---

## Fase 1 — Documentación nueva ✅ cerrada (2026-09-28)

Los 12 módulos documentados y revisados con `security` L3, más el `README.md` de
la raíz (ADR-008). Detalle en `docs/_archive/roadmap-history.md` (local).

## Fase 1b — Rescate del archivo ← **actual**

Revisar `docs/_archive/` fichero a fichero, **poco a poco y en detalle**: lo
trascendental pasa a `docs/` (simplificándolo) o a `TODO.md`; lo demás se
descarta de forma explícita. Los pendientes del `TODO.md` antiguo ya están en
`TODO-old.md`, que se vacía en esta fase. Hecho: los dos `SCHEDULING-*` de la
raíz (ADR-021).

Candidatos detectados, sin leer todavía a fondo: `SCHEDULING-SOLVER-PLAN.md`
(plan, riesgos y bucle de ajuste de pesos), `docs/backend/scheduling/`
(`solver-setup.md`: entorno Python, protocolo stdin/stdout, estados del daemon),
y la documentación de operación (`environment-variables.md`,
`productionAuthSetup.md`, `Render.md`, `security-implementation.md`,
`i18n-roadmap.md`).

## Fase 2 — Limpieza del historial

Análisis, propuesta, limpieza con `git-filter-repo` y auditoría, sobre un clon y
sin push. La lista de privados la aprueba el propietario (ADR-005). Hallazgo
previo: volcados de BD en `backend/db-mysql/backup/` (ver `SESSION.md`).

## Fase 3 — Tareas pendientes

Trasladar a `docs/` los pendientes reales (tests de `scheduling` y otros),
partiendo de las plantillas del harness. El `TODO.md` de la raíz tiene entradas
locales que no deben pasar al público.

## Fase 4 — Publicación

Crear el repositorio público y subir el historial limpio. Rotar las credenciales
que aparezcan en lo eliminado (ADR-007). Decidir qué ramas se publican.
