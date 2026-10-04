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

- Solo se hacen **tres operaciones**, cada una sobre una lista aprobada
  (ADR-034):
  1. **Eliminar** del historial ficheros o directorios enteramente privados
     (`--invert-paths --path …`).
  2. **Reemplazar contenido** en ficheros legítimos que llevaron credenciales o
     datos privados escritos (`--replace-text`): cada valor se cambia por
     `***REMOVED***` o por un sustituto neutro, y el fichero se conserva.
  3. **Cambiar autoría** para unificar la identidad o quitar rastros de IA
     (`--mailmap`), sin tocar el contenido.

  Nada más se modifica ni se borra.
- Se hace **poco a poco**: cada operación se prueba en el clon y se audita antes
  de la siguiente. Los valores a reemplazar se guardan en un fichero fuera del
  repositorio (no se versiona) y se borra al terminar.
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

Lista de partida para el análisis, comprobada el 2026-09-28 y ampliada el
2026-10-04. **Los volcados no se han abierto**; la lista final la aprueba el
propietario.

### 1. Eliminar (ficheros enteramente privados)

- **Volcados de BD**: `backend/db-mysql/backup/backup_hotel_db_*.sql` (cuatro;
  versionados hasta el 2026-10-04, aunque `.gitignore` ya los ignoraba) y los
  ya borrados `backup_hotel_db-aiven.sql` y `backup_hotel_db-local.sql`
  (commits `dad3cdc`, `f5d47d6` y `7ac45e7`).
- **Scripts con la contraseña de Aiven**, quitados del árbol el 2026-10-04:
  `backend/db-mysql/scripts/basics/` (10), `add-libre-number.ts`,
  `backfill-libre-numbers.ts`, `set-holidays-2026.ts` y `backup-aiven.sh`.
- **Importador del Excel de horarios** con 13 nombres del personal:
  `backend/scripts/import-planning-2026.ts` (quitado del árbol el 2026-10-04).
- **Alta de una persona real**:
  `backend/db-mysql/scripts/20260520_insert_user_*.sql` (quitado del árbol
  el 2026-10-04).
- **Excel con datos del personal**: `docs/checklists/PLANNING 2026.xlsx` y
  `docs/frontend/schedule/Presencias - Marzo.xlsx`.
- **Peticiones de prueba**: los 18 ficheros de `backend/API REST/` (quitados
  del árbol el 2026-10-04): llevan 12 contraseñas, 24 tokens JWT y nombres de
  usuario. Los tokens están firmados con `SECRET_JWT_KEY`: otro motivo para
  rotarla.
- **Documentación antigua** con nombres del personal:
  `SCHEDULING-CONSTRAINTS.md` y `SCHEDULING-DECISIONS-LOG.md` (raíz, hasta el
  2026-09-28).

### 2. Reemplazar contenido (ficheros legítimos)

- **Contraseña de la BD local** en `backup-local.sh`, `check-collation.sh` y
  `recreate-local.sh` (leen `backend/.env` desde el 2026-10-04).
- **Host, usuario y contraseñas de Aiven** en `backend/.env.example` (hasta el
  2026-10-02).
- **Nombres reales del personal** en comentarios de `aiven/19_scheduling.sql`
  y `scripts/20251224_add_scheduling.sql` (anonimizados en el árbol el
  2026-10-04) y lo que quede según `TODO.md`.
- En el análisis se busca cada valor en **todo** el historial (`git log -S`),
  no solo en estos ficheros: el reemplazo se aplica en cualquier fichero donde
  aparezca.

### 3. Cambiar autoría

La sección siguiente.

## Autoría que se corrige

Decidido en ADR-031 (2026-10-04). Se hace en la misma pasada de
`git-filter-repo`, con `--mailmap`; no cambia el contenido de ningún commit.

- **Obligatorio**: los 5 commits con autor `Claude <noreply@anthropic.com>`,
  todos de la rama `claude/compassionate-planck-gh6aof` (`ec8e901`, `f9d1541`,
  `2ed0abb`, `8584e93`, `6a67ab3`), pasan a `bpstack <contact.bstack@gmail.com>`.
  Ninguna otra rama tiene commits de ese autor (_comprobado el 2026-10-04_).
- **A confirmar en el paso 2 (Propuesta)**: unificar también `Azyd` y `bp`, los
  dos con el mismo correo, en `bpstack`.

```text
# mailmap
bpstack <contact.bstack@gmail.com> Claude <noreply@anthropic.com>
```

En la auditoría (paso 4) se comprueba además que
`git log --all --format='%an <%ae>' | sort -u` ya no muestra `Claude`.
