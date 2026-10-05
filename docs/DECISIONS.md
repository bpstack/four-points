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

- **Estado:** ✅ aceptada (2026-09-28) · 📌 momento revisado por
  [ADR-036](#adr-036--el-original-se-archiva-al-final-y-la-rotación-va-después-de-publicar)
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
    `docs/`, partiendo de las plantillas del repo `harness` (privado), y se
    escriben en español.
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
    el Excel de presencias del personal en `docs/frontend/schedule/`). No se han
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

- **Estado:** ✅ aceptada (2026-09-28) · 📌 BD local revisada por
  [ADR-039](#adr-039--la-bd-local-vuelve-como-instalación-documentada-aiven-sigue-siendo-la-única-compartida)
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

- **Estado:** ✅ aceptada (2026-09-28); en las ramas, revisada por ADR-035
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

- **Estado:** ✅ aceptada (2026-09-28) · 📌 alcance revisado por
  [ADR-033](#adr-033--la-fase-1c-se-limita-a-lo-que-hay-que-resolver-antes-de-publicar)
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

## ADR-030 — Entorno preview completo en subdominios de `four-points.stackbp.es`

- **Estado:** ✅ aceptada (2026-10-04)
- **Fecha:** 2026-10-04
- **Decisión:**
  - La rama `claude/compassionate-planck-gh6aof` se prueba con **su propio
    backend**: un segundo servicio en Render (`four-points-api-preview`, plan
    gratuito) que despliega la rama. El frontend de la rama apunta a él con un
    `NEXT_PUBLIC_API_URL` limitado a esa rama en Vercel.
  - Los dos viven bajo `four-points.stackbp.es`: `preview.` (Vercel) y
    `api-preview.` (Render). El CORS se abre con la variable `FRONTEND_URL` del
    servicio de preview, **sin cambiar código**.
  - Usa **la base de datos de producción**. Todos los datos son de prueba, y
    escribir en ella demuestra que la rama funciona de verdad.
  - Nada de esto toca `main` ni el servicio `four-points-api`.
- **Motivo:** la URL `*.vercel.app` de la preview no podía iniciar sesión: el
  CORS de producción rechaza ese origen y, aunque lo aceptara, las cookies
  `SameSite=Lax` con dominio `.four-points.stackbp.es` no viajan desde otro
  sitio (ADR-029). Además, ese frontend llamaba al backend de `main`, así que
  los arreglos de backend de la rama no se probaban en ningún sitio.
- **Rechazado:**
  - Añadir el origen `*.vercel.app` al CORS de producción: no resuelve las
    cookies y debilita la defensa CSRF de ADR-029.
  - Solo el dominio de Vercel contra el backend de `main`: valida el frontend,
    no los arreglos de backend.
  - `SameSite=None` en las cookies: cambio de seguridad en producción solo para
    probar.
- **Consecuencias:** los cron se ejecutan dos veces mientras el servicio de
  preview está despierto, y una sesión iniciada en preview vale también en
  producción. Detalle y pasos para retirarlo en `docs/general/README.md`
  («Preview environment»).

## ADR-031 — La rama entra en `main` con merge normal; la autoría de Claude se corrige en la fase 2

- **Estado:** ✅ aceptada (2026-10-04)
- **Fecha:** 2026-10-04
- **Decisión:**
  - `claude/compassionate-planck-gh6aof` entra en `main` con un **merge
    normal** («Create a merge commit»), **no con squash**. Los commits llegan a
    `main` uno a uno.
  - Los **5 commits con autor `Claude <noreply@anthropic.com>`** (`c4719b2`,
    `8af5641`, `9c583eb`, `1d5b3ca`, `d432c30`) **no se rehacen ahora**: su
    autor pasa a `bpstack` en la reescritura de la fase 2, con
    `git-filter-repo --mailmap`, la misma pasada que quita los ficheros
    privados (`GITCLEAN.md`).
  - Los pares fnb y revert se quedan: se anulan entre sí y no cambian código.
  - La lista de arreglos vive en `git log` y en `docs/VERIFY.md`, versionado.
- **Motivo:** `TODO.md` borra lo terminado porque `git log` ya lo registra. Un
  squash dejaría en `main` un único commit y, al borrar la rama, se perdería el
  detalle de cada arreglo. La fase 2 ya reescribe el historial con
  `git-filter-repo`, así que corregir el autor ahí no añade ninguna reescritura
  más ni obliga a forzar el push de la rama.
- **Rechazado:**
  - **Squash merge** (lo que proponía `TODO.md`): pierde el detalle de cada
    arreglo.
  - **Rehacer la rama a mano** con `cherry-pick` y `--reset-author`: reescritura
    extra y `push --force` a la rama, para un resultado que la fase 2 da gratis.
  - **La lista en `docs/_archive/`**: está en `.gitignore` (ADR-009) y solo
    existiría en un equipo.
- **Consecuencias:** hasta la fase 2, `main` (privado) lleva esos 5 commits con
  autor Claude. Si la fase 2 no llegara a hacerse, habría que corregirlos de
  otra forma antes de publicar.
- **Revisa:** el primer punto de `TODO.md` (proponía squash) y las reglas de
  `GITCLEAN.md` (solo quitaban ficheros).

## ADR-032 — Blacklist, F&B, mantenimiento, caja, parking y mensajería mantienen permisos simples

- **Estado:** ✅ aceptada (2026-10-04)
- **Fecha:** 2026-10-04
- **Decisión:** por ahora, dentro de estos módulos no hay permisos por acción,
  por autoría ni por estado:
  - **Blacklist**: quien tiene acceso crea, edita, borra y restaura cualquier
    entrada.
  - **F&B**: quien tiene acceso sube el PDF, mete cifras a mano y borra el día
    que sea, de cualquier fecha.
  - **Mantenimiento**: quien tiene acceso crea, edita, cambia de estado,
    asigna, borra y restaura cualquier parte.
  - **Caja**: los turnos y los días cerrados siguen editables por los roles que
    los gestionan.
  - **Parking** (añadido el 2026-10-04): el importe cobrado, el método y la
    referencia de pago se pueden editar en cualquier estado de la reserva,
    también `completed`.
  - **Mensajería** (añadido el 2026-10-04): cualquier rol ve el nombre, el
    email y el rol de todos los usuarios activos al empezar una conversación,
    y la lista de participantes devuelve sus emails y `last_read_at`.
- **Motivo:** decisión del propietario. El hotel trabaja con pocas personas que
  necesitan acceso completo, y mantenimiento ya guarda historial de cada cambio.
- **Rechazado:** separar acciones de `admin` en F&B (borrar días, cifras a
  mano) y en mantenimiento (borrar, restaurar, cambiar estado); bloquear la
  edición de turnos y días cerrados; bloquear el cobro de parking según el
  estado de la reserva; ocultar emails y roles en el directorio de mensajería.
- **Consecuencias:** salen de `TODO.md` los cinco puntos que pedían esos
  permisos. Siguen abiertos los que no son de permisos: validar los importes
  manuales de F&B, el contenido del PDF y el rastro de cambios de dinero en caja
  y en el cobro de parking.

## ADR-033 — La fase 1c se limita a lo que hay que resolver antes de publicar

- **Estado:** ✅ aceptada (2026-10-04)
- **Fecha:** 2026-10-04
- **Decisión:**
  - La fase 1c ya no resuelve **todo** `TODO.md`: solo la sección **«Antes de
    publicar»**. Son las brechas de seguridad que alguien de fuera o un rol bajo
    puede aprovechar, más las decisiones necesarias para publicar (licencia y
    analítica).
  - Los secretos y datos privados del repositorio (contraseñas en ficheros,
    datos del personal) siguen en esa sección, pero se resuelven en la fase 2.
    La rotación de credenciales se hace tras la fase 2 (ADR-007).
  - El resto pasa a la sección **«Después de publicar»**: mejoras de lógica de
    negocio, rastro de cambios, carreras sin consecuencia de seguridad,
    operación, interfaz y calidad. Se trabajan en el repositorio público, sin
    plazo.
  - Las prioridades 🔴🟡🟢 se mantienen dentro de cada sección.
- **Motivo:** decisión del propietario. El objetivo es cerrar las brechas y
  publicar; las mejoras se pueden hacer en cualquier momento, y esperar a
  todas retrasaría la publicación sin reducir el riesgo.
- **Rechazado:** resolver todo `TODO.md` antes de la fase 2 (ADR-027 tal como
  estaba).
- **Consecuencias:** `TODO.md` se reorganiza en las dos secciones y
  `ROADMAP.md` cambia la definición de la fase 1c. Los dudosos se clasificaron
  como mejora: datos sensibles en los logs (no son públicos) y los informes de
  caja sin `canViewReports` (un rol interno viendo totales).
- **Revisa:** ADR-027 en el alcance de la fase 1c.

## ADR-034 — La limpieza del historial es híbrida: eliminar, reemplazar y cambiar autoría

- **Estado:** ✅ aceptada (2026-10-04)
- **Fecha:** 2026-10-04
- **Decisión:**
  - La fase 2 hace tres operaciones con `git-filter-repo`, cada una sobre una
    lista aprobada por el propietario (`GITCLEAN.md`):
    1. **Eliminar** del historial los ficheros o directorios enteramente
       privados (volcados, scripts con la contraseña de Aiven, Excel del
       personal).
    2. **Reemplazar contenido** (`--replace-text`) en los ficheros legítimos
       que llevaron credenciales o nombres reales escritos: el fichero se
       conserva y solo cambia el valor.
    3. **Cambiar autoría** (`--mailmap`), como ya decía ADR-031.
  - Se aplica poco a poco: cada operación se prueba y se audita en el clon
    antes de la siguiente.
  - Antes, en la rama, se quita del árbol lo que no hace falta en el repo
    público y los scripts legítimos leen las credenciales de `backend/.env`.
- **Motivo:** decisión del propietario. Borrar del historial un script útil
  solo porque llevó una contraseña pierde su historia; reemplazar el valor la
  conserva. Lo enteramente privado no tiene nada que conservar.
- **Rechazado:** solo eliminar ficheros (la regla anterior de `GITCLEAN.md`).
- **Consecuencias:** `GITCLEAN.md` clasifica los candidatos por operación. Los
  valores a reemplazar se guardan fuera del repositorio durante la limpieza.
- **Revisa:** las reglas de `GITCLEAN.md` (antes solo se eliminaban ficheros y
  se cambiaba la autoría).

## ADR-035 — Se publican dos ramas y el repositorio actual se archiva con otro nombre

- **Estado:** ✅ aceptada (2026-10-05) · 📌 orden revisado por
  [ADR-036](#adr-036--el-original-se-archiva-al-final-y-la-rotación-va-después-de-publicar)
  · 📌 momento de publicar revisado por
  [ADR-037](#adr-037--la-demo-va-en-la-propia-web-y-el-repositorio-se-publica-después)
- **Fecha:** 2026-10-05
- **Decisión:**
  - Se limpian y se publican **solo `main` y
    `claude/compassionate-planck-gh6aof`**. `chore/audit-prep-sprint-0`,
    `feature/ai-schedule-generator`, `feature/auth-hardening` y
    `feature/observability-pino` no tienen ningún commit fuera de `main`.
  - El repositorio actual se **renombra a `four-points-archive`**, sigue
    privado y se marca como archivado (solo lectura). El nuevo, con el
    historial limpio, se crea como **`four-points`**: primero privado, se
    revisa y se pasa a público, con secret scanning y push protection.
  - Orden para no subir historial viejo al repositorio nuevo: renombrar;
    apuntar `origin` de los tres equipos a `four-points-archive` (o
    sustituir esos clones); archivar; crear el nuevo; reconectar Vercel y
    Render (se enlazan por ID y seguirían en el archivado).
- **Motivo:** decisión del propietario. Las cuatro ramas no aportan nada que
  no esté en `main` y cada rama más es historial que limpiar y auditar.
  Mantener el nombre `four-points` conserva enlaces y README.
- **Rechazado:** publicar todas las ramas (ADR-026 tal como estaba); un
  nombre nuevo para el repositorio público.
- **Consecuencias:** `GITCLEAN.md` cambia la lista de ramas. Tras crear el
  nuevo repositorio, GitHub deja de redirigir `bpstack/four-points` al
  archivado: un clon viejo sin el `origin` cambiado subiría al público.
- **Revisa:** ADR-026 en las ramas que se publican.

## ADR-036 — El original se archiva al final y la rotación va después de publicar

- **Estado:** ✅ aceptada (2026-10-05)
- **Fecha:** 2026-10-05
- **Decisión:**
  - **Orden de la publicación:** renombrar el original a
    `four-points-archive`; crear `four-points` privado con el historial
    limpio; sustituir los clones locales por clones nuevos (no se cambia el
    `origin`); reconectar Vercel y Render, producción y preview; y solo
    entonces archivar el original y pasar el nuevo a público.
  - **La rotación de credenciales no bloquea la publicación:** se hace
    después, en «Después de publicar» de `TODO.md`.
  - **El procedimiento de rotación queda fuera del repositorio**, con el
    propietario.
- **Motivo:** decisión del propietario. Un repositorio archivado no admite
  push: mientras producción despliegue desde el original, tiene que poder
  recibir un arreglo urgente. El historial
  publicado no contiene credenciales y la BD de producción solo tiene datos de
  prueba. El procedimiento describe paneles, equipos y claves concretas que no
  sirven a quien lea el repositorio.
- **Revisa:** ADR-035 en el orden; ADR-007 en el momento de la rotación.

## ADR-037 — La demo va en la propia web y el repositorio se publica después

- **Estado:** ✅ aceptada (2026-10-05) · 📌 usuarios demo y acceso revisados
  por
  [ADR-038](#adr-038--un-solo-admin-demo-restringido-y-la-instalación-local-con-mysql-en-docker)
- **Fecha:** 2026-10-05
- **Decisión:**
  - `four-points.stackbp.es` es solo un escaparate: la demo pública va en esa
    misma web y su BD, con usuarios demo por rol, datos ficticios
    (`mock-data.sql`) y reinicio diario, también de los horarios.
  - Los usuarios demo ven toda la app y pueden generar horarios, pero no tocan
    la configuración: ni usuarios, ni roles, ni contraseñas.
  - El repositorio se hace público cuando la demo esté lista.
- **Motivo:** decisión del propietario. Nadie usa la web para trabajar, y una
  segunda web con su BD gastaría más horas del plan gratuito de Render. Sin
  demo, quien llegue al repositorio no tiene cómo probar la aplicación:
  `MASTER_INSTALL.sql` no crea ningún usuario.
- **Rechazado:** la demo aparte en `demo.four-points.stackbp.es` con la BD
  `hotel_demo` (plan del 2026-10-04); publicar antes de la demo.
- **Consecuencias:** si la web llega a usarse de verdad, la demo se separa
  entonces. Fase 5 antes de terminar la 4.
- **Revisa:** ADR-035 en el momento de hacer público el repositorio.

## ADR-038 — Un solo admin demo restringido y la instalación local con MySQL en Docker

- **Estado:** ✅ aceptada (2026-10-05)
- **Fecha:** 2026-10-05
- **Decisión:**
  - **Un solo usuario demo, con rol admin**, en lugar de uno por rol: como
    admin ve todos los módulos. Se entra con un botón «Probar la demo» en el
    login, sin contraseña: el usuario tiene una aleatoria que nadie conoce, y el
    botón y su ruta solo existen con `DEMO_MODE=true` en el backend.
  - **Marca `is_demo`** en el usuario, que viaja en el token. Un middleware
    bloquea solo lo prohibido: gestión de usuarios y contraseñas, el propio
    perfil, departamentos, toda subida de ficheros (cualquier `multipart`), el
    registro de la demo y la configuración de horarios (turnos, parámetros,
    empleados y contratos). Generar horarios, crear meses y peticiones sí. El
    rol `demo-admin` se retira.
  - **Reinicio diario** con la primera entrada a la demo del día: recarga
    `mock-data.sql` y restaura una foto de las tablas de horarios guardada en la
    BD.
  - **En local, admin completo**, sin modo demo. MySQL en Docker, opcional y
    **solo MySQL** (un `docker-compose.yml`); backend y frontend arrancan con
    pnpm como ahora. `pnpm setup:local` crea las tablas, el primer admin y los
    departamentos, y carga el mock.
- **Motivo:** simplicidad, decisión del propietario. Un admin demo prueba toda
  la app de una vez, y un botón no obliga a escribir nada. Con roles reales,
  los permisos funcionan igual que para cualquier usuario y la restricción vive
  en un solo sitio. Render gratuito se duerme, así que un cron a hora fija
  puede no ejecutarse. Docker ahorra instalar MySQL; meter en él backend,
  frontend y solver sería un segundo sistema que producción no usa.
- **Rechazado:** usuarios demo por rol y contraseña pública en el login
  (ADR-037); lista blanca de escrituras con el rol `demo-admin`; reinicio por
  GitHub Actions (credenciales de Aiven en GitHub y tareas programadas que se
  desactivan tras 60 días sin actividad); la app entera en Docker.
- **Consecuencias:** CSRF sigue cubierto por `SameSite=Lax` y el rechazo de
  orígenes ajenos; se añade un test. Para XSS se comprueba que un enlace
  `javascript:` en las notas del checklist no se ejecuta. Límites nuevos para
  el solver y las escrituras del usuario demo. El README pasa a explicar la
  instalación local.
- **Revisa:** ADR-037 en los usuarios demo y su acceso.

## ADR-039 — La BD local vuelve como instalación documentada; Aiven sigue siendo la única compartida

- **Estado:** ✅ aceptada (2026-10-05)
- **Fecha:** 2026-10-05
- **Decisión:**
  - **Aiven** sigue siendo la única BD del proyecto que se comparte:
    producción, preview y la demo pública.
  - **La BD local** vuelve a ser parte documentada del proyecto: quien clona el
    repositorio la monta con `pnpm setup:local` (con MySQL propio o en Docker)
    y el propietario puede seguir usando la suya con `pnpm dev:local`. Se
    mantienen `DB_ENVIRONMENT`, el preset `local` y `LOCAL_DB_*`.
- **Motivo:** ADR-038: quien quiera ver la aplicación entera la instala en
  local con un admin completo. Y lo que ADR-015 rechazaba ya existe: una
  instalación desde los scripts del repositorio, comprobada el 2026-10-05 en
  un MySQL limpio, deja la misma estructura que Aiven (1161 de 1161 columnas,
  índices, claves, triggers y procedimientos) y los mismos catálogos.
- **Rechazado:** quitar el soporte de BD local (la tarea pendiente de
  ADR-015).
- **Consecuencias:** las migraciones se siguen aplicando en local y en Aiven
  (`INDEX.md`). Dos fallos del baseline congelado, que impedían instalar desde
  cero, se corrigen en `setup:local` y con
  `20261005_complete_fresh_install.sql` sin tocar `aiven/` (ADR-021).
- **Revisa:** ADR-015 en la BD local.

## ADR-040 — La documentación obsoleta se archiva fuera del repositorio

- **Estado:** ✅ aceptada (2026-10-05)
- **Fecha:** 2026-10-05
- **Decisión:** un documento que ya no describe el proyecto se mueve a
  `docs/_archive/<su ruta original>` (en `.gitignore`: solo en el equipo del
  propietario) y se borra del repositorio. Se apunta aquí con el último commit
  que lo contiene: `git show <commit>:<ruta>` lo recupera.
- **Archivados el 2026-10-05** (último commit: `da7c643`):

  | Ruta | Por qué |
  | --- | --- |
  | `backend/backend.md` | Duplicaba `backend/README.md` en inglés; decía que el backend era privado y describía la demo antigua (lista blanca de rutas) |
  | `backend/README.md` | 442 líneas de arquitectura repetidas en `docs/`; sustituido por un README corto |
  | `frontend/README.md` | 877 líneas con Next 14 / React 18 y la demo antigua; sustituido por un README corto |
  | `backend/db-mysql/MIGRATION_GUIDE.md` | Mandaba instalar con `MASTER_INSTALL.sql` a mano, que falla desde cero; lo sustituye `pnpm setup:local` (ADR-039) |
  | `frontend/messages/cmd.md` | Una línea con un comando de búsqueda |
  | `frontend/app/dashboard/conciliation/nota.md` | Idea sin hacer: una descripción obligatoria en cada entrada de la conciliación (habitaciones OOO que restan) |

- **Motivo:** el repositorio va a ser público; un documento con datos falsos
  confunde más que su ausencia, y los README largos repetían `docs/` sin
  mantenerse.
- **Rechazado:** actualizarlos en el sitio. Era más trabajo y seguían
  duplicando `docs/general`.
- **Consecuencias:** los documentos del proceso de publicación (`GITCLEAN.md`,
  `VERIFY.md`, `ROADMAP.md`, `SESSION.md`) se archivan igual cuando el
  repositorio sea público.

## ADR-041 — El ROADMAP se archiva al cerrar la publicación

- **Estado:** ✅ aceptada (2026-10-05)
- **Fecha:** 2026-10-05
- **Decisión:** `docs/ROADMAP.md` pasa a `docs/_archive/docs/ROADMAP.md`
  (último commit que lo contiene: `e87581b`). Lo pendiente vive solo en
  `TODO.md`, y si un punto depende de otro se dice en el propio punto.
- **Motivo:** describía las fases para publicar el repositorio y todas
  quedaron cerradas el 2026-10-05 (la 3 se absorbió en la 1c). Un plan
  terminado que sigue en la raíz de `docs/` parece trabajo vivo.
- **Consecuencias:** las ADR anteriores que citan `ROADMAP.md` no se tocan:
  `git show e87581b:docs/ROADMAP.md` lo recupera. Aplica ADR-040.
