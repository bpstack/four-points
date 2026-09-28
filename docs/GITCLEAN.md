# GITCLEAN — limpieza del historial antes de publicar

> **Qué responde:** cómo se quita del historial de Git lo privado antes de
> publicar el repositorio. · **Quién lo lee:** quien ejecute la fase 2
> (`ROADMAP.md`). · **Cómo se poda:** al terminar la fase 2, se añade el
> resultado de la auditoría y los hashes cambiados.

Origen: sección 2 de `OPEN-SOURCE.md` (plan del propietario, hoy en
`docs/_archive/OPEN-SOURCE.md`), más lo decidido después (ADR-006, ADR-026,
ADR-027).

---

## Objetivo

Reescribir el historial de forma controlada para que los archivos y directorios
privados desaparezcan de **todos los commits, ramas y tags** que se publiquen,
conservando intacto todo lo demás.

Algunos archivos contienen información privada de la empresa que no puede
aparecer, bajo ninguna circunstancia, en el repositorio público. Como pueden
estar en commits antiguos, no basta con `.gitignore`: hay que quitarlos de todo
el historial.

## Cuándo y dónde

- **Después de la fase 1c**: con todo `TODO.md` resuelto y probado en producción
  (ADR-027).
- **Sobre un clon**, no sobre el repositorio actual, que sigue privado. El
  historial limpio se sube a un **repositorio nuevo y público** (ADR-006).
- **Todas las ramas** se limpian y se publican (ADR-026): hoy `main`,
  `chore/audit-prep-sprint-0`, `feature/ai-schedule-generator`,
  `feature/auth-hardening` y `feature/observability-pino`. Sin tags.

## Reglas

- Solo se eliminan los archivos identificados explícitamente como privados. Nada
  más se modifica ni se borra.
- El contenido del proyecto no se altera más allá de lo imprescindible.
- No se pierde ningún commit, rama, tag ni parte del historial que deba
  conservarse.
- Los archivos privados desaparecen del historial completo, no solo del estado
  actual.
- Los paths privados se añaden a `.gitignore` para que no vuelvan a colarse.
- Antes de tocar nada, se crea o se verifica una copia de seguridad del
  repositorio original.
- La reescritura se hace con `git-filter-repo`, no modificando commits a mano.
- No se hace `push --force` ni se publica nada hasta haber verificado el
  resultado.
- Toda credencial que aparezca en lo eliminado se rota (ADR-007).

## Procedimiento

1. **Análisis.** Qué ramas y tags existen, qué archivos o directorios privados
   aparecen en el historial, en qué commits y si hay copias o rutas equivalentes
   que también deban eliminarse.
2. **Propuesta.** Qué cambios exactos se van a hacer y qué partes del historial
   se verán afectadas. **No se sigue hasta que el propietario lo confirme**
   (ADR-005).
3. **Limpieza.** Con el plan aprobado, se reescribe el historial.
4. **Auditoría.** Se verifica que:
   - ningún path privado aparece en ningún commit;
   - las ramas y los tags son los esperados;
   - los archivos públicos siguen presentes;
   - no hay modificaciones ajenas a la limpieza;
   - el repositorio sigue funcionando;
   - `.gitignore` impide que los archivos privados vuelvan a incorporarse.

   Se indica también qué hashes han cambiado.

El resultado queda preparado y verificado en local, sin push: se revisa antes de
publicar.

**La prioridad absoluta es eliminar por completo la información privada del
historial sin romper ni alterar innecesariamente el resto del repositorio.**

## Candidatos conocidos

Lista de partida para el análisis, comprobada el 2026-09-28. **Ninguno se ha
abierto**; la lista final la aprueba el propietario.

- **Volcados de BD**: `backend/db-mysql/backup/backup_hotel_db_*.sql` (cuatro;
  fuera del árbol desde el 2026-09-28) y los ya borrados
  `backup_hotel_db-aiven.sql` y `backup_hotel_db-local.sql` (commits `dad3cdc`,
  `f5d47d6` y `7ac45e7`).
- **Excel con datos del personal**: `docs/checklists/PLANNING 2026.xlsx` y
  `docs/frontend/schedule/Presencias - Marzo.xlsx`.
- **Peticiones de prueba**: los 18 ficheros de `backend/API REST/`, que pueden
  llevar tokens o contraseñas.
- **Nombres reales del personal**: `20260520_insert_user_example.sql` y
  `backend/scripts/import-planning-2026.ts` (ver `TODO.md`). Si se arreglan en
  la fase 1c, en el historial siguen.
- **Documentación antigua** con nombres del personal:
  `SCHEDULING-CONSTRAINTS.md` y `SCHEDULING-DECISIONS-LOG.md` (raíz, hasta el
  2026-09-28).
