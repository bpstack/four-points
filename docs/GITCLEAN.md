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
- **Solo dos ramas** se limpian y se publican (ADR-035): `main` y
  `claude/compassionate-planck-gh6aof`. Las otras cuatro no tienen ningún commit
  fuera de `main` (comprobado el 2026-10-05). Sin tags; las referencias
  `pull/*` de GitHub no se publican.
- **Dónde**: `C:\Users\dz\projects\four-points-phase2\`, fuera del
  repositorio. `git-filter-repo` 2.47.0 está en
  `C:\Users\dz\tools\git-filter-repo` (venv propio, 2026-10-05).

### Estado (2026-10-05)

- ✅ Paso 0: copia `four-points-backup.git` (`clone --mirror`, no se toca) y
  `four-points-backup.bundle` (10,8 MB, `git bundle verify` correcto).
- ✅ Análisis de rutas y secretos (abajo, «Candidatos conocidos»).
- ✅ Paso 1: listas aprobadas por el propietario, fuera del repositorio:
  - `paths.txt`: 20 reglas de borrado; añade
    `EmailsDistListContent.tsx`, componente antiguo con la lista de correos
    real;
  - `replacements.txt`: secretos (los valores salen de `backend/.env`, no se
    escriben a mano), correos y nombres de contactos reales, con los mismos
    sustitutos que el árbol actual;
  - `replacements-names.txt`: nombres del personal. En mayúsculas pasan a
    `EMP_01`…`EMP_11`, como el corpus del solver; en el resto, a nombres
    inventados (los mismos que el árbol desde `42f6ac0`). `Salvador Pérez`
    se queda como autor;
  - `mailmap.txt`: `Claude`, `Azyd` y `bp` pasan a `bpstack` (los tres son
    el propietario);
  - `messages.txt`: quita `Co-Authored-By: Claude…` y «Generated with Claude
    Code» de 3 mensajes de commit;
  - renombrado de ruta: la guía diaria del F&B, que llevaba en el nombre el
    de una persona, pasa a `night-audit-fb-daily.md` (`--path-rename`);
  - `strip-blobs.txt`: los 2 blobs del informe Opera real de ingresos
    (`OperaPrint-sample.pdf`, su copia en `backend/test/data/` y el `.txt`
    que genera `pdf-parse`), hallado en el barrido de OpenCode y sustituido
    en el árbol por una muestra sintética (`c50b09a`)
    (`--strip-blobs-with-ids`).
- ✅ Barrido de OpenCode (2026-10-05): no añade secretos ni rutas nuevas;
  sí el informe Opera. Su informe escribió en claro la contraseña y el host
  de Aiven (ya tapados en el fichero): otro motivo para rotarla.
- ✅ Ensayo (`--dry-run`) sobre un clon nuevo de GitHub con las dos ramas:
  0 secretos, 0 dominios y nombres reales, 0 rutas borradas, autoría
  `bpstack` (y `GitHub` en los merges web); 619 → 616 commits (3 solo
  tocaban ficheros borrados).

  Ninguna regla toca la punta de las dos ramas (comprobado). El usuario
  `demo` está desactivado en Aiven y la contraseña documentada ya no vale
  (comprobado el 2026-10-05).

- ✅ Primera ejecución real en `work.git` (2026-10-05): el historial queda
  limpio (0 secretos, nombres y datos reales en 5.651 objetos; autoría
  `bpstack` y `GitHub`), pero las puntas no son idénticas: `main` aún no
  tenía los arreglos de la rama (nombres, informe Opera) y una regla tocaba
  una línea de este documento. Se repite tras fusionar la rama en `main`.
- ✅ Rama fusionada en `main` (PR #9, `2d1005a`).
- ✅ Ejecución definitiva en `work.git` (clon nuevo de GitHub, 2026-10-05),
  auditada:
  - 0 secretos, 0 dominios y nombres reales, 0 restos del informe Opera en
    los 5.656 objetos (blobs y commits); las 16 menciones a
    `Co-Authored-By: Claude` son las de `AGENTS.md` y este documento, que
    describen la regla, no marcas en commits;
  - autoría: solo `bpstack` y `GitHub` (merges desde la web);
  - solo las dos ramas, sin tags ni remoto; 9,4 MB;
  - **árbol de la punta idéntico** al de GitHub en las dos ramas (`main`
    624 → 621 commits; la rama 622 → 619), así que los tests son los mismos
    que pasaron en CI con la PR #9.
- ⏳ Publicación
  final y publicación (ADR-035).

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
  (commits `f3d9898`, `d04504f` y `8109e5e`).
- **Scripts con la contraseña de Aiven**, quitados del árbol el 2026-10-04:
  `backend/db-mysql/scripts/basics/` (10), `add-libre-number.ts`,
  `backfill-libre-numbers.ts`, `set-holidays-2026.ts` y `backup-aiven.sh`.
- **Importador del Excel de horarios** con 13 nombres del personal:
  `backend/scripts/import-planning-2026.ts` (quitado del árbol el 2026-10-04).
- **Alta de una persona real**:
  `backend/db-mysql/scripts/20260520_insert_user_*.sql` (quitado del árbol
  el 2026-10-04).
- **Excel con datos del personal**: `docs/checklists/PLANNING 2026.xlsx` y
  el Excel de presencias del personal en `docs/frontend/schedule/`.
- **Peticiones de prueba**: los 18 ficheros de `backend/API REST/` (quitados
  del árbol el 2026-10-04): llevan 12 contraseñas, 24 tokens JWT y nombres de
  usuario. Los tokens están firmados con `SECRET_JWT_KEY`: otro motivo para
  rotarla.
- **Documentación antigua** con nombres del personal:
  `SCHEDULING-CONSTRAINTS.md` y `SCHEDULING-DECISIONS-LOG.md` (raíz, hasta el
  2026-09-28).
- **Encontrados en el análisis del 2026-10-04** (rutas antiguas, ya fuera del
  árbol):
  - `API REST/` en la raíz (estructura anterior a `backend/`);
  - `PLANNING 2026.xlsx` en la raíz y toda la carpeta `z.schedule-docs/`
    (Excel y CSV de horarios y presencias del personal);
  - `aiven-conexion.md`, en sus tres ubicaciones
    (`db-mysql/mysql-Aiven/`, `backend/db-mysql/mysql-Aiven/` y
    `backend/db-mysql/aiven/`): datos de conexión con la contraseña de Aiven.

### 2. Reemplazar contenido (ficheros legítimos)

- **Contraseña de la BD local** en `backup-local.sh`, `check-collation.sh` y
  `recreate-local.sh` (leen `backend/.env` desde el 2026-10-04).
- **Host, usuario y contraseñas de Aiven** en `backend/.env.example` (hasta el
  2026-10-02).
- **Nombres reales del personal** en comentarios de `aiven/19_scheduling.sql`
  y `scripts/20251224_add_scheduling.sql` (anonimizados en el árbol el
  2026-10-04) y lo que quede según `TODO.md`.
- **Correos reales de personas y empresas** en
  `frontend/content/checklist/references/emails-dist-list.md` (lista de
  distribución del night audit: dirección del hotel, empresa gestora y un
  auditor, con nombres) y sus códigos en las guías del checklist;
  sustituidos por contactos de ejemplo en el árbol el 2026-10-04.
- **Secretos encontrados en el análisis del 2026-10-04** (recuento de valores
  distintos en todo el historial, sin abrir ninguno):
  - 2 contraseñas de Aiven (`AVNS_…`) en 17 rutas. **Una es la que se usa
    hoy** (39 apariciones): rotarla es obligatorio;
  - 1 clave de Anthropic (`sk-ant-…`) en `backend/.env.example`; no es la de
    `backend/.env` actual y el propietario confirma que está revocada
    (2026-10-05);
  - valores de `CLOUDINARY_API_SECRET` (`backend.md`, `backend/.env.example`)
    y de `SECRET_JWT_KEY` (8 valores en 11 rutas, casi todos marcadores de
    ejemplo); ninguno coincide con los de `backend/.env` actual;
  - 9 tokens JWT distintos en 20 rutas;
  - ninguna clave privada, ni de OpenAI, Google, Resend o GitHub, y ningún
    `.env` real versionado nunca.
- En el análisis se busca cada valor en **todo** el historial (`git log -S`),
  no solo en estos ficheros: el reemplazo se aplica en cualquier fichero donde
  aparezca. `git filter-repo --replace-text` acepta expresiones regulares
  (`regex:…==>***REMOVED***`), útil para los tokens JWT.

### 3. Cambiar autoría

La sección siguiente.

## Autoría que se corrige

Decidido en ADR-031 (2026-10-04). Se hace en la misma pasada de
`git-filter-repo`, con `--mailmap`; no cambia el contenido de ningún commit.

- **Obligatorio**: los 5 commits con autor `Claude <noreply@anthropic.com>`,
  todos de la rama `claude/compassionate-planck-gh6aof` (`c4719b2`, `8af5641`,
  `9c583eb`, `1d5b3ca`, `d432c30`), pasan a `bpstack <contact.bstack@gmail.com>`.
  Ninguna otra rama tiene commits de ese autor (_comprobado el 2026-10-04_).
- **A confirmar en el paso 2 (Propuesta)**: unificar también `Azyd` y `bp`, los
  dos con el mismo correo, en `bpstack`.

```text
# mailmap
bpstack <contact.bstack@gmail.com> Claude <noreply@anthropic.com>
```

En la auditoría (paso 4) se comprueba además que
`git log --all --format='%an <%ae>' | sort -u` ya no muestra `Claude`.
