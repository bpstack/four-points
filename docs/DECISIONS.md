# DECISIONS — por qué las cosas son como son

> **Qué responde:** por qué está así. · **Quién lo lee:** quien dude de una
> decisión, a propósito — no en cada sesión. · **Cómo se poda:** no se poda.

> **Se añade, nunca se reescribe.** Una decisión que cambia **no se edita**: se
> escribe otra nueva que la revisa, y la antigua se marca con un enlace a ella.
> Saber que algo se decidió, y por qué cambió, vale más que la versión final
> sola.
>
> El **porqué** vive aquí; el estado actual vive en `SESSION.md`.

---

## ADR-001 — El repositorio se prepara para publicarse en tres fases ordenadas

- **Estado:** ✅ aceptada (2026-09-28) · 📌 orden revisado por
  [ADR-027](#adr-027--antes-del-clon-limpio-se-resuelve-todo-todomd-y-se-prueba-en-producción)
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

- **Estado:** ✅ aceptada (2026-09-28, por el propietario; ver
  [ADR-027](#adr-027--antes-del-clon-limpio-se-resuelve-todo-todomd-y-se-prueba-en-producción))
- **Fecha:** 2026-09-28
- **Decisión:** la limpieza se hace sobre un clon con `git-filter-repo`, que
  conserva todos los commits, mensajes, autores y fechas, y solo quita las rutas
  privadas (los hashes cambian). Ese historial reescrito se sube a un
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
  · 📌 idioma revisado por
  [ADR-019](#adr-019--la-documentación-de-docs-se-escribe-en-inglés)
- **Fecha:** 2026-09-28
- **Decisión:**
  - En la raíz queda un `README.md` breve que enlaza a `docs/`.
  - `README.md`, `ROADMAP.md`, `TODO.md`, `DECISIONS.md` y `SESSION.md` viven en
    `docs/`, partiendo de las plantillas de
    `c:\Users\dz\projects\harness\templates\`, y se escriben en español.
  - Lo que se va terminando sale de `docs/` y se registra en
    `docs/_archive/roadmap-history.md`.
- **Motivo:** mantener `docs/` limpio. GitHub muestra el `README.md` de la raíz,
  así que tiene que existir, pero corto.

## ADR-009 — Todo lo archivado vive en `docs/_archive/` y Git lo ignora entero

- **Estado:** ✅ aceptada (2026-09-28)
- **Fecha:** 2026-09-28
- **Decisión:** la documentación antigua y `roadmap-history.md` van a
  `docs/_archive/`, y la carpeta entera está en `.gitignore`. Revisa la
  ubicación de ADR-002 (decía `_archive/`) y el carácter de `roadmap-history.md`
  en ADR-008, que ahora también es local.
- **Motivo:** una sola carpeta de archivo, fuera de lo que se publica. El
  histórico de lo terminado sirve al trabajo diario, no al lector del
  repositorio público.
- **Rechazado:** `_archive/` en la raíz para lo antiguo y `docs/_archive/`
  versionado para `roadmap-history.md`. Eran dos carpetas de archivo con reglas
  distintas.

## ADR-010 — Cómo se archivó la documentación antigua, y qué se quedó fuera

- **Estado:** ✅ aceptada (2026-09-28) · 📌 los dos `SCHEDULING-*` revisados por
  [ADR-021](#adr-021--los-dos-scheduling--de-la-raíz-pasan-a-docsscheduling-en-inglés)
- **Fecha:** 2026-09-28
- **Decisión:**
  - **Se movieron 52 ficheros** a `docs/_archive/`, **conservando su ruta
    original** dentro del archivo (`docs/backend/auth/x.md` →
    `docs/_archive/docs/backend/auth/x.md`), para saber siempre de dónde vino
    cada uno. Son los 5 `.md` de proyecto de la raíz (`Global-Plan`, `README`,
    `ROADMAP`, `SCHEDULING-SOLVER-PLAN`, `TODO`), los 44 de la antigua `docs/` y
    los 3 de `frontend/docs/`.
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
    (el solver de `scheduling`, la exportación PDF de `cashier`…), no por llegar
    a un número de páginas.
  - **Carpetas** (nombres en inglés): `general`, `logbook`, `parking`,
    `maintenance`, `groups`, `scheduling`, `checklist`, `cashier`, `fnb`,
    `backoffice`, `blacklist`, `conciliation`.
  - **`auth`, `notifications` y `profile` se documentan dentro de `general/`**:
    son transversales (`profile` es la pantalla de ajustes del usuario).
- **Motivo:** medición del 2026-09-28 (ficheros `.ts`/`.tsx`/`.py`/`.sql` cuyo
  nombre contiene el del módulo). `scheduling` suma ~88 ficheros y ~23 k líneas,
  con un solver en Python aparte; `backoffice`, `parking`, `cashier` y `groups`
  pasan de ~10 k líneas cada uno. Casi la mitad de los módulos necesitarán más
  de un fichero; si todos son carpeta desde el principio, crecer no obliga a
  mover nada ni rompe enlaces.
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
- **Motivo:** es una función común a todos los roles —incluido `mantenimiento`—
  y vive dentro del perfil, no en una sección propia del menú; pero su tamaño
  (~4 k líneas entre backend y frontend, medido el 2026-09-28) no cabe en un
  párrafo de `general/`.
- **Rechazado:** una carpeta de módulo `docs/messages/` (la pondría al nivel de
  parking o caja, que son áreas del hotel) y dejarla solo como párrafo en
  `general/README.md` (se quedaría corta).

## ADR-014 — Acceso temporal del agente a `.env`, base de datos y volcados

- **Estado:** ✅ aceptada (2026-09-28)
- **Fecha:** 2026-09-28
- **Decisión:** mientras dure la preparación para publicar, el agente puede leer
  los `.env`, conectarse a las bases de datos (local y Aiven) y abrir los
  volcados de `backend/db-mysql/backup/`. Suspende, **solo para este trabajo**,
  la norma general del propietario de no leer `.env`, credenciales ni volcados
  sin permiso explícito.
- **Condiciones:**
  - Las consultas a la BD son **de solo lectura** (`SELECT`, `SHOW`, `DESCRIBE`)
    salvo orden expresa para otra cosa.
  - Los valores secretos **no se imprimen** en la salida ni se copian a ningún
    documento: se cargan en el proceso que los usa y se nombran solo por su
    clave.
  - **Todas las credenciales se rotan al terminar** (ver ADR-007 y `TODO.md`).
- **Motivo:** documentar desde el código deja preguntas que solo la BD real
  responde; el primer caso fue confirmar si existen tablas que solo cita el
  `CLAUDE.md` de logbook. El propietario asume el riesgo porque las claves se
  rotarán después.
- **Rechazado:** que el propietario ejecute cada consulta a mano. Es más lento y
  el acceso se va a revocar igualmente con la rotación.

## ADR-015 — Una sola base de datos: Aiven, con datos de prueba

- **Estado:** ✅ aceptada (2026-09-28)
- **Fecha:** 2026-09-28
- **Decisión:** el proyecto trabaja contra **una única BD, la de Aiven**, que
  solo contiene datos de ejemplo. No se mantiene una BD local de desarrollo ni
  se documenta como parte del proyecto; lo que describa la BD local se trata
  como historia.
- **Motivo:** decisión del propietario: Aiven es un entorno de prueba en
  producción y perder sus datos no tiene consecuencias. Mantener dos bases no
  aporta: la comparación del 2026-09-28 mostró que ya habían divergido (una
  tabla, dos columnas, 7 claves foráneas y un trigger distintos), y analizar y
  documentar contra una sola simplifica el trabajo.
- **Rechazado:** una BD de desarrollo reproducible desde los scripts del repo.
  Protege datos que aquí no hay que proteger.
- **Pendiente:** el código sigue soportando la BD local (`DB_ENVIRONMENT`,
  `pnpm dev:local`, variables `LOCAL_DB_*`); quitarlo es una tarea de `TODO.md`.
  Si algún día Aiven guarda datos reales, esta decisión se revisa.

## ADR-016 — La BD se documenta en `general/database/`; `backend/db-mysql/` sigue como fuente

- **Estado:** ✅ aceptada (2026-09-28)
- **Fecha:** 2026-09-28
- **Decisión:** se crea `docs/general/database/README.md`, que resume la BD
  contrastándola con Aiven. `backend/db-mysql/` (scripts y sus cinco `.md`) **se
  queda tal como está** y sigue siendo la fuente de verdad del esquema y de las
  migraciones; la doc nueva la resume y enlaza, y evoluciona poco a poco con
  ella. Completa ADR-011 y ADR-013.
- **Motivo:** los cinco documentos de `backend/db-mysql/` (744 líneas) se
  solapan, pero son los que acompañan a los scripts y a la política de
  migraciones; moverlos rompería esa relación.
- **Rechazado:** archivar esos documentos y sustituirlos por la doc nueva.

## ADR-017 — El nivel de seguridad objetivo es L3 (OWASP ASVS 5.0)

- **Estado:** ✅ aceptada (2026-09-28)
- **Fecha:** 2026-09-28
- **Decisión:** el proyecto se revisa contra el **nivel L3** de OWASP ASVS 5.0.
  Es el **objetivo**, no el estado actual: los hallazgos de seguridad de
  `TODO.md` se miden contra él. El agente `security` del harness usa L3 al
  revisar cualquier parte del código.
- **Motivo:** decisión del propietario, porque es el objetivo principal del
  proyecto. Las señales del harness (login, datos personales, backend propio)
  darían L2 por sí solas; L3 solo lo puede declarar el propietario, y lo declara
  aquí.
- **Consecuencias:**
  - Las revisiones de seguridad citan requisitos versionados de ASVS L3,
    copiados de `~/.claude/reference/security/`, y señalan también riesgos
    mitigados cuando un solo fallo lo comprometería todo.
  - El nivel se declara también en el `AGENTS.md` raíz, sección `## Security`,
    que es donde lo lee el agente.
  - Implantar el harness en este repo (capa 1 de `AGENTS.md`) queda para después
    y requiere adaptarlo: ver `TODO.md`.
- **Rechazado:** implantar el harness antes de seguir. `init-project` detecta el
  gestor de paquetes por el `package.json` o el lockfile de la raíz, que aquí no
  existen, y su migración de `CLAUDE.md` solo contempla un par por directorio,
  no 17 repartidos. Adaptarlo es trabajo en otro repositorio y pararía la
  preparación para publicar.

## ADR-018 — Cada módulo documentado pasa una revisión de seguridad L3

- **Estado:** ✅ aceptada (2026-09-28)
- **Fecha:** 2026-09-28
- **Decisión:** al terminar la documentación de un módulo, el agente `security`
  del harness lo revisa en modo solo lectura con nivel L3 (ADR-017). Se le pasan
  los hallazgos ya conocidos para que distinga los nuevos. El agente principal
  comprueba en el código los hallazgos graves antes de pasarlos a `TODO.md`; los
  demás se anotan como «según la revisión», sin darlos por comprobados. Estamos
  documentando: **no se arregla nada** en esta fase.
- **Motivo:** la primera ronda (general, mensajería, logbook y parking, el
  2026-09-28) encontró fallos que la lectura para documentar no había visto,
  entre ellos que cualquier usuario podía hacerse `admin`. También corrigió un
  dato del documento de parking.
- **Rechazado:** dejar la revisión para el final. Un hallazgo puede cambiar lo
  que el documento del módulo dice que hace.

## ADR-019 — La documentación de `docs/` se escribe en inglés

- **Estado:** ✅ aceptada (2026-09-28) · 📌 alcance revisado por
  [ADR-020](#adr-020--solo-la-documentación-pública-va-en-inglés-los-ficheros-de-trabajo-en-español-y-fuera-del-repo-público)
- **Fecha:** 2026-09-28
- **Decisión:**
  - Todo lo que se publica en `docs/` pasa a **inglés**: los documentos de
    módulo, `DECISIONS.md`, `ROADMAP.md`, `TODO.md` y `SESSION.md`.
  - Los documentos ya escritos (general, mensajería, base de datos, logbook,
    parking y maintenance) los traduce el propietario con otra IA y el agente
    revisa que la traducción no cambie ningún dato. Los módulos siguientes se
    escriben directamente en inglés.
  - El historial local de `docs/_archive/` puede quedarse en español.
  - Es una **excepción, solo para `docs/`**, a la norma general del propietario
    («textos en español; nombres de fichero, claves e identificadores en
    inglés»). Las conversaciones con el agente siguen en español.
- **Motivo:** el objetivo es un repositorio open source real, cuyo público lee
  inglés. El código, los nombres de fichero (ADR-012), los commits y los
  `AGENTS.md` ya están en inglés; `docs/` era la única pieza en español.
  Traducir con 6 documentos escritos cuesta menos que hacerlo al final.
- **Rechazado:**
  - Mantener `docs/` en español: limita el público del proyecto publicado.
  - Documentación bilingüe: duplica el mantenimiento y las dos versiones acaban
    desincronizándose.
- **Revisa:** ADR-008 en el idioma de `README.md`, `ROADMAP.md`, `TODO.md`,
  `DECISIONS.md` y `SESSION.md`, que allí se fijaba en español.

## ADR-020 — Solo la documentación pública va en inglés; los ficheros de trabajo, en español y fuera del repo público

- **Estado:** ✅ aceptada (2026-09-28) · 📌 publicación revisada por
  [ADR-026](#adr-026--se-publica-todo-ficheros-de-trabajo-todas-las-ramas-y-los-agentsmd)
- **Fecha:** 2026-09-28
- **Decisión:**
  - **Documentación pública** (la que irá al repositorio open source): en
    **inglés**. Hoy son los `README.md` de `docs/general/` (con `messages/` y
    `database/`), `docs/logbook/`, `docs/parking/` y `docs/maintenance/`, más
    los módulos que falten y el `README.md` de la raíz.
  - **Ficheros de trabajo** (`DECISIONS.md`, `ROADMAP.md`, `SESSION.md` y
    `TODO.md`): siguen en **español** y **no se publican**.
  - Se trabaja en español; la documentación oficial se escribe en inglés.
  - La documentación pública **no cita** ADR, `TODO.md` ni otros ficheros de
    trabajo: para un lector del repositorio público serían referencias a nada.
- **Motivo:** decisión del propietario. Esos cuatro ficheros son herramientas
  internas del trabajo —y `TODO.md` describe debilidades de seguridad que no
  deben publicarse—, así que traducirlos no aporta.
- **Revisa:** ADR-019, que incluía esos cuatro ficheros en la traducción.
- **Pendiente:** decidir cómo quedan fuera del repositorio público: hoy están
  versionados en `docs/`, así que habrá que sacarlos del historial que se
  publique (fase 2) o moverlos a otro sitio.

## ADR-021 — Los dos `SCHEDULING-*` de la raíz pasan a `docs/scheduling/`, en inglés

- **Estado:** ✅ aceptada (2026-09-28)
- **Fecha:** 2026-09-28
- **Decisión:**
  - `SCHEDULING-CONSTRAINTS.md` → `docs/scheduling/constraints.md` y
    `SCHEDULING-DECISIONS-LOG.md` → `docs/scheduling/decisions.md`, **traducidos
    al inglés**: son documentación pública (ADR-020).
  - **Los originales en español se archivan** en `docs/_archive/` con su ruta
    original (`docs/_archive/SCHEDULING-CONSTRAINTS.md` y
    `docs/_archive/SCHEDULING-DECISIONS-LOG.md`), como el resto del archivo
    (ADR-010), y salen del repositorio.
  - **Los nombres del personal se sustituyen por roles** («management employee»,
    «a rotating employee»). Las secciones y los identificadores de reglas
    (§1–§10, H1–H8, S1–S14) se conservan, para que las referencias del código
    sigan valiendo.
  - `constraints.md` sigue siendo la **fuente de verdad** de las reglas. Lo que
    el solver implementa de verdad (sus ficheros y sus cuatro pesos) pasa a su
    §11, y `solver.md` y el `README.md` del módulo solo resumen y enlazan: se
    quita la duplicación.
  - Lo que se comprobó desfasado frente al código se marca ⚠️ sin borrar lo
    anterior (H2, H6/S12, H5 y los pesos).
  - En `decisions.md`, la primera entrada (una conversación pegada tal cual) se
    condensa a su razonamiento; el resto se traduce como estaba.
  - Se actualizan las referencias en los `AGENTS.md`, el código, los tests, el
    `backend/README.md` y los scripts de `backend/db-mysql/scripts/`.
    **`backend/db-mysql/aiven/19_scheduling.sql` no se toca**: es uno de los
    scripts de instalación ya aplicados en producción, que no se modifican, y su
    comentario queda apuntando al nombre antiguo.
- **Motivo:** ADR-010 los dejó en la raíz «hasta escribir la doc nueva de
  `scheduling`», y esa doc ya está escrita. Decisión del propietario.
- **Revisa:** ADR-010 en lo que dejaba los dos ficheros en la raíz.

## ADR-022 — El archivo se rescata poco a poco antes de la fase 2; los pendientes antiguos, a `TODO-old.md`

- **Estado:** ✅ aceptada (2026-09-28)
- **Fecha:** 2026-09-28
- **Decisión:**
  - Antes de la fase 2 se hace una **pasada de rescate de `docs/_archive/`**,
    poco a poco y en detalle: de cada fichero se decide si algo pasa a la
    documentación (simplificándolo), a `TODO.md` o se descarta.
  - Los pendientes del `TODO.md` antiguo de la raíz se traen **todos** a
    `docs/TODO-old.md`, un quinto fichero de trabajo (en español, no se
    publica). Se vacía moviendo o borrando sus puntos, y se borra al quedar
    vacío.
  - `docs/_archive/` sigue solo en el PC principal: el propietario puede
    consultarlo desde los otros equipos.
- **Motivo:** escribir la documentación desde el código (ADR-004) dejó fuera el
  «porqué» y el «qué falta» que vivían en la documentación antigua: los
  pendientes de Sentry, Cloudflare Access, el horizonte 2 de seguridad,
  checklist y la fase 3 del solver no estaban en ningún fichero vigente.
- **Revisa:** ADR-020 en la lista de ficheros de trabajo, que eran cuatro.

## ADR-023 — El servidor no guarda sesiones: no hay revocación de tokens

- **Estado:** ✅ aceptada (2026-05-15, recuperada del plan archivado el
  2026-09-28)
- **Fecha:** 2026-05-15
- **Decisión:** no se crea una tabla de `refresh_tokens` ni se rotan o revocan
  tokens en el servidor. Para cerrar todas las sesiones a la vez se cambia
  `SECRET_JWT_KEY` en Render (lo documenta `docs/general/README.md`).
- **Motivo:** las cookies son `HttpOnly`, así que un XSS no las lee; perder un
  portátil o una fuga se cubren rotando la clave, que desconecta a menos de 30
  usuarios. La tabla exigía migración, cambios en login, renovación, logout y
  contraseña, y un despliegue que podía romper las sesiones activas. Coste alto
  para un riesgo residual bajo.
- **Alcance:** no cubre que la renovación vuelva a leer el usuario en la BD
  (rol, activo o borrado). Eso sigue siendo un fallo en `TODO.md` y se arregla
  sin tabla.
- **Reabrir si:** pasa de 50 usuarios, se abre a tráfico público o entra en un
  marco regulado (PCI, ePrivacy estricta…).
- **Origen:** `docs/_archive/Global-Plan.md`, decisión D-3 y §0.2.

## ADR-024 — El demo público queda deshabilitado, sin borrar su código

- **Estado:** ✅ aceptada (2026-05-12, recuperada del plan archivado el
  2026-09-28)
- **Fecha:** 2026-05-12
- **Decisión:** el usuario `demo` se desactiva (`is_active = 0`, script
  `backend/db-mysql/scripts/20260512_disable_demo_user.sql`) y su alta queda
  comentada en `MASTER_INSTALL.sql`. El rol `demo-admin` y el middleware
  `demoRestriction` siguen en el código.
- **Motivo:** sin multi-tenancy, el demo y los datos reales comparten las mismas
  tablas. Conservar el código permite reabrirlo si se separan los datos.
- ✅ Comprobado en Aiven el 2026-09-29 (API como `admin`): ningún usuario activo
  con rol `demo-admin` ni con «demo» en el nombre.
- **Origen:** `docs/_archive/Global-Plan.md`, decisión D-1 y §5.

## ADR-025 — Sin multi-tenancy ni `render.yaml` hasta que haga falta

- **Estado:** ✅ aceptada (2026-05-15, recuperada del plan archivado el
  2026-09-28)
- **Fecha:** 2026-05-15
- **Decisión:**
  - **Multi-tenancy diferida**: un solo hotel. Algunas tablas ya llevan
    `hotel_id` fijo a 1 (checklist).
  - **Sin Blueprint de Render (`render.yaml`)**: la configuración de despliegue
    vive en los paneles de Render y Vercel.
- **Motivo:** con un servicio, un entorno y un cliente, las dos cosas son
  ceremonia. El precio aceptado es que la configuración de despliegue no está en
  el repositorio.
- **Reabrir si:** llega un segundo hotel o cliente externo (multi-tenancy), o un
  segundo entorno o servicio (`render.yaml`).
- **Origen:** `docs/_archive/Global-Plan.md`, decisiones D-4 y H1-16.5.

## ADR-026 — Se publica todo: ficheros de trabajo, todas las ramas y los `AGENTS.md`

- **Estado:** ✅ aceptada (2026-09-28)
- **Fecha:** 2026-09-28
- **Decisión:**
  - **Los cuatro ficheros de trabajo** (`DECISIONS.md`, `ROADMAP.md`,
    `SESSION.md`, `TODO.md`) **se quedan en el repositorio público**, en
    español, mientras se siga trabajando.
  - **Se publican todas las ramas**, no solo `main`. La limpieza del historial
    (fase 2) repasa todas buscando información sensible.
  - **Se publican los `AGENTS.md` y `CLAUDE.md`**, sin cambios de fondo.
  - Sigue en pie: nada de `docs/_archive/` se publica (ADR-009), y la
    documentación pública no cita ADR ni `TODO.md` (ADR-020).
- **Motivo:** decisión del propietario. Son temporales y no hace falta
  esconderlos. El riesgo de publicar `TODO.md` —describe fallos de seguridad—
  desaparece porque se publica cuando ya estén resueltos (ADR-027).
- **Revisa:** ADR-020 en que los ficheros de trabajo «no se publican» y en su
  pendiente de cómo sacarlos del repositorio público.

## ADR-027 — Antes del clon limpio se resuelve todo `TODO.md` y se prueba en producción

- **Estado:** ✅ aceptada (2026-09-28)
- **Fecha:** 2026-09-28
- **Decisión:**
  - Se hace **todo `TODO.md`** y se prueba en producción **antes** de limpiar el
    historial. Es una fase nueva, la **1c**, entre la 1b y la 2.
  - **ADR-006 queda aceptada**: se publica un repositorio nuevo a partir de un
    clon limpio con su historial, pero ese clon se hace después de la 1c.
  - **Se elimina la fase 3** (repartir las tareas pendientes): la 1c resuelve
    `TODO.md` entero y los ficheros de trabajo se publican (ADR-026).
  - **Los volcados de BD salen ya del árbol** (`git rm --cached` y
    `backend/db-mysql/backup/*.sql` en `.gitignore`); del historial, en la
    fase 2.
- **Motivo:** decisión del propietario. Publicar con los fallos abiertos los
  expondría, y limpiar el historial antes obligaría a repetir la limpieza por
  todo lo que se commitee después.
- **Revisa:** ADR-001 en el orden de las fases.

## ADR-028 — `OPEN-SOURCE.md` se archiva; su parte vigente pasa a `docs/GITCLEAN.md`

- **Estado:** ✅ aceptada (2026-09-28)
- **Fecha:** 2026-09-28
- **Decisión:**
  - La sección 2 de `OPEN-SOURCE.md` (limpieza del historial: objetivo, reglas y
    procedimiento) pasa a `docs/GITCLEAN.md`, en español, con lo decidido
    después (ADR-006, ADR-026, ADR-027) y los candidatos a privados conocidos.
  - El original se archiva en `docs/_archive/OPEN-SOURCE.md` y sale del
    repositorio. Las ADR que lo citan (001, 004, 011) no se tocan.
  - La raíz queda solo con `README.md`, `AGENTS.md` y `CLAUDE.md`; toda la
    documentación vive en `docs/`.
- **Motivo:** decisión del propietario: la documentación, dentro de `docs/`. De
  las tres secciones del plan, la 1 está cumplida (fase 1, ADR-004 y ADR-011) y
  la 3 la eliminó ADR-027; solo la 2 sigue vigente.

## ADR-029 — CSRF: lista de orígenes del CORS más `SameSite=Lax`, sin token ni cabecera propia

- **Estado:** ✅ aceptada (2026-09-29)
- **Fecha:** 2026-09-29
- **Decisión:**
  - La defensa contra CSRF es la comprobación de origen del CORS en
    `backend/index.ts`: toda petición con un `Origin` que no esté en la lista
    recibe 403 **antes de llegar a las rutas**, también las simples que el
    navegador no somete a preflight (`text/plain`, `multipart`), las de otro
    subdominio de `stackbp.es` y `Origin: null`. Junto a las cookies
    `SameSite=Lax`, basta.
  - Ese rechazo **debe seguir siendo un error** del callback de `cors`: con
    `callback(null, false)` las peticiones simples llegarían a las rutas.
  - No se añade token CSRF ni cabecera obligatoria.
  - **Ninguna ruta GET puede modificar datos**: una navegación normal envía las
    cookies `Lax` sin `Origin`. Excepción revisada: `GET /api/checklists/:id/run`
    abre el run del día y cierra los atrasados; es idempotente.
  - `http://localhost:3000` solo está en la lista fuera de producción.
- **Motivo:** los navegadores envían `Origin` en toda petición POST, PUT, PATCH
  y DELETE, así que comprobarlo es la defensa de «verificar el origen» de OWASP.
  Una cabecera obligatoria no añade nada y obligaría a tocar más de 25 llamadas
  `fetch` del frontend. Comprobado en producción el 2026-09-29 con una sesión
  de `admin` válida: los orígenes ajenos, del mismo sitio y `null` reciben 403;
  el propio pasa.
