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

- `f9d1541` y `2ed0abb` (fnb) y sus reverts `8584e93` y `6a67ab3`: se anulan
  entre sí y no cambian código. Sus dos puntos siguen abiertos en `TODO.md`.
- `baa8ed3`: documentación del entorno preview.
- Las filas marcadas «(otra IA)» las probó un segundo modelo con el mismo entorno y las mismas reglas; se revisaron sus peticiones. Las que había probado contra la ruta equivocada (`7f8ea41`, `fe4e006`, `80c540e` y las cuatro de logbook) se repitieron.

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

## Arreglos

| Commit | Qué cambia | Punto de `TODO.md` que cierra | Prueba | Resultado |
| ------ | ---------- | ----------------------------- | ------ | --------- |
| `ec8e901` | fix(logbook): validate messages, dates, route params and list queries | Logbook: validación incompleta | offset -1, limit 501, fecha 2026-02-31, mensaje vacío, importancia inválida, id no numérico → 400 | ✅ 2026-10-04 |
| `0a47a7f` | fix(logbook): take the entry author from the session, not the body | Logbook: cualquiera puede crear entradas en nombre de otro | qa_recep crea entrada con `author_id` de admin → se guarda con qa_recep | ✅ 2026-10-04 |
| `dba54de` | chore(githooks): mark commit-msg and pre-push as executable | — | no aplica | — |
| `7f8ea41` | fix(conciliation): validate dates, form entries, status and route params | Conciliation: sin validación Zod, a diferencia del resto del proyecto<br>Conciliation: un `reason` que no sea uno de los válidos falla en… | PUT /conciliations/:id/form con motivo inventado, importe sin número o líneas que faltan → 400 Zod | ✅ 2026-10-04 |
| `a592aae` | fix(search): limit global search to the modules the role can open | `mantenimiento` lee la lista negra por la búsqueda global | /api/search?q=ab|an|er: admin y recep ven parking y blacklist; mant solo maintenance y groups | ✅ 2026-10-04 |
| `cdb871a` | fix(activity): show only activity from modules the role can open | `mantenimiento` lee actividad de módulos vetados por `/api/activity` | /api/activity/recent: mant solo ve maintenance y groups | ✅ 2026-10-04 |
| `df41041` | fix(api): stop sending caught error messages in 500 responses | Maintenance: los errores 500 devuelven el mensaje de MySQL<br>El controlador de notificaciones devuelve `error.message` de MySQL<br>Parking: `listAvailableSpots` devuelve el mensaje de error de MySQL | `tests/security/no-raw-error-messages.test.ts` | 🧪 2026-10-04 |
| `a621139` | docs(todo): record how to merge the working branch without its extra history | — | no aplica | — |
| `3993e35` | fix(cashier): answer known shift, payment and count errors with 4xx | Cashier: los 500 de turnos, pagos y recuentos devuelven… | `tests/cashier/cashier-errors.test.ts` | 🧪 2026-10-04 |
| `96b9393` | fix(checklist): cap image uploads in multer instead of after buffering | Checklist: subida de imágenes sin límite de tamaño en multer | Avatar de 3 MB (límite 2 MB) → 413; checklist usa el mismo middleware | ✅ 2026-10-04 |
| `f2d19b0` | fix(uploads): check image uploads by their bytes, not the declared type | Blacklist: el tipo de imagen solo se valida por el mimetype que declara… | Avatar y blacklist con bytes no-imagen declarados `image/png` → 400 | ✅ 2026-10-04 |
| `33a0f00` | fix(uploads): use the checked image upload for maintenance and avatars | — | Avatar con tipo `text/plain` → 400; PNG válido → 200 | ✅ 2026-10-04 |
| `f6dc0ff` | fix(checklist): reject unknown checklists, foreign steps and bad record ids | Checklist: `:id` sin validar<br>Checklist: comentarios e imágenes no comprueban que el paso exista | Historial de un checklist inexistente → 404 (otra IA) | ✅ 2026-10-04 |
| `4051153` | fix(checklist): validate the history query instead of failing with 500 | Checklist: fechas de `/history` sin validar | /checklists/:id/history con fecha imposible, limit 0 y 101 → 400 (otra IA) | ✅ 2026-10-04 |
| `acc3f3d` | fix(maintenance): reject blank and oversized texts and invalid route ids | Maintenance: validación incompleta | Parte con título en blanco o descripción corta → 400 (otra IA) | ✅ 2026-10-04 |
| `d26cca9` | fix(blacklist): reject blank texts and impossible dates | — | Blacklist con nombre en blanco o fecha imposible → 400 (otra IA) | ✅ 2026-10-04 |
| `fe4e006` | fix(api): reject impossible calendar dates in every date param and field | — | /conciliations/day/2026-02-31 → 400 `INVALID_DATE_FORMAT`; /activity/recent?date_from=2026-02-31 → 400 | ✅ 2026-10-04 |
| `bd6cfe4` | fix(notifications): keep direct links inside the app and validate notices | `direct_link` de las notificaciones admite cualquier URL<br>Notificaciones manuales: destinatarios y textos sin validar | `direct_link` `//…`, `/…`, `https://…`, `javascript:` → 400; `userIds` no UUID y título vacío → 400 | ✅ 2026-10-04 |
| `42e827f` | docs(todo): restore the blank line between the groups and scheduling blocks | — | no aplica | — |
| `42fc46f` | fix(messages): validate participants and query params, escape LIKE search | Mensajería: sin validación de entrada ni transacción al crear<br>Mensajería: `limit` sin validar, `LIKE` sin escapar y fallo de la… | Conversación con participantes repetidos o UUID inválido → 400 (otra IA) | ✅ 2026-10-04 |
| `8948e37` | docs(todo): detail why the parking booking source is lost and what to decide | — | no aplica | — |
| `1949da7` | fix(logbook): answer 403 when editing someone else's entry | Logbook: editar una entrada ajena devuelve 500 | qa_gadmin edita la entrada de qa_recep → 403 `LOGBOOK_ONLY_AUTHOR_UPDATE` | ✅ 2026-10-04 |
| `9715966` | chore(backend): remove the unused email service and EJS view engine | — | Backend de preview arranca y sirve sin el servicio de email ni EJS | ✅ 2026-10-04 |
| `415b767` | fix(api): send Cache-Control: no-store on every API response | El API no envía `Cache-Control: no-store` | GET /api/auth/me → `Cache-Control: no-store` | ✅ 2026-10-04 |
| `1720bdd` | fix(backoffice): allow-list the columns supplier and invoice edits may set | Backoffice: inyección SQL por los nombres de campo | PATCH proveedor QA con clave `"notes = (SELECT 1), name"` → claves ignoradas, solo cambia `name` | ✅ 2026-10-04 |
| `5640950` | fix(backoffice): only fetch invoice PDFs from our own Cloudinary cloud | Backoffice: SSRF en la descarga de PDF | Factura con PDF en 169.254.169.254, dominio externo u otra cuenta de Cloudinary → 400 | ✅ 2026-10-04 |
| `25c0fc5` | fix(cloudinary): only delete files from the folder of the module asking | Blacklist: `DELETE /upload/:publicId` borra cualquier recurso de…<br>Backoffice: borrado arbitrario en Cloudinary | Factura con `public_id` fuera de `invoices/` (crear y validar) → 400 | ✅ 2026-10-04 |
| `e4a0254` | fix(backoffice): accept only integer year and month in batch payments | Backoffice: el pago en lote paga todos los meses con un objeto | Batch payment con year 2026.5 o "2026" → 400 (otra IA) | ✅ 2026-10-04 |
| `c5ee754` | fix(scheduling): stop constraint edits from setting their own status | — | PUT /scheduling/constraints/:id con `status: approved` → la clave se descarta (400 «al menos un campo»); PUT …/approve como recep → 403 | ✅ 2026-10-04 |
| `b94c5d3` | docs(todo): close the scheduling self-approval entry, note the open decision | Scheduling: un recepcionista puede aprobarse sus propias solicitudes | no aplica | — |
| `2569c05` | fix(parking): validate the booking update body against its columns | Parking: rutas de edición sin Zod | Reserva de parking con importe negativo o método de pago desconocido → 400 (otra IA) | ✅ 2026-10-04 |
| `59f8450` | fix(scheduling): bound bulk edits and validate employee id lists | Scheduling: validación incompleta | Edición masiva de 32 días → 400 (otra IA) | ✅ 2026-10-04 |
| `b931244` | fix(scheduling): stop sending solver internals in generate errors | Scheduling: errores del solver y del arranque devueltos al cliente. | `tests/security/no-raw-error-messages.test.ts` | 🧪 2026-10-04 |
| `7284910` | fix(blacklist): accept only images uploaded through the blacklist upload | Blacklist: el array `images` acepta cualquier URL | POST /api/blacklist con imagen de otro dominio o de otra carpeta de Cloudinary → 400 «Cada imagen debe haberse subido desde la lista negra» | ✅ 2026-10-04 |
| `91c8063` | fix(cloudinary): sanitise new public ids, accept legacy ones when deleting | Maintenance: `public_id` con el nombre original sin sanear. | Avatar subido como `mi foto ñ (1)#x.png` → public_id `avatar_…_mi_foto____1__x` (borrado después) | ✅ 2026-10-04 |
| `c95514d` | fix(cloudinary): check control characters without a control-character regex | — | `tests/uploads/cloudinary-url.test.ts` | 🧪 2026-10-04 |
| `65308c1` | chore(conciliation): drop the commented-out admin check in the monthly status | Conciliation: comentario de código muerto en el controlador mensual | Recorrido de los 17 módulos como admin en preview: cargan y pintan sin peticiones fallidas (fuera de la barra de Vercel); CI verde | ✅ 2026-10-04 |
| `527e6ad` | docs(tests): replace the outdated backend tests README | `backend/tests/README.md` está desfasado | no aplica | — |
| `84d79a0` | chore(db): keep a single copy of the Aiven CA certificate | Certificado de Aiven duplicado | El backend de preview conecta a Aiven con TLS verificado y `apply-migration.sh` usa la misma CA | ✅ 2026-10-04 |
| `852a4b9` | chore(env): bring the .env.example files in line with the code | Actualizar los `.env.example` | El backend de preview arranca con las variables de producción; `.env.example` sin valores | ✅ 2026-10-04 |
| `63c6bd6` | docs(agents): note that the unused email service is gone | Corregir el `AGENTS.md` raíz sobre next-intl | no aplica | — |
| `1b0619b` | docs(cashier): stop presenting the daily totals trigger as reliable | Corregir el `AGENTS.md` de cashier | no aplica | — |
| `009dd3c` | docs(logbook): document the input checks and close the stale entry | Corregir `backend/services/logbook/AGENTS.md` | no aplica | — |
| `738807c` | docs(todo): close the module and parking AGENTS.md entries, already fixed | Corregir los `AGENTS.md` de módulo<br>Corregir los `AGENTS.md` de parking | no aplica | — |
| `69c3d0d` | docs(blacklist): describe the real blacklist_entries columns and soft delete | Corregir el `AGENTS.md` de blacklist | no aplica | — |
| `9a2258c` | docs(backoffice): describe assets, both PDFs and the unenforced lifecycle | Corregir el `AGENTS.md` de backoffice | no aplica | — |
| `f3b6175` | docs(checklist): describe the param validation and the real table names | Corregir el `AGENTS.md` de checklist | no aplica | — |
| `e3f8c11` | refactor(api): drop param checks the route guards already make | — | Recorrido de los 17 módulos como admin en preview: cargan y pintan sin peticiones fallidas (fuera de la barra de Vercel); CI verde | ✅ 2026-10-04 |
| `ab2700b` | refactor(maintenance): drop the per-handler id checks the route guard makes | — | Recorrido de los 17 módulos como admin en preview: cargan y pintan sin peticiones fallidas (fuera de la barra de Vercel); CI verde | ✅ 2026-10-04 |
| `79f5831` | refactor(parking): call isCalendarDate directly instead of a one-line wrapper | — | Recorrido de los 17 módulos como admin en preview: cargan y pintan sin peticiones fallidas (fuera de la barra de Vercel); CI verde | ✅ 2026-10-04 |
| `3cd0e52` | chore(backend): remove the parking PDF placeholder and dead config code | — | Recorrido de los 17 módulos como admin en preview: cargan y pintan sin peticiones fallidas (fuera de la barra de Vercel); CI verde | ✅ 2026-10-04 |
| `34888a8` | chore(backend): remove the unused conciliation logic and payment method repo | — | Recorrido de los 17 módulos como admin en preview: cargan y pintan sin peticiones fallidas (fuera de la barra de Vercel); CI verde | ✅ 2026-10-04 |
| `229d9f7` | refactor(backend): remove exports nothing uses | — | Recorrido de los 17 módulos como admin en preview: cargan y pintan sin peticiones fallidas (fuera de la barra de Vercel); CI verde | ✅ 2026-10-04 |
| `196cb20` | docs(scheduling): fix PI and FO, the weights claim and the rotation emitter | Corregir los `AGENTS.md` de scheduling | no aplica | — |
| `dcfae5b` | chore(backend): remove the unused nodemailer dependency | — | Backend de preview arranca sin `nodemailer` | ✅ 2026-10-04 |
| `9be16b1` | fix(messages): store message notifications under the messages module | Notificaciones de mensajes con `module: 'system'` | Mensaje urgente QA → aviso con `module: messages`. Fallaba («Data truncated»): faltaba la migración, aplicada con `ff47ab7` | ✅ 2026-10-04 |
| `acf6feb` | fix(logbook): stop returning author and editor emails nobody displays | Emails de más en las respuestas de logbook | Listas de logbook: `author_name` sin campos de email | ✅ 2026-10-04 |
| `7090b47` | fix(checklist): keep attachment public_id on the server | Checklist: respuestas con campos internos | `tests/checklist/attachment-response.test.ts` | 🧪 2026-10-04 |
| `10064b1` | fix(checklist): reject control characters in comments, escape them in reports | Checklist: `checklist-report.ts` imprime los comentarios sin filtrar… | Comentario de checklist con ESC y BEL → 400 «caracteres no válidos»; con salto de línea → 201 (borrado después) | ✅ 2026-10-04 |
| `683b618` | refactor(blacklist): remove the unused image delete endpoint and API methods | Blacklist: `DELETE /upload/:publicId` borra cualquier imagen de la…<br>Ids sin codificar en las URL de `blacklistApi.ts` | DELETE /api/blacklist/upload/:id → 404 «Ruta no encontrada» | ✅ 2026-10-04 |
| `7804790` | refactor(parking): remove the analytics API and occupancy query nobody calls | Parking: código sin uso | GET /api/parking/stats/analytics/{trends,comparison,performance} → 404 | ✅ 2026-10-04 |
| `2f19ca8` | chore(frontend): remove the unused auth routes and dependencies | Quitar código muerto | Recorrido de los 17 módulos como admin en preview: cargan y pintan sin peticiones fallidas (fuera de la barra de Vercel); CI verde | ✅ 2026-10-04 |
| `4cbfbf7` | chore(frontend): remove the old backoffice tabs and their mock data | Backoffice: notas `IMPORTANT-PRODUCTION.MD` obsoletas | Recorrido de los 17 módulos como admin en preview: cargan y pintan sin peticiones fallidas (fuera de la barra de Vercel); CI verde | ✅ 2026-10-04 |
| `5df5e86` | chore(frontend): remove 19 unimported files and 3 unused dependencies | — | Recorrido de los 17 módulos como admin en preview: cargan y pintan sin peticiones fallidas (fuera de la barra de Vercel); CI verde | ✅ 2026-10-04 |
| `a67fe04` | refactor(frontend): remove unused exports and fix the real lint errors | — | Recorrido de los 17 módulos como admin en preview: cargan y pintan sin peticiones fallidas (fuera de la barra de Vercel); CI verde | ✅ 2026-10-04 |
| `eb216e4` | fix(reports): filter maintenance by the statuses the backend uses | Informes: la sección de mantenimiento filtra por estados que no… | Los 7 estados del filtro de informes → 200 en /api/maintenance; los antiguos `pending` y `resolved` → 400 | ✅ 2026-10-04 |
| `1de7d8b` | fix(blacklist): render search highlights as React nodes, not injected HTML | Blacklist: resaltado de búsqueda con `dangerouslySetInnerHTML` | Búsqueda "Mar" en blacklist → 6 `<mark>` en nombre y documento, solo con nodos de texto | ✅ 2026-10-04 |
| `1498c48` | fix(backoffice): neutralise spreadsheet formulas in the paid invoices CSV | Backoffice: inyección de fórmulas en la exportación CSV | CSV de pagadas con proveedor QA `=1+1 QA-Supplier-csv` → celda `"'=1+1 QA-Supplier-csv"` (blob interceptado, sin descarga) | ✅ 2026-10-04 |
| `af883d4` | style(frontend): apply Prettier to the TypeScript and JavaScript files | — | no aplica | — |
| `1d5fa18` | refactor(logbook): drop the req.user.isAdmin check that never holds | Logbook: comprobación de `isAdmin` que nunca se cumple<br>`backend/scheduling-solver/AGENTS.md` cita `backend/debug-*.js` | Recorrido de los 17 módulos como admin en preview: cargan y pintan sin peticiones fallidas (fuera de la barra de Vercel); CI verde | ✅ 2026-10-04 |
| `1c56b24` | fix(parking): read every occupying booking on the status map and wizard | Parking: el mapa de estado deja de ver reservas a partir de 50 | Mapa de estado de parking carga (20 plazas); el caso de más de 50 reservas lo cubre `tests/frontend/fetch-all-pages.test.ts` | 🧪 2026-10-04 |
| `60265d7` | refactor(blacklist): drop the created_by list filter and two unused actions | Blacklist: filtro `created_by` sin restricción | Recorrido de los 17 módulos como admin en preview: cargan y pintan sin peticiones fallidas (fuera de la barra de Vercel); CI verde | ✅ 2026-10-04 |
| `a459dbe` | docs(blacklist): note that no screen restores a deleted entry | — | no aplica | — |
| `60189a3` | chore(fnb): log uploads through the logger and fix the cache docs | Corregir el `AGENTS.md` de `fnb`<br>Fnb: `console.log` sin pasar por el logger del proyecto<br>Corregir el comentario de `canAccessFnb` | Recorrido de los 17 módulos como admin en preview: cargan y pintan sin peticiones fallidas (fuera de la barra de Vercel); CI verde | ✅ 2026-10-04 |
| `dc6565c` | ci: lint, format, typecheck and DB-free tests on every push | CI mínimo | no aplica | — |
| `8138448` | fix(cashier): export the PDF when a text has an emoji or a non-Latin-1 letter | Cashier: la exportación a PDF puede romperse con emojis | `tests/frontend/pdf-text.test.ts`; mismo helper que el PDF de facturas probado en vivo con emoji (`d4ad8e1`) | 🧪 2026-10-04 |
| `d4ad8e1` | fix(pdf): keep free text drawable in the scheduling, invoice and editor PDFs | — | PDF de facturas pendientes con proveedor QA `🚀 Łódź ✓` → PDF de 2,9 KB sin error. Scheduling y editor: texto libre pasa por `encodableFor` (revisado) y `tests/frontend/pdf-text.test.ts` | ✅ 2026-10-04 |
| `809dcd8` | fix(logbook): stop solving, reopening, reading or editing deleted rows | Logbook: se pueden resolver, reabrir y marcar como leídas entradas…<br>Logbook: comentarios borrados que se pueden editar y volver a borrar | Entrada y comentario QA borrados: editar, borrar, resolver, reabrir y leer → 404 | ✅ 2026-10-04 |
| `24e7d24` | fix(messages): a removed participant can no longer edit or delete messages | Mensajería: un expulsado sigue editando y borrando sus mensajes | Participante expulsado de un grupo QA: editar y borrar su mensaje → 403 | ✅ 2026-10-04 |
| `79417b5` | fix(maintenance): keep deleted reports out of non-admin lists and writes | Maintenance: partes borrados visibles y modificables | Parte QA borrado: fuera de las listas no admin; escrituras → 400 (status, priority y assign daban 500, arreglado en `76e9c9f`) | ✅ 2026-10-04 |
| `7d8b419` | fix(parking): keep the floor or number a booking edit leaves unchanged | Parking: cambiar solo la planta puede mover la reserva a otra plaza | Reserva QA en -3 #2: solo número 3 → -3 #3; solo planta -2 → -2 #3; ambos → -3 #4 | ✅ 2026-10-04 |
| `03a6b4e` | fix(maintenance): only admins read a deleted report | — | Parte borrado: recep → 404, admin → 200 con `is_deleted` (otra IA y mía) | ✅ 2026-10-04 |
| `26ba020` | fix(notifications): only admin and group-admin run the pending check | — | POST /api/notifications/check-pending como recep → 403 | ✅ 2026-10-04 |
| `fc55127` | docs(logbook): record that any user may re-route an entry by commenting | Logbook: un comentario cambia la prioridad o el departamento de una…<br>Cualquier rol lanza a mano la generación de notificaciones<br>Maintenance: el detalle, las fotos y el historial de un parte borrado… | no aplica | — |
| `1f4bd5f` | fix(auth): leave the disabled demo-admin role out of the new rules | — | `tests/maintenance/deleted-reports.test.ts` (`isAdminRole` excluye `demo-admin`, desactivado) | 🧪 2026-10-04 |
| `1c6886c` | docs(todo): the demo user being disabled was not checked in the database | — | no aplica | — |
| `1b7c3f1` | fix(parking): free a deleted booking's days and validate list paging | Parking: borrar una reserva no libera sus días | Paginación inválida → 400 (otra IA). Reserva QA borrada: su plaza vuelve a salir libre en esas fechas (antes no) | ✅ 2026-10-04 |
| `80c540e` | fix(search): escape LIKE wildcards in every text search | — | /api/search?q=%% y q=__ → 0 resultados (q=ab → 5) | ✅ 2026-10-04 |
| `98ce180` | docs(release): plan the merge without squash and track the branch's fixes | — | no aplica | — |
| `0d97dac` | docs(deploy): record the QA users created for the preview tests | — | no aplica | — |
| `76e9c9f` | fix(maintenance): answer 400, not 500, when status, priority or assign hit a deleted report | — (hallado al probar `79417b5`) | Parte QA borrado: PATCH /status, /priority y /assign → 400; el parte no cambia | ✅ 2026-10-04 |
| `ff47ab7` | fix(db): add 'messages' to the notifications module ENUM | — (hallado al probar `9be16b1`) | Migración aplicada en Aiven; mensaje urgente QA → aviso con `module: messages` | ✅ 2026-10-04 |
| `e3b2667` | docs(db): add a migration runner and record the notifications ENUM as applied | — | `apply-migration.sh --dry-run` contra local y Aiven; segunda ejecución salta (idempotente) | ✅ 2026-10-04 |
| `ee2cb48` | docs(verify): close every row of the branch's production checks | — | no aplica | — |
| `ad9d14b` | fix(cashier): correct daily cash total inflated by trigger LEFT JOIN | Cashier: el total diario de efectivo se infla | Trigger en Aiven consultado: creado el 2026-09-29, sin el `LEFT JOIN` | ✅ 2026-10-04 |
| `b376ab7` | fix(cashier): expected cash is fund + cash income - vouchers still out of the drawer | Cashier: el descuadre calculado en el servidor siempre es 0 | Día QA 2026-12-01: noche con vale 20 €, income 100 y recuento 270 → esperado 280, descuadre −10; mañana (vale arrastrado, uno de 5 € cancelado) y tarde → esperado 180; cierre que justifica el vale → 200. Editar income recalcula. Vale pendiente pasa al día siguiente (noche 2026-12-02: 15 €). Datos QA borrados después | ✅ 2026-10-04 |
| `68f62b1` | docs(deploy): record the merge of PR #7 and how the branch continues | — | no aplica | — |
| `2c6f01b` | docs(decisions): keep simple permissions in blacklist, F&B, maintenance and cashier | Blacklist, F&B (dos), mantenimiento y caja: permisos por acción (ADR-032, intencionado) | no aplica | — |
| `0dd1610` | fix(fnb): reject negative, out-of-range and impossible-date manual entries | Fnb: `manualEntry` acepta cualquier número, incluido negativo o absurdamente grande | POST /api/fnb/entries con −50, 100.000.000, "12" (texto) o fecha 2026-02-31 → 400; no se escribió ninguna cifra | ✅ 2026-10-04 |
| `3cacb9e` | fix(fnb): reject non-PDF uploads and bound PDF parsing time | Fnb: el PDF subido no se valida por contenido, solo por extensión o mimetype declarado | Subida de un texto como `.pdf` → 422 «El fichero no es un PDF»; PDF con cabecera y cuerpo roto → 422 «No se pudo leer el PDF». Límite de páginas y tiempo: `tests/fnb/pdf-upload-guard.test.ts` | ✅ 2026-10-04 |
