# DECISIONS — por qué las cosas son como son

> **Qué responde:** por qué está así. · **Quién lo lee:** quien dude de una
> decisión, a propósito — no en cada sesión. · **Cómo se poda:** no se poda.

> **Se añade, nunca se reescribe.** Una decisión que cambia **no se edita**: se
> escribe otra nueva que la revisa, y la antigua se marca con un enlace a ella.
> Saber que algo se decidió, y por qué cambió, vale más que la versión final sola.
>
> El **porqué** vive aquí; el estado actual vive en `SESSION.md`.

---

## ADR-001 — El repositorio se prepara para publicarse en tres fases ordenadas

- **Estado:** ✅ aceptada (2026-09-28)
- **Fecha:** 2026-09-28
- **Decisión:** primero la documentación nueva, después la limpieza del
  historial de Git y, por último, la organización de las tareas pendientes.
- **Motivo:** plan del propietario en `OPEN-SOURCE.md`. La limpieza reescribe
  todos los hashes, así que los commits de documentación hechos antes se
  reescriben con ella y no se pierde nada por hacerlos primero.

## ADR-002 — La documentación antigua se archiva en local, fuera de Git

- **Estado:** ✅ aceptada (2026-09-28) · 📌 ubicación revisada por
  [ADR-009](#adr-009--todo-lo-archivado-vive-en-docs_archive-y-git-lo-ignora-entero)
- **Fecha:** 2026-09-28
- **Decisión:** la documentación actual se mueve a `_archive/` como material de
  consulta, y `_archive/` se añade a `.gitignore`.
- **Motivo:** la documentación antigua puede contener información interna del
  hotel. Si se versionara, entraría en el historial que se va a publicar y
  habría que volver a limpiarlo.
- **Rechazado:** versionar `_archive/`. Publicaría justo lo que se quiere
  revisar antes.

## ADR-003 — No toda la documentación actual se archiva

- **Estado:** ✅ aceptada (2026-09-28)
- **Fecha:** 2026-09-28
- **Decisión:**
  - **Se archiva:** la documentación de proyecto — los `.md` de la raíz
    (`Global-Plan`, `SCHEDULING-*`, `ROADMAP`, `TODO`, `README`), `docs/` y
    `frontend/docs/`.
  - **No se archivan** los `CLAUDE.md` / `AGENTS.md` (raíz y módulos): Claude
    los carga por directorio y dejaría de verlos.
  - **No se archiva** `frontend/content/checklist/` (`guides/`, `references/`):
    la aplicación lo lee en tiempo de ejecución.
  - **Se dejan como están** las docs operativas (`backend/db-mysql/INDEX.md`,
    `frontend/messages/*.md`…), hasta analizarlas más adelante.
- **Motivo:** mover ficheros que el código o las herramientas leen por ruta
  rompería la aplicación o el contexto de los agentes.

## ADR-004 — La documentación nueva se escribe desde el código

- **Estado:** ✅ aceptada (2026-09-28)
- **Fecha:** 2026-09-28
- **Decisión:** cada documento de `docs/` combina la documentación antigua de
  `_archive/` con una lectura detallada del código del módulo. Si discrepan,
  manda el código. No se documenta nada que no se haya comprobado en el código.
- **Motivo:** la documentación antigua puede estar incompleta o desactualizada
  (`OPEN-SOURCE.md`, sección 1).

## ADR-005 — Qué es privado lo decide el propietario, sobre una lista de candidatos

- **Estado:** ✅ aceptada (2026-09-28)
- **Fecha:** 2026-09-28
- **Decisión:** el agente prepara una lista de rutas candidatas a privadas a
  partir del historial completo. Solo se eliminan del historial las que el
  propietario confirme una a una.
- **Motivo:** la limpieza reescribe el historial y no tiene vuelta atrás una vez
  publicada; borrar algo no confirmado alteraría el proyecto sin necesidad.

## ADR-006 — Se publica un repositorio nuevo a partir de un clon limpio, con su historial

- **Estado:** 🔶 propuesta (2026-09-28)
- **Fecha:** 2026-09-28
- **Decisión:** la limpieza se hace sobre un clon con `git-filter-repo`, que
  conserva todos los commits, mensajes, autores y fechas, y solo quita las
  rutas privadas (los hashes cambian). Ese historial reescrito se sube a un
  repositorio nuevo y público. El repositorio actual sigue privado.
- **Motivo:** hacer público el repositorio actual exigiría `push --force` sobre
  `main`, y GitHub puede seguir sirviendo commits antiguos por su hash o desde
  las pull requests aunque ya no estén en ninguna rama.
- **Rechazado:** reescribir el repositorio actual y cambiarlo a público.

## ADR-007 — Toda credencial que aparezca en lo limpiado se rota

- **Estado:** ✅ aceptada (2026-09-28)
- **Fecha:** 2026-09-28
- **Decisión:** si alguna ruta eliminada del historial contenía credenciales o
  hashes de contraseñas, se rotan aunque la limpieza haya salido bien.
- **Motivo:** quitar un fichero del historial no invalida lo que ya se filtró:
  el repositorio lleva tiempo en GitHub y en varias máquinas.

## ADR-008 — `docs/` solo contiene lo vigente; lo terminado pasa a `docs/_archive/roadmap-history.md`

- **Estado:** ✅ aceptada (2026-09-28) · 📌 `roadmap-history.md` revisado por
  [ADR-009](#adr-009--todo-lo-archivado-vive-en-docs_archive-y-git-lo-ignora-entero)
- **Fecha:** 2026-09-28
- **Decisión:**
  - En la raíz queda un `README.md` breve que enlaza a `docs/`.
  - `README.md`, `ROADMAP.md`, `TODO.md`, `DECISIONS.md` y `SESSION.md` viven
    en `docs/`, partiendo de las plantillas de
    `c:\Users\dz\projects\harness\templates\`, y se escriben en español.
  - Lo que se va terminando sale de `docs/` y se registra en
    `docs/_archive/roadmap-history.md`.
- **Motivo:** mantener `docs/` limpio. GitHub muestra el `README.md` de la
  raíz, así que tiene que existir, pero corto.

## ADR-009 — Todo lo archivado vive en `docs/_archive/` y Git lo ignora entero

- **Estado:** ✅ aceptada (2026-09-28)
- **Fecha:** 2026-09-28
- **Decisión:** la documentación antigua y `roadmap-history.md` van a
  `docs/_archive/`, y la carpeta entera está en `.gitignore`. Revisa la
  ubicación de ADR-002 (decía `_archive/`) y el carácter de
  `roadmap-history.md` en ADR-008, que ahora también es local.
- **Motivo:** una sola carpeta de archivo, fuera de lo que se publica. El
  histórico de lo terminado sirve al trabajo diario, no al lector del
  repositorio público.
- **Rechazado:** `_archive/` en la raíz para lo antiguo y `docs/_archive/`
  versionado para `roadmap-history.md`. Eran dos carpetas de archivo con
  reglas distintas.

## ADR-010 — Cómo se archivó la documentación antigua, y qué se quedó fuera

- **Estado:** ✅ aceptada (2026-09-28)
- **Fecha:** 2026-09-28
- **Decisión:**
  - **Se movieron 52 ficheros** a `docs/_archive/`, **conservando su ruta
    original** dentro del archivo (`docs/backend/auth/x.md` →
    `docs/_archive/docs/backend/auth/x.md`), para saber siempre de dónde vino
    cada uno. Son los 5 `.md` de proyecto de la raíz (`Global-Plan`, `README`,
    `ROADMAP`, `SCHEDULING-SOLVER-PLAN`, `TODO`), los 44 de la antigua `docs/`
    y los 3 de `frontend/docs/`.
  - **Se quedan donde estaban `SCHEDULING-CONSTRAINTS.md` y
    `SCHEDULING-DECISIONS-LOG.md`**, hasta escribir la doc nueva de
    `scheduling`.
  - **Los enlaces que quedan rotos no se arreglan ahora**: `backend/README.md`
    (enlaces a `docs/backend/…`) y comentarios de código que citan
    `Global-Plan.md` o `SCHEDULING-SOLVER-PLAN.md`. Se corrigen al escribir la
    doc de cada módulo.
- **Motivo:**
  - Los dos `SCHEDULING-*` no son documentación antigua: tres `CLAUDE.md`,
    `AGENTS.md`, `backend/services/scheduling/soft-weights.ts` y los tests del
    solver citan `SCHEDULING-CONSTRAINTS.md` como fuente de verdad, y el flujo
    de trabajo manda añadir entradas a `SCHEDULING-DECISIONS-LOG.md`.
    Archivarlos dejaría a los agentes buscando ficheros que no existen.
  - Arreglar los enlaces antes de tener la doc nueva sería apuntarlos a un
    destino que todavía no existe.
- **Consecuencias que hay que recordar:**
  - **Para Git, archivar es borrar**: `docs/_archive/` está ignorado (ADR-009),
    así que el commit registra 51 borrados (el fichero 52,
    `frontend/docs/fnb/FNB-FRONTEND.md`, ya estaba ignorado). **El contenido
    sigue en el historial**: lo privado se limpia igualmente en la fase 2.
  - **Dos Excel archivados parecen datos reales del personal**
    (`docs/checklists/PLANNING 2026.xlsx` y
    `docs/frontend/schedule/Presencias - Marzo.xlsx`). No se han
    abierto. Son candidatos a privados para la fase 2.
- **Rechazado:** aplanar el archivo en una sola carpeta (se pierde el origen de
  cada fichero) y usar `git mv` (versionaría el destino, que debe ser local).

## ADR-011 — `docs/` tiene una carpeta por módulo, y cada una empieza con un solo `README.md`

- **Estado:** ✅ aceptada (2026-09-28)
- **Fecha:** 2026-09-28
- **Decisión:**
  - Cada módulo es una carpeta `docs/<modulo>/` que **empieza con un único
    `README.md`**, que responde a las seis preguntas de `OPEN-SOURCE.md`.
  - **Solo se separa otro fichero** cuando hay un subsistema con entidad propia
    (el solver de `scheduling`, la exportación PDF de `cashier`…), no por
    llegar a un número de páginas.
  - **Carpetas** (nombres en inglés): `general`, `logbook`, `parking`,
    `maintenance`, `groups`, `scheduling`, `checklist`, `cashier`, `fnb`,
    `backoffice`, `blacklist`, `conciliation`.
  - **`auth`, `notifications` y `profile` se documentan dentro de `general/`**:
    son transversales (`profile` es la pantalla de ajustes del usuario).
- **Motivo:** medición del 2026-09-28 (ficheros `.ts`/`.tsx`/`.py`/`.sql` cuyo
  nombre contiene el del módulo). `scheduling` suma ~88 ficheros y ~23 k
  líneas, con un solver en Python aparte; `backoffice`, `parking`, `cashier` y
  `groups` pasan de ~10 k líneas cada uno. Casi la mitad de los módulos
  necesitarán más de un fichero; si todos son carpeta desde el principio,
  crecer no obliga a mover nada ni rompe enlaces.
- **Rechazado:** un fichero por módulo (`docs/parking.md`). Obligaría a
  convertirlo en carpeta y cambiar sus enlaces en cuanto creciera.

## ADR-012 — Los nombres de ficheros y carpetas de `docs/` van en inglés

- **Estado:** ✅ aceptada (2026-09-28)
- **Fecha:** 2026-09-28
- **Decisión:** todo fichero y carpeta que se cree en `docs/` lleva nombre en
  inglés (`general/messages/README.md`, `roadmap-history.md`, `GITCLEAN.md`…).
  El contenido se escribe en español.
- **Motivo:** decisión del propietario, coherente con su norma general: textos
  en español; nombres de fichero, claves de configuración e identificadores en
  inglés. Así los nombres casan con los del código (`services/parking`,
  `components/groups`…) y las rutas no llevan tildes ni espacios.

## ADR-013 — La mensajería interna se documenta en `general/messages/`

- **Estado:** ✅ aceptada (2026-09-28)
- **Fecha:** 2026-09-28
- **Decisión:** la mensajería interna tiene su propia carpeta, pero **dentro de
  `general/`** (`docs/general/messages/README.md`), no al nivel de los módulos
  funcionales. `general/README.md` solo la resume y enlaza. Completa ADR-011.
- **Motivo:** es una función común a todos los roles —incluido
  `mantenimiento`— y vive dentro del perfil, no en una sección propia del menú;
  pero su tamaño (~4 k líneas entre backend y frontend, medido el 2026-09-28)
  no cabe en un párrafo de `general/`.
- **Rechazado:** una carpeta de módulo `docs/messages/` (la pondría al nivel de
  parking o caja, que son áreas del hotel) y dejarla solo como párrafo en
  `general/README.md` (se quedaría corta).

## ADR-014 — Acceso temporal del agente a `.env`, base de datos y volcados

- **Estado:** ✅ aceptada (2026-09-28)
- **Fecha:** 2026-09-28
- **Decisión:** mientras dure la preparación para publicar, el agente puede
  leer los `.env`, conectarse a las bases de datos (local y Aiven) y abrir los
  volcados de `backend/db-mysql/backup/`. Suspende, **solo para este trabajo**,
  la norma general del propietario de no leer `.env`, credenciales ni volcados
  sin permiso explícito.
- **Condiciones:**
  - Las consultas a la BD son **de solo lectura** (`SELECT`, `SHOW`,
    `DESCRIBE`) salvo orden expresa para otra cosa.
  - Los valores secretos **no se imprimen** en la salida ni se copian a ningún
    documento: se cargan en el proceso que los usa y se nombran solo por su
    clave.
  - **Todas las credenciales se rotan al terminar** (ver ADR-007 y `TODO.md`).
- **Motivo:** documentar desde el código deja preguntas que solo la BD real
  responde; el primer caso fue confirmar si existen tablas que solo cita el
  `CLAUDE.md` de logbook. El propietario asume el riesgo porque las claves se
  rotarán después.
- **Rechazado:** que el propietario ejecute cada consulta a mano. Es más lento
  y el acceso se va a revocar igualmente con la rotación.
