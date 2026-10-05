# VERIFY — arreglos de la fase 1c y su prueba en producción

> **Qué responde:** qué se arregló en la rama `claude/compassionate-planck-gh6aof`
> y si está comprobado en producción. · **Quién lo lee:** quien pruebe la rama
> antes del merge y quien quiera saber, después, qué cerró la fase 1c. · **Cómo
> se poda:** no se poda. Al terminar las pruebas queda como registro de la fase
> 1c (ADR-027, ADR-031).

Los puntos terminados se **borran** de `TODO.md` (su propia regla), así que esta
tabla es la lista de lo hecho: cada fila es un commit de la rama, con el punto de
`TODO.md` que cerró. Se generó el 2026-10-04 a partir de
`git log origin/main..HEAD` y de las líneas `- [ ]` que cada commit quita de
`docs/TODO.md`.

**Dónde se prueba:** el entorno preview (`docs/general/README.md`, «Preview
environment»): `https://preview.four-points.stackbp.es` con el backend de la
rama y la base de datos de producción.

**Resultado:** ⏳ sin probar · ✅ comprobado (fecha y cómo) · ❌ falla (enlace a
la nota o al punto nuevo de `TODO.md`) · 🧪 solo test (no se puede provocar en producción sin
romper algo; lo cubre el test indicado) · — no aplica (documentación, formato,
CI).

**Fuera de la tabla:**

- `8af5641` y `9c583eb` (fnb) y sus reverts `1d5b3ca` y `d432c30`: se anulan
  entre sí y no cambian código. Sus dos puntos siguen abiertos en `TODO.md`.
- `5236a84`: documentación del entorno preview.
- Las filas marcadas «(otra IA)» las probó un segundo modelo con el mismo entorno y las mismas reglas; se revisaron sus peticiones. Las que había probado contra la ruta equivocada (`997b80d`, `31c99c7`, `3d8dd70` y las cuatro de logbook) se repitieron.

## Estado previo

- **CI** de la rama en verde (2026-10-04, run `37198286379`): backend con lint,
  formato, tipos y tests; frontend con lint, formato y tipos. El build del
  frontend lo valida Vercel.
- **Entorno preview** operativo (2026-10-04): login de `admin`, el bundle llama
  a `api-preview` y el CORS acepta el origen de preview.
- **Ruido que no es de la rama**: en preview, la barra de Vercel
  (`feedback.js`) y la protección «Vercel Authentication» producen
  `OPTIONS /…` con 400, `/.well-known/vercel/jwe` con 503 y prefetch `?_rsc=`
  con 503. En producción la misma navegación no da ninguna petición fallida.

## Cambio al repositorio nuevo (2026-10-05)

Vercel y Render se reconectaron de `four-points-archive` a `bpstack/four-points`
(ADR-036) y se desplegó desde él en los cuatro entornos:

- **Producción:** `main` en `0953e94`. Vercel _Ready_ y `four-points.stackbp.es`
  responde; Render _live_, conecta con la BD, arranca los cron y el solver, y
  `api.four-points.stackbp.es` responde 200.
- **Preview:** la rama en `d9e7230`. Vercel _Ready_; el dominio está tras la
  protección de Vercel y lo abrió el propietario. Render _live_ con la misma
  comprobación y `api-preview` responde 200.
- Los cuatro despliegues se lanzaron a mano; el despliegue automático con un
  push al repositorio nuevo **queda sin comprobar** hasta el primer push.

## Arreglos

| Commit | Qué cambia | Punto de `TODO.md` que cierra | Prueba | Resultado |
| ------ | ---------- | ----------------------------- | ------ | --------- |
| `c4719b2` | fix(logbook): validate messages, dates, route params and list queries | Logbook: validación incompleta | offset -1, limit 501, fecha 2026-02-31, mensaje vacío, importancia inválida, id no numérico → 400 | ✅ 2026-10-04 |
| `ee00b32` | fix(logbook): take the entry author from the session, not the body | Logbook: cualquiera puede crear entradas en nombre de otro | qa_recep crea entrada con `author_id` de admin → se guarda con qa_recep | ✅ 2026-10-04 |
| `9342a3b` | chore(githooks): mark commit-msg and pre-push as executable | — | no aplica | — |
| `997b80d` | fix(conciliation): validate dates, form entries, status and route params | Conciliation: sin validación Zod, a diferencia del resto del proyecto<br>Conciliation: un `reason` que no sea uno de los válidos falla en… | PUT /conciliations/:id/form con motivo inventado, importe sin número o líneas que faltan → 400 Zod | ✅ 2026-10-04 |
| `dc134dc` | fix(search): limit global search to the modules the role can open | `mantenimiento` lee la lista negra por la búsqueda global | /api/search?q=ab|an|er: admin y recep ven parking y blacklist; mant solo maintenance y groups | ✅ 2026-10-04 |
| `095a09a` | fix(activity): show only activity from modules the role can open | `mantenimiento` lee actividad de módulos vetados por `/api/activity` | /api/activity/recent: mant solo ve maintenance y groups | ✅ 2026-10-04 |
| `6b1e523` | fix(api): stop sending caught error messages in 500 responses | Maintenance: los errores 500 devuelven el mensaje de MySQL<br>El controlador de notificaciones devuelve `error.message` de MySQL<br>Parking: `listAvailableSpots` devuelve el mensaje de error de MySQL | `tests/security/no-raw-error-messages.test.ts` | 🧪 2026-10-04 |
| `812f64f` | docs(todo): record how to merge the working branch without its extra history | — | no aplica | — |
| `990bc72` | fix(cashier): answer known shift, payment and count errors with 4xx | Cashier: los 500 de turnos, pagos y recuentos devuelven… | `tests/cashier/cashier-errors.test.ts` | 🧪 2026-10-04 |
| `6c5d33b` | fix(checklist): cap image uploads in multer instead of after buffering | Checklist: subida de imágenes sin límite de tamaño en multer | Avatar de 3 MB (límite 2 MB) → 413; checklist usa el mismo middleware | ✅ 2026-10-04 |
| `17b496b` | fix(uploads): check image uploads by their bytes, not the declared type | Blacklist: el tipo de imagen solo se valida por el mimetype que declara… | Avatar y blacklist con bytes no-imagen declarados `image/png` → 400 | ✅ 2026-10-04 |
| `b122d5e` | fix(uploads): use the checked image upload for maintenance and avatars | — | Avatar con tipo `text/plain` → 400; PNG válido → 200 | ✅ 2026-10-04 |
| `7e28102` | fix(checklist): reject unknown checklists, foreign steps and bad record ids | Checklist: `:id` sin validar<br>Checklist: comentarios e imágenes no comprueban que el paso exista | Historial de un checklist inexistente → 404 (otra IA) | ✅ 2026-10-04 |
| `3295769` | fix(checklist): validate the history query instead of failing with 500 | Checklist: fechas de `/history` sin validar | /checklists/:id/history con fecha imposible, limit 0 y 101 → 400 (otra IA) | ✅ 2026-10-04 |
| `50c0c85` | fix(maintenance): reject blank and oversized texts and invalid route ids | Maintenance: validación incompleta | Parte con título en blanco o descripción corta → 400 (otra IA) | ✅ 2026-10-04 |
| `a628c55` | fix(blacklist): reject blank texts and impossible dates | — | Blacklist con nombre en blanco o fecha imposible → 400 (otra IA) | ✅ 2026-10-04 |
| `31c99c7` | fix(api): reject impossible calendar dates in every date param and field | — | /conciliations/day/2026-02-31 → 400 `INVALID_DATE_FORMAT`; /activity/recent?date_from=2026-02-31 → 400 | ✅ 2026-10-04 |
| `f06d8d5` | fix(notifications): keep direct links inside the app and validate notices | `direct_link` de las notificaciones admite cualquier URL<br>Notificaciones manuales: destinatarios y textos sin validar | `direct_link` `//…`, `/…`, `https://…`, `javascript:` → 400; `userIds` no UUID y título vacío → 400 | ✅ 2026-10-04 |
| `2ca2847` | docs(todo): restore the blank line between the groups and scheduling blocks | — | no aplica | — |
| `6377b61` | fix(messages): validate participants and query params, escape LIKE search | Mensajería: sin validación de entrada ni transacción al crear<br>Mensajería: `limit` sin validar, `LIKE` sin escapar y fallo de la… | Conversación con participantes repetidos o UUID inválido → 400 (otra IA) | ✅ 2026-10-04 |
| `9783e4c` | docs(todo): detail why the parking booking source is lost and what to decide | — | no aplica | — |
| `17f13b4` | fix(logbook): answer 403 when editing someone else's entry | Logbook: editar una entrada ajena devuelve 500 | qa_gadmin edita la entrada de qa_recep → 403 `LOGBOOK_ONLY_AUTHOR_UPDATE` | ✅ 2026-10-04 |
| `88dfd58` | chore(backend): remove the unused email service and EJS view engine | — | Backend de preview arranca y sirve sin el servicio de email ni EJS | ✅ 2026-10-04 |
| `420a534` | fix(api): send Cache-Control: no-store on every API response | El API no envía `Cache-Control: no-store` | GET /api/auth/me → `Cache-Control: no-store` | ✅ 2026-10-04 |
| `9045b8e` | fix(backoffice): allow-list the columns supplier and invoice edits may set | Backoffice: inyección SQL por los nombres de campo | PATCH proveedor QA con clave `"notes = (SELECT 1), name"` → claves ignoradas, solo cambia `name` | ✅ 2026-10-04 |
| `99bd9f7` | fix(backoffice): only fetch invoice PDFs from our own Cloudinary cloud | Backoffice: SSRF en la descarga de PDF | Factura con PDF en 169.254.169.254, dominio externo u otra cuenta de Cloudinary → 400 | ✅ 2026-10-04 |
| `5127df8` | fix(cloudinary): only delete files from the folder of the module asking | Blacklist: `DELETE /upload/:publicId` borra cualquier recurso de…<br>Backoffice: borrado arbitrario en Cloudinary | Factura con `public_id` fuera de `invoices/` (crear y validar) → 400 | ✅ 2026-10-04 |
| `60dba0a` | fix(backoffice): accept only integer year and month in batch payments | Backoffice: el pago en lote paga todos los meses con un objeto | Batch payment con year 2026.5 o "2026" → 400 (otra IA) | ✅ 2026-10-04 |
| `c043ff8` | fix(scheduling): stop constraint edits from setting their own status | — | PUT /scheduling/constraints/:id con `status: approved` → la clave se descarta (400 «al menos un campo»); PUT …/approve como recep → 403 | ✅ 2026-10-04 |
| `1c48a16` | docs(todo): close the scheduling self-approval entry, note the open decision | Scheduling: un recepcionista puede aprobarse sus propias solicitudes | no aplica | — |
| `9c42b09` | fix(parking): validate the booking update body against its columns | Parking: rutas de edición sin Zod | Reserva de parking con importe negativo o método de pago desconocido → 400 (otra IA) | ✅ 2026-10-04 |
| `f591165` | fix(scheduling): bound bulk edits and validate employee id lists | Scheduling: validación incompleta | Edición masiva de 32 días → 400 (otra IA) | ✅ 2026-10-04 |
| `765e271` | fix(scheduling): stop sending solver internals in generate errors | Scheduling: errores del solver y del arranque devueltos al cliente. | `tests/security/no-raw-error-messages.test.ts` | 🧪 2026-10-04 |
| `1c3878d` | fix(blacklist): accept only images uploaded through the blacklist upload | Blacklist: el array `images` acepta cualquier URL | POST /api/blacklist con imagen de otro dominio o de otra carpeta de Cloudinary → 400 «Cada imagen debe haberse subido desde la lista negra» | ✅ 2026-10-04 |
| `1282e33` | fix(cloudinary): sanitise new public ids, accept legacy ones when deleting | Maintenance: `public_id` con el nombre original sin sanear. | Avatar subido como `mi foto ñ (1)#x.png` → public_id `avatar_…_mi_foto____1__x` (borrado después) | ✅ 2026-10-04 |
| `8fe1514` | fix(cloudinary): check control characters without a control-character regex | — | `tests/uploads/cloudinary-url.test.ts` | 🧪 2026-10-04 |
| `54a5210` | chore(conciliation): drop the commented-out admin check in the monthly status | Conciliation: comentario de código muerto en el controlador mensual | Recorrido de los 17 módulos como admin en preview: cargan y pintan sin peticiones fallidas (fuera de la barra de Vercel); CI verde | ✅ 2026-10-04 |
| `758883b` | docs(tests): replace the outdated backend tests README | `backend/tests/README.md` está desfasado | no aplica | — |
| `e8157bf` | chore(db): keep a single copy of the Aiven CA certificate | Certificado de Aiven duplicado | El backend de preview conecta a Aiven con TLS verificado y `apply-migration.sh` usa la misma CA | ✅ 2026-10-04 |
| `4d65223` | chore(env): bring the .env.example files in line with the code | Actualizar los `.env.example` | El backend de preview arranca con las variables de producción; `.env.example` sin valores | ✅ 2026-10-04 |
| `6bf04e9` | docs(agents): note that the unused email service is gone | Corregir el `AGENTS.md` raíz sobre next-intl | no aplica | — |
| `9b83a28` | docs(cashier): stop presenting the daily totals trigger as reliable | Corregir el `AGENTS.md` de cashier | no aplica | — |
| `2551afb` | docs(logbook): document the input checks and close the stale entry | Corregir `backend/services/logbook/AGENTS.md` | no aplica | — |
| `8ba44f0` | docs(todo): close the module and parking AGENTS.md entries, already fixed | Corregir los `AGENTS.md` de módulo<br>Corregir los `AGENTS.md` de parking | no aplica | — |
| `4fea090` | docs(blacklist): describe the real blacklist_entries columns and soft delete | Corregir el `AGENTS.md` de blacklist | no aplica | — |
| `4f64a36` | docs(backoffice): describe assets, both PDFs and the unenforced lifecycle | Corregir el `AGENTS.md` de backoffice | no aplica | — |
| `f6d15f8` | docs(checklist): describe the param validation and the real table names | Corregir el `AGENTS.md` de checklist | no aplica | — |
| `d7b7c83` | refactor(api): drop param checks the route guards already make | — | Recorrido de los 17 módulos como admin en preview: cargan y pintan sin peticiones fallidas (fuera de la barra de Vercel); CI verde | ✅ 2026-10-04 |
| `404f99e` | refactor(maintenance): drop the per-handler id checks the route guard makes | — | Recorrido de los 17 módulos como admin en preview: cargan y pintan sin peticiones fallidas (fuera de la barra de Vercel); CI verde | ✅ 2026-10-04 |
| `31371bd` | refactor(parking): call isCalendarDate directly instead of a one-line wrapper | — | Recorrido de los 17 módulos como admin en preview: cargan y pintan sin peticiones fallidas (fuera de la barra de Vercel); CI verde | ✅ 2026-10-04 |
| `9a8d9e8` | chore(backend): remove the parking PDF placeholder and dead config code | — | Recorrido de los 17 módulos como admin en preview: cargan y pintan sin peticiones fallidas (fuera de la barra de Vercel); CI verde | ✅ 2026-10-04 |
| `55c5a18` | chore(backend): remove the unused conciliation logic and payment method repo | — | Recorrido de los 17 módulos como admin en preview: cargan y pintan sin peticiones fallidas (fuera de la barra de Vercel); CI verde | ✅ 2026-10-04 |
| `d3873b1` | refactor(backend): remove exports nothing uses | — | Recorrido de los 17 módulos como admin en preview: cargan y pintan sin peticiones fallidas (fuera de la barra de Vercel); CI verde | ✅ 2026-10-04 |
| `ac0c937` | docs(scheduling): fix PI and FO, the weights claim and the rotation emitter | Corregir los `AGENTS.md` de scheduling | no aplica | — |
| `a82c284` | chore(backend): remove the unused nodemailer dependency | — | Backend de preview arranca sin `nodemailer` | ✅ 2026-10-04 |
| `25f3334` | fix(messages): store message notifications under the messages module | Notificaciones de mensajes con `module: 'system'` | Mensaje urgente QA → aviso con `module: messages`. Fallaba («Data truncated»): faltaba la migración, aplicada con `5365d5c` | ✅ 2026-10-04 |
| `e2fdf9c` | fix(logbook): stop returning author and editor emails nobody displays | Emails de más en las respuestas de logbook | Listas de logbook: `author_name` sin campos de email | ✅ 2026-10-04 |
| `77d8f22` | fix(checklist): keep attachment public_id on the server | Checklist: respuestas con campos internos | `tests/checklist/attachment-response.test.ts` | 🧪 2026-10-04 |
| `967d65f` | fix(checklist): reject control characters in comments, escape them in reports | Checklist: `checklist-report.ts` imprime los comentarios sin filtrar… | Comentario de checklist con ESC y BEL → 400 «caracteres no válidos»; con salto de línea → 201 (borrado después) | ✅ 2026-10-04 |
| `7574d8c` | refactor(blacklist): remove the unused image delete endpoint and API methods | Blacklist: `DELETE /upload/:publicId` borra cualquier imagen de la…<br>Ids sin codificar en las URL de `blacklistApi.ts` | DELETE /api/blacklist/upload/:id → 404 «Ruta no encontrada» | ✅ 2026-10-04 |
| `c7a2703` | refactor(parking): remove the analytics API and occupancy query nobody calls | Parking: código sin uso | GET /api/parking/stats/analytics/{trends,comparison,performance} → 404 | ✅ 2026-10-04 |
| `b293e28` | chore(frontend): remove the unused auth routes and dependencies | Quitar código muerto | Recorrido de los 17 módulos como admin en preview: cargan y pintan sin peticiones fallidas (fuera de la barra de Vercel); CI verde | ✅ 2026-10-04 |
| `364ce12` | chore(frontend): remove the old backoffice tabs and their mock data | Backoffice: notas `IMPORTANT-PRODUCTION.MD` obsoletas | Recorrido de los 17 módulos como admin en preview: cargan y pintan sin peticiones fallidas (fuera de la barra de Vercel); CI verde | ✅ 2026-10-04 |
| `e276f80` | chore(frontend): remove 19 unimported files and 3 unused dependencies | — | Recorrido de los 17 módulos como admin en preview: cargan y pintan sin peticiones fallidas (fuera de la barra de Vercel); CI verde | ✅ 2026-10-04 |
| `0014b3a` | refactor(frontend): remove unused exports and fix the real lint errors | — | Recorrido de los 17 módulos como admin en preview: cargan y pintan sin peticiones fallidas (fuera de la barra de Vercel); CI verde | ✅ 2026-10-04 |
| `da5822d` | fix(reports): filter maintenance by the statuses the backend uses | Informes: la sección de mantenimiento filtra por estados que no… | Los 7 estados del filtro de informes → 200 en /api/maintenance; los antiguos `pending` y `resolved` → 400 | ✅ 2026-10-04 |
| `eca5507` | fix(blacklist): render search highlights as React nodes, not injected HTML | Blacklist: resaltado de búsqueda con `dangerouslySetInnerHTML` | Búsqueda "Mar" en blacklist → 6 `<mark>` en nombre y documento, solo con nodos de texto | ✅ 2026-10-04 |
| `ee73ff7` | fix(backoffice): neutralise spreadsheet formulas in the paid invoices CSV | Backoffice: inyección de fórmulas en la exportación CSV | CSV de pagadas con proveedor QA `=1+1 QA-Supplier-csv` → celda `"'=1+1 QA-Supplier-csv"` (blob interceptado, sin descarga) | ✅ 2026-10-04 |
| `425a194` | style(frontend): apply Prettier to the TypeScript and JavaScript files | — | no aplica | — |
| `5f04740` | refactor(logbook): drop the req.user.isAdmin check that never holds | Logbook: comprobación de `isAdmin` que nunca se cumple<br>`backend/scheduling-solver/AGENTS.md` cita `backend/debug-*.js` | Recorrido de los 17 módulos como admin en preview: cargan y pintan sin peticiones fallidas (fuera de la barra de Vercel); CI verde | ✅ 2026-10-04 |
| `032fb13` | fix(parking): read every occupying booking on the status map and wizard | Parking: el mapa de estado deja de ver reservas a partir de 50 | Mapa de estado de parking carga (20 plazas); el caso de más de 50 reservas lo cubre `tests/frontend/fetch-all-pages.test.ts` | 🧪 2026-10-04 |
| `79f8913` | refactor(blacklist): drop the created_by list filter and two unused actions | Blacklist: filtro `created_by` sin restricción | Recorrido de los 17 módulos como admin en preview: cargan y pintan sin peticiones fallidas (fuera de la barra de Vercel); CI verde | ✅ 2026-10-04 |
| `a64fc0d` | docs(blacklist): note that no screen restores a deleted entry | — | no aplica | — |
| `9f269c7` | chore(fnb): log uploads through the logger and fix the cache docs | Corregir el `AGENTS.md` de `fnb`<br>Fnb: `console.log` sin pasar por el logger del proyecto<br>Corregir el comentario de `canAccessFnb` | Recorrido de los 17 módulos como admin en preview: cargan y pintan sin peticiones fallidas (fuera de la barra de Vercel); CI verde | ✅ 2026-10-04 |
| `af9811b` | ci: lint, format, typecheck and DB-free tests on every push | CI mínimo | no aplica | — |
| `861d972` | fix(cashier): export the PDF when a text has an emoji or a non-Latin-1 letter | Cashier: la exportación a PDF puede romperse con emojis | `tests/frontend/pdf-text.test.ts`; mismo helper que el PDF de facturas probado en vivo con emoji (`a9f44fb`) | 🧪 2026-10-04 |
| `a9f44fb` | fix(pdf): keep free text drawable in the scheduling, invoice and editor PDFs | — | PDF de facturas pendientes con proveedor QA `🚀 Łódź ✓` → PDF de 2,9 KB sin error. Scheduling y editor: texto libre pasa por `encodableFor` (revisado) y `tests/frontend/pdf-text.test.ts` | ✅ 2026-10-04 |
| `7bebc39` | fix(logbook): stop solving, reopening, reading or editing deleted rows | Logbook: se pueden resolver, reabrir y marcar como leídas entradas…<br>Logbook: comentarios borrados que se pueden editar y volver a borrar | Entrada y comentario QA borrados: editar, borrar, resolver, reabrir y leer → 404 | ✅ 2026-10-04 |
| `acb24fa` | fix(messages): a removed participant can no longer edit or delete messages | Mensajería: un expulsado sigue editando y borrando sus mensajes | Participante expulsado de un grupo QA: editar y borrar su mensaje → 403 | ✅ 2026-10-04 |
| `0d2b9cf` | fix(maintenance): keep deleted reports out of non-admin lists and writes | Maintenance: partes borrados visibles y modificables | Parte QA borrado: fuera de las listas no admin; escrituras → 400 (status, priority y assign daban 500, arreglado en `25a3df3`) | ✅ 2026-10-04 |
| `66e5c4e` | fix(parking): keep the floor or number a booking edit leaves unchanged | Parking: cambiar solo la planta puede mover la reserva a otra plaza | Reserva QA en -3 #2: solo número 3 → -3 #3; solo planta -2 → -2 #3; ambos → -3 #4 | ✅ 2026-10-04 |
| `a77f94f` | fix(maintenance): only admins read a deleted report | — | Parte borrado: recep → 404, admin → 200 con `is_deleted` (otra IA y mía) | ✅ 2026-10-04 |
| `dbfd651` | fix(notifications): only admin and group-admin run the pending check | — | POST /api/notifications/check-pending como recep → 403 | ✅ 2026-10-04 |
| `ae68010` | docs(logbook): record that any user may re-route an entry by commenting | Logbook: un comentario cambia la prioridad o el departamento de una…<br>Cualquier rol lanza a mano la generación de notificaciones<br>Maintenance: el detalle, las fotos y el historial de un parte borrado… | no aplica | — |
| `7ef4e77` | fix(auth): leave the disabled demo-admin role out of the new rules | — | `tests/maintenance/deleted-reports.test.ts` (`isAdminRole` excluye `demo-admin`, desactivado) | 🧪 2026-10-04 |
| `05d58ff` | docs(todo): the demo user being disabled was not checked in the database | — | no aplica | — |
| `6dc2ba1` | fix(parking): free a deleted booking's days and validate list paging | Parking: borrar una reserva no libera sus días | Paginación inválida → 400 (otra IA). Reserva QA borrada: su plaza vuelve a salir libre en esas fechas (antes no) | ✅ 2026-10-04 |
| `3d8dd70` | fix(search): escape LIKE wildcards in every text search | — | /api/search?q=%% y q=__ → 0 resultados (q=ab → 5) | ✅ 2026-10-04 |
| `00cc932` | docs(release): plan the merge without squash and track the branch's fixes | — | no aplica | — |
| `e249dea` | docs(deploy): record the QA users created for the preview tests | — | no aplica | — |
| `25a3df3` | fix(maintenance): answer 400, not 500, when status, priority or assign hit a deleted report | — (hallado al probar `0d2b9cf`) | Parte QA borrado: PATCH /status, /priority y /assign → 400; el parte no cambia | ✅ 2026-10-04 |
| `5365d5c` | fix(db): add 'messages' to the notifications module ENUM | — (hallado al probar `25f3334`) | Migración aplicada en Aiven; mensaje urgente QA → aviso con `module: messages` | ✅ 2026-10-04 |
| `c0f61c1` | docs(db): add a migration runner and record the notifications ENUM as applied | — | `apply-migration.sh --dry-run` contra local y Aiven; segunda ejecución salta (idempotente) | ✅ 2026-10-04 |
| `0d923c1` | docs(verify): close every row of the branch's production checks | — | no aplica | — |
| `0b8b008` | fix(cashier): correct daily cash total inflated by trigger LEFT JOIN | Cashier: el total diario de efectivo se infla | Trigger en Aiven consultado: creado el 2026-09-29, sin el `LEFT JOIN` | ✅ 2026-10-04 |
| `f22d799` | fix(cashier): expected cash is fund + cash income - vouchers still out of the drawer | Cashier: el descuadre calculado en el servidor siempre es 0 | Día QA 2026-12-01: noche con vale 20 €, income 100 y recuento 270 → esperado 280, descuadre −10; mañana (vale arrastrado, uno de 5 € cancelado) y tarde → esperado 180; cierre que justifica el vale → 200. Editar income recalcula. Vale pendiente pasa al día siguiente (noche 2026-12-02: 15 €). Datos QA borrados después | ✅ 2026-10-04 |
| `56a2743` | docs(deploy): record the merge of PR #7 and how the branch continues | — | no aplica | — |
| `cbd338f` | docs(decisions): keep simple permissions in blacklist, F&B, maintenance and cashier | Blacklist, F&B (dos), mantenimiento y caja: permisos por acción (ADR-032, intencionado) | no aplica | — |
| `938fed1` | fix(fnb): reject negative, out-of-range and impossible-date manual entries | Fnb: `manualEntry` acepta cualquier número, incluido negativo o absurdamente grande | POST /api/fnb/entries con −50, 100.000.000, "12" (texto) o fecha 2026-02-31 → 400; no se escribió ninguna cifra | ✅ 2026-10-04 |
| `b578dbf` | fix(fnb): reject non-PDF uploads and bound PDF parsing time | Fnb: el PDF subido no se valida por contenido, solo por extensión o mimetype declarado | Subida de un texto como `.pdf` → 422 «El fichero no es un PDF»; PDF con cabecera y cuerpo roto → 422 «No se pudo leer el PDF». Límite de páginas y tiempo: `tests/fnb/pdf-upload-guard.test.ts` | ✅ 2026-10-04 |
| `9847ef7` | fix(backoffice): enforce invoice status transitions and add single payment revert | Backoffice: sin máquina de estados | Factura QA 36: pagar pendiente → 409; validar → 200; con validada, editar, validar, rechazar y subir PDF → 409; pagar → 200; recep en `/unpay` → 403; `/unpay` → 200 (`validated`, `paid_date` null), repetido → 409; id inexistente → 404; rechazar la pagada 35 → 409. Historial con el estado anterior real. Navegador: validadas sin Editar ni Subir PDF; botón «Revertir pago» en Pagadas revierte la 35 con confirmación. Datos QA restaurados | ✅ 2026-10-04 |
| `3de0012` | docs(decisions): keep parking payments editable in any booking state | Parking: importes cobrados editables siempre (ADR-032, intencionado; queda abierto el historial del cobro) | no aplica | — |
| `ebee351` | fix(scheduling): make constraint writes admin-only and keep locked cells consistent | Scheduling: cualquier rol edita o borra restricciones ajenas o ya aprobadas | recep: crear, editar y borrar restricción → 403; leer → 200. Admin, mes 114, restricción QA 54 (vacaciones de una empleada 9–10 de mayo, antes `L`): aprobar → celdas V bloqueadas; editar a 16–17 → 9–10 vuelven a `L` sin bloqueo y 16–17 quedan V bloqueadas; borrar → 16–17 vuelven a `L`. Historial: `manual_edit` «Restricción editada» y «Restricción eliminada». Celdas como estaban | ✅ 2026-10-04 |
| `005211e` | docs(decisions): keep the messaging user directory open to every role | Mensajería: directorio de emails y roles (ADR-032, intencionado) | no aplica | — |
| `c845875` | fix(parking): prevent double bookings and keep the availability calendar extended | Parking: doble reserva al cambiar fechas; carrera al crear reserva y en la entrada; el calendario se acaba el 2026-12-26 | Aiven tras el despliegue: calendario ampliado al arrancar hasta 2027-10-04. Plaza -3/10, marzo 2027: crear encima de otra → 400; mover solo fechas encima de otra → 400; mover a días libres → 200 y el calendario se recoloca; cancelar libera solo sus días (trigger migrado). Concurrencia: falló (una 201 y una 500), arreglado en `8db94f1` | ✅ 2026-10-04 (con `8db94f1`) |
| `8db94f1` | fix(parking): count overlapping bookings with a locking read | Parking: carrera al crear reserva | Dos rondas de 3 altas simultáneas en la misma plaza y fechas → una 201 y dos 400, sin 500. Reservas QA borradas y calendario limpio | ✅ 2026-10-04 |
| `567d9c4` | docs(todo): fold the backoffice pdf-download entry into retiring demo-admin | Backoffice: `/pdf-download` no exige `isRealAdmin` (se integra en «Retirar el rol demo-admin»; `demo` inactivo en Aiven) | no aplica | — |
| `93bb20d` | docs(todo): drop the cashier entry about writes to missing columns | Cashier: operaciones que fallan siempre en producción (ya resuelto por `210f445` y la migración 20260929; columnas comprobadas en Aiven) | no aplica | — |
| `16fc3bf` | fix(logbook): write each change and its history in one transaction | Logbook: el historial no es atómico | Aiven, entrada QA 141 con qa_recep: crear, editar, comentar, editar y borrar comentario, leído, no leído, resolver, reabrir y borrar → todo 200/201 y 11 filas en `logbook_history` en orden (la de borrado, después del borrado). Commit y rollback: `tests/logbook/atomic-history.test.ts` | ✅ 2026-10-04 |
| `4e2fabc` | refactor(notifications): type query params and catch clauses instead of any | Backend: 341 usos de `any` (otra IA) | Sin cambio de comportamiento: typecheck, lint y 883 tests tras la fusión; humo en preview (abajo, `c1510e2`) | ✅ 2026-10-04 |
| `47e1c0c` | refactor(messages): type catch clauses and query params instead of any | Backend: 341 usos de `any` (otra IA) | Sin cambio de comportamiento: typecheck, lint y 883 tests tras la fusión; humo en preview (abajo, `c1510e2`) | ✅ 2026-10-04 |
| `5f8670e` | refactor(checklist): type catch clause instead of any | Backend: 341 usos de `any` (otra IA) | Sin cambio de comportamiento: typecheck, lint y 883 tests tras la fusión; humo en preview (abajo, `c1510e2`) | ✅ 2026-10-04 |
| `e9cb75d` | refactor(conciliation): type catch clauses instead of any | Backend: 341 usos de `any` (otra IA) | Sin cambio de comportamiento: typecheck, lint y 883 tests tras la fusión; humo en preview (abajo, `c1510e2`) | ✅ 2026-10-04 |
| `bceb353` | refactor(blacklist): type catch clauses and query params instead of any | Backend: 341 usos de `any` (otra IA) | Sin cambio de comportamiento: typecheck, lint y 883 tests tras la fusión; humo en preview (abajo, `c1510e2`) | ✅ 2026-10-04 |
| `8ab6209` | refactor(group): type catch clauses and query params instead of any | Backend: 341 usos de `any` (otra IA) | Sin cambio de comportamiento: typecheck, lint y 883 tests tras la fusión; humo en preview (abajo, `c1510e2`) | ✅ 2026-10-04 |
| `916c378` | refactor(maintenance): type catch clauses and query params instead of any | Backend: 341 usos de `any` (otra IA) | Sin cambio de comportamiento: typecheck, lint y 883 tests tras la fusión; humo en preview (abajo, `c1510e2`) | ✅ 2026-10-04 |
| `2ab1bbc` | refactor(backoffice): type catch clauses and query params instead of any | Backend: 341 usos de `any` (otra IA) | Sin cambio de comportamiento: typecheck, lint y 883 tests tras la fusión; humo en preview (abajo, `c1510e2`) | ✅ 2026-10-04 |
| `af2f731` | refactor(cashier): type catch clauses and query params instead of any | Backend: 341 usos de `any` (otra IA) | Sin cambio de comportamiento: typecheck, lint y 883 tests tras la fusión; humo en preview (abajo, `c1510e2`) | ✅ 2026-10-04 |
| `5c282b3` | refactor(scheduling): type catch clauses and query params instead of any | Backend: 341 usos de `any` (otra IA) | Sin cambio de comportamiento: typecheck, lint y 883 tests tras la fusión; humo en preview (abajo, `c1510e2`) | ✅ 2026-10-04 |
| `2809745` | refactor(fnb): type catch clauses and query params instead of any | Backend: 341 usos de `any` (otra IA) | Sin cambio de comportamiento: typecheck, lint y 883 tests tras la fusión; humo en preview (abajo, `c1510e2`) | ✅ 2026-10-04 |
| `528c08a` | refactor(activity): type catch clauses instead of any | Backend: 341 usos de `any` (otra IA) | Sin cambio de comportamiento: typecheck, lint y 883 tests tras la fusión; humo en preview (abajo, `c1510e2`) | ✅ 2026-10-04 |
| `c1510e2` | Merge branch 'chore/backend-types' into claude/compassionate-planck-gh6aof | Backend: 341 usos de `any` | Preview tras desplegar: listados de mantenimiento, blacklist, facturas, caja, conciliación, grupos, F&B, notificaciones, mensajes, checklist, scheduling y parking → 200; logbook crear y borrar → 201/200 | ✅ 2026-10-04 |
| `c14ddcd` | fix(maintenance): keep NULL in the change history after the any cleanup | Regresión de la fusión anterior (historial con '' en vez de NULL; 5 tests) | Parte QA 041026-003 sin asignar → asignar a qa_mant: `maintenance_history` guarda `old_value` NULL en `assigned_to` y `assigned_type`. Parte borrado | ✅ 2026-10-04 |
| `26eedc1` | docs(todo): update the remaining any count after the backend typing | Backend: usos de `any` (quedan 55) | no aplica | — |
| `e72ac44` | docs(decisions): limit phase 1c to what must be fixed before publishing | Alcance de la fase 1c (ADR-033): TODO en «Antes de publicar» y «Después de publicar» | no aplica | — |
| `4748168` | fix(frontend): serve the design-system and fonts-test pages only in development | Proteger o quitar `/design-system` y `/fonts-test` | Navegador del dueño en preview: `/design-system` y `/fonts-test` → «HTTP ERROR 404» (la extensión no tiene permiso en ese dominio y curl solo ve el SSO de Vercel) | ✅ 2026-10-04 |
| `5b13897` | fix(auth): fail closed if Render's proxy chain changes | `trust proxy 3` depende de la red de Render | Preview: login fallido con `X-Forwarded-For` falso distinto cada vez → `ratelimit-remaining` 4, 3, 2 (la IP falsa se ignora y la cadena se reconoce como la esperada). El fallo cerrado ante una cadena distinta: `tests/auth/client-ip.test.ts` | ✅ 2026-10-04 |
| `1057c6d` | fix(scheduling): keep health data to admin and out of the logs | Scheduling: datos de salud expuestos | Preview: recep en `/months`, `/constraints/by-period` y `/shift-stats` → 403; admin → 200. Log de INFEASIBLE: `tests/scheduling/constraint-permissions.test.ts` | ✅ 2026-10-04 |
| `fd4ad23` | docs(verify): record the proxy chain and scheduling checks, move solver run retention to later | Retención de `solver_runs` (a «Después de publicar») | no aplica | — |
| `72a8224` | docs(roadmap): plan a public demo environment as phase 5 | Demo pública (fase 5) | no aplica | — |
| `40371d8` | feat(uploads): keep invoice PDFs, stamps and signatures private behind the API | Backoffice: PDFs de facturas, sello y firma públicos en Cloudinary | Preview tras migrar (`02b063d`): admin → PDF original y validado de las facturas 28, 29 y 34, sello 8 y firma 9 → 200 con su tipo; ZIP de 29 y 34 → 2 PDF; sin login → 401; recep en el sello → 403. Ninguna respuesta de facturas ni de sellos lleva `cloudinary.com`; `/pdf-url` → 404 | ✅ 2026-10-04 |
| `4d2bd3b` | feat(blacklist): serve guest photos as private files through the API | Fotos de huéspedes de blacklist públicas (mismo problema que backoffice) | Preview: ficha 11 guarda `/api/blacklist/images/…`; la foto → 200 `image/jpeg` para admin y recep; un nombre con `../` → 404; el detalle de la ficha no lleva `cloudinary.com` | ✅ 2026-10-04 |
| `86e76bc` | feat(uploads): serve maintenance photos and checklist attachments through the API | Maintenance: fotos públicas (la parte que queda pasa a «Después de publicar») | Preview: fotos 6 y 7 de los partes 060326-002 y 180526-002 → 200 `image/png` y `image/jpeg`; el detalle del parte no lleva `cloudinary.com`. Checklist sin adjuntos en Aiven: solo `tests/checklist/attachment-response.test.ts` | ✅ 2026-10-04 |
| `b67c3b2` | feat(frontend): load Google and Vercel Analytics only when configured | Cambio del dueño (analítica por variables de entorno) | Preview sin `NEXT_PUBLIC_GA_ID`: la CSP servida no incluye `googletagmanager.com` y el detector de `securitypolicyviolation` no registró ningún intento de cargarlo en todo el recorrido del 2026-10-04 (comprobación indirecta). Producción necesita `NEXT_PUBLIC_GA_ID` y `NEXT_PUBLIC_VERCEL_ANALYTICS` en Vercel para seguir igual que hoy | ✅ 2026-10-05 |
| `5c2b3a8` | chore: license the project under MIT | Licencia del proyecto | no aplica | — |
| `02b063d` | chore(uploads): script to make the already uploaded files private | Ficheros ya subidos siguen públicos | Aiven 2026-10-04: dry-run y `--apply`, 17 ficheros a `authenticated` (4 públicos: avatares y `main-sample`), filas de facturas, sellos, fotos y blacklist 11 reescritas; segunda pasada → 0 por migrar. Las 8 URL públicas de antes → 404 | ✅ 2026-10-04 |
| `db32a70` | docs(verify): record the private files migration and its checks in preview | Registro de la migración de ficheros privados | no aplica | — |
| `c1d01a6` | chore(db): drop private scripts and dumps, read local credentials from .env | Contraseñas de la BD escritas en ficheros versionados (parte del árbol; el historial, en la fase 2) | `git grep` de la contraseña de Aiven en el árbol → 0 ficheros; los 4 volcados siguen en disco y fuera del índice; `bash -n` de los 3 scripts locales; hash de `mock-data.sql` comprobado con bcrypt. Los scripts locales no se han ejecutado | ✅ 2026-10-04 |
| `76f9da1` | feat(frontend): add a Content-Security-Policy and COOP, drop X-Powered-By | Cabeceras del frontend en producción incompletas para L3 | Navegador en preview: la página trae CSP (origen de la API de preview y `vercel.live`), COOP `same-origin`, `X-Frame-Options` y sin `X-Powered-By`. Con un detector de `securitypolicyviolation`: panel, mantenimiento, logbook, parking, horarios, checklist, perfil, backoffice (visor y editor de PDF) y blacklist → 0 bloqueos. El editor dibuja el PDF sin `eval`. Sin hacer: HSTS `preload` (decisión del dueño; no recomendado) y SRI de Google Analytics (Google cambia el script) | ✅ 2026-10-04 |
| `1bc177c` | fix(uploads): let the frontend show private images from the API | Regresión de `40371d8`: el navegador bloqueaba las `<img>` de ficheros privados (CORP `same-origin` de helmet) | Navegador en preview: foto de la ficha 11 de blacklist (800 px) y su descarga por `fetch` (200, 109 824 B); foto 7 del parte 180526-002; sello y firma en el editor de PDF y en la configuración de backoffice → cargan; 0 bloqueos de CSP. Editor cerrado sin guardar (facturas 28 y 36 siguen pendientes) | ✅ 2026-10-04 |
| `7328f13` | test(scheduling): anonymize employee names in solver corpus fixtures (OpenCode) | Nombres reales del personal en el repo (fixtures del solver) | Revisado: el diff solo cambia nombres por `EMP_01`…`EMP_07`; ningún nombre del personal en `tests/scheduling-corpus/` ni `scheduling-solver/`. Tras la fusión: vitest de scheduling 132 passed, pytest del solver 105 passed, 1 skipped | ✅ 2026-10-04 |
| `f2eabdc` | Merge branch 'chore/anonymize-solver-fixtures' into claude/compassionate-planck-gh6aof | (fusión) | Los mismos tests | ✅ 2026-10-04 |
| `4829a52` | chore: remove test requests and the planning importer with real staff data | Nombres reales del personal en el repo (parte del árbol) | `git grep` en el árbol: sin los 18 `.http` ni el importador; los comentarios de los dos SQL usan `uuid-employee-N`. Sin cambio de comportamiento | ✅ 2026-10-05 |
| `223e847` | fix(auth): give every failed login the same minimum response time | Login: el tiempo de respuesta puede delatar si un usuario existe | Preview, 18 intentos fallidos por tipo, antes del arreglo: mediana 364 ms real frente a 340 ms inexistente (Mann-Whitney p ≈ 0,048). Después: 666 frente a 663 ms (p ≈ 0,27; un intento de 63,8 s fue el arranque en frío de Render). `tests/auth/login-timing.test.ts` | ✅ 2026-10-05 |
| `a227edc` | docs(todo): fix the login timing entry and drop the done CSP entry | (documentación) | no aplica | — |
| `c1e213d` | chore(checklist): replace the real email distribution list with example contacts | Correos reales de personas en el checklist (hallado en el barrido del 2026-10-04) | `git grep` en el árbol de los dominios reales → 0; tests del checklist 28 passed. No probado en la interfaz | ✅ 2026-10-05 |
| `c337c2d` | docs(gitclean): add what the history analysis found | Análisis de la fase 2 | no aplica | — |
| `55efaeb` | docs(gitclean): note that the old Anthropic key is revoked | (documentación) | no aplica | — |
| `5794432` | Merge pull request #8 from bpstack/claude/compassionate-planck-gh6aof | Fase 1c en producción | Producción tras el despliegue (Vercel y Render): cabeceras con CSP (con Google Analytics), COOP y HSTS, sin `X-Powered-By`; la API sirve las rutas nuevas de ficheros; en el navegador, foto de la ficha 11 de blacklist (800 px), sello y firma en el editor de PDF (cerrado sin guardar), PDF de la factura 34 por la API (200, 266 575 B), Google Analytics y Vercel Analytics cargan; recorrido por panel, mantenimiento, logbook, parking y perfil. Única pega: la CSP bloquea 2 píxeles de Google Analytics a `www.google.es` (audiencias de Google Signals), sin efecto en la medición | ✅ 2026-10-05 |
| `42f6ac0` | chore: replace the remaining staff names with invented ones | Nombres reales del personal en el árbol (hallado al preparar las listas de la fase 2) | `git grep` en el árbol de los nombres del personal → solo el autor; ninguna fila del checklist en Aiven usa el id antiguo de la guía; tests de restricciones 37 passed. No probado en la interfaz | ✅ 2026-10-05 |
| `2fe93a0` | docs(gitclean): record the approved phase 2 lists | (documentación) | no aplica | — |
| `c50b09a` | test(fnb): replace the real Opera revenue report with a synthetic sample | Informe Opera real de ingresos en los fixtures (hallado en el barrido de OpenCode) | El texto extraído del PDF sintético tiene las mismas 344 líneas y estructura que el real (solo cambian cifras y nombre del hotel); backend 909 passed. No probado subiendo el PDF en la interfaz | ✅ 2026-10-05 |
| `0ad5967` | docs(gitclean): record the OpenCode sweep and the dry run | (documentación) | no aplica | — |
| `d12e117` | docs(gitclean): record the first real run and reword a line the rules touched | (documentación) | no aplica | — |
| `98e6fb9` | docs(verify): add the rows for 0ad5967 and d12e117 | (documentación) | no aplica | — |
| `2d1005a` | Merge pull request #9 from bpstack/claude/compassionate-planck-gh6aof | `main` con los arreglos previos a la limpieza | CI de la PR en verde (backend y frontend); árbol de `main` igual al de la rama. Despliegue de producción no revisado: solo cambian tests, documentación, un placeholder y el id de una guía | ✅ 2026-10-05 |
| `cd3b7fa` | docs(gitclean): record the final rewrite and its audit | (documentación) | no aplica | — |
| `b6f37ff` | feat(checklist): load the hotel's real content from a private repository at build time | (revertido en `a9e8842`) | no aplica | — |
| `ee07328` | chore(checklist): replace the hotel's procedures with example content | (revertido en `a9e8842`) | no aplica | — |
| `47ceb9b` | chore: parametrize the hotel name and the local paths | Nombre del hotel y rutas personales en el código | El pie impreso lee `NEXT_PUBLIC_HOTEL_NAME` con «Hotel PMS» por defecto; CI en verde. Pie impreso no revisado en el preview | ✅ 2026-10-05 |
| `27b6761` | chore(frontend): replace the screenshots that showed a staff user | Capturas con un usuario del personal | Revisado por el propietario en el preview | ✅ 2026-10-05 |
| `34630b8` | test(fnb): remove chain and partner names from the synthetic Opera sample | Nombres de la cadena y del partner en la muestra | CI en verde (backend) | ✅ 2026-10-05 |
| `c9b4323` | docs: describe the hotel's files without their names | (documentación) | no aplica | — |
| `a9e8842` | revert(checklist): keep the procedures in the repository instead of a private one | Contenido del checklist | CI en verde; ver `fa85339` | ✅ 2026-10-05 |
| `fa85339` | chore(checklist): generalize the hotel's procedures | Nombres de la cadena, sus sistemas y partners en el checklist | Las 22 referencias `guide:`/`reference:` de las tareas apuntan a ficheros existentes; tareas del backend idénticas a las del frontend; el propietario abrió los enlaces en el preview | ✅ 2026-10-05 |
| `563b5b1` | style(checklist): format the night audit tasks | (formato) | no aplica | — |
| `fb877ac` | docs: point commit references to the rewritten history | (documentación) | Los 176 hashes citados existen en el repositorio nuevo, con el mismo asunto que en el original (uno solo cambia en los hashes que cita) | ✅ 2026-10-05 |
| `2b84b0a` | build: pin the Node major version in .nvmrc | — | no aplica | — |
| `aab1848` | docs(todo): close the pre-publication section | (documentación) | no aplica | — |
| `2fd2f56` | docs(gitclean): record the third pass, its audit and the private publication | (documentación) | no aplica | — |
| `d197ad6` | docs(todo): drop the local path of the harness repository | (documentación) | no aplica | — |
| `5b216a0` | docs(roadmap): close phases 1c and 2 and make publication current | (documentación) | no aplica | — |
| `0f237d0` | docs(decisions): record the publication order and when to rotate | (documentación) | no aplica | — |
