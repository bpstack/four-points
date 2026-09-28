# ROADMAP — Four-Points (publicación como open source)

> **Qué responde:** en qué orden se hace el trabajo y por qué ese orden. ·
> **Quién lo lee:** quien abre o cierra una fase, **no en cada sesión**. ·
> **Cómo se poda:** al cerrar una fase, su detalle se reduce a un resultado y
> un puntero.

🔴 **Lo terminado sale del plan.** Una fase cerrada se queda en una o dos
líneas; su detalle pasa a `docs/_archive/roadmap-history.md` (local, ADR-009).
⚠️ Cerrar no es marcar `[x]` y dejarlo: el detalle se va.

🔴 **Solo es un roadmap porque el orden importa.** Lo que no dependa de otra
cosa va a `TODO.md`.

## Fases

| Fase | Qué produce                                                                | Depende de |
| ---- | -------------------------------------------------------------------------- | ---------- |
| 1    | `docs/` nueva por módulos, escrita desde el código; lo antiguo archivado   | —          |
| 2    | Clon con el historial limpio y auditado en local + `docs/GITCLEAN.md`      | 1          |
| 3    | Tareas pendientes repartidas en `docs/README.md`, `ROADMAP.md` y `TODO.md` | 1          |
| 4    | Repositorio público nuevo con el historial limpio                          | 2, 3       |

El orden de 1 → 2 → 3 lo fija ADR-001. La fase 4 depende de ADR-006, que sigue
🔶 propuesta.

---

## Fase 1 — Documentación nueva ← **actual**

Criterios: ADR-004 (manda el código) y ADR-011 (una carpeta por módulo, que
empieza con un `README.md`). La documentación antigua está en `docs/_archive/`
(ADR-010). Cada módulo responde a las seis preguntas de `OPEN-SOURCE.md`: qué
problema resuelve, quién lo usa, qué puede hacer, qué datos maneja, qué reglas
cumple y cómo viaja la información.

- [ ] **Una carpeta por módulo** — _`logbook`, `parking`, `maintenance`,
      `groups`, `scheduling`, `checklist`, `cashier`, `fnb`, `backoffice`,
      `blacklist`, `conciliation`_.
- [ ] **`README.md` de la raíz breve, que enlaza a `docs/`** — _al final, cuando
      exista lo que enlaza (ADR-008)_.

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
