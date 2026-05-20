# Estado de Ramas del Proyecto

> **Actualizado: 20 de Mayo de 2026**
>
> Las ramas `schedule`, `testing`, `schedule-backup` y `hotel-id` descritas en versiones anteriores de este documento **ya no existen** en el repositorio. Todo el desarrollo se integró en `main`.
>
> Las ramas activas actualmente son: `main` + feature branches puntuales bajo convención `feature/`, `chore/`.

---

## Rama `main`

**Propósito:** Rama principal. Único trunk de desarrollo y producción.

**Situación actual:** Todo el código está en `main`. No hay ramas de larga duración activas.

### Características incluidas

- Logbooks, parking, cashier, maintenance, groups, backoffice, conciliations
- Sistema de scheduling con solver CP-SAT (Python daemon + OR-Tools)
- i18n con next-intl (ES/EN)
- Autenticación JWT con HttpOnly cookies
- Frontend: Next.js 14 App Router
- Backend: Express 5.1.0 con MySQL (local + Aiven)

---

## Feature Branches Activas

Las feature branches siguen la convención `feature/<nombre>` o `chore/<nombre>` y se mergean a `main` cuando están listas.

```bash
# Ver ramas locales y remotas
git branch -a
git branch -vv

# Ver commits de una feature branch vs main
git log main..<branch> --oneline
```

---

## Flujo de Trabajo

```
main ──── feature/xxx ──→ PR / merge → main
     └─── chore/yyy  ──→ PR / merge → main
```

No hay ramas de desarrollo de larga duración. Cada feature se trabaja en su propia rama corta y se integra a `main`.

---

## Historial de Ramas Eliminadas

| Rama | Estado | Integrada en |
|------|--------|-------------|
| `schedule` | Eliminada | `main` |
| `testing` | Eliminada | `main` |
| `schedule-backup` | Eliminada | Backup histórico, código obsoleto |
| `languagesystem` | Eliminada | `main` (i18n completo) |
| `hotel-id` | No creada | Propuesta descartada (multi-tenant no implementado) |

---

## Última actualización

20 de Mayo de 2026
