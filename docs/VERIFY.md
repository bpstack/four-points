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
la nota o al punto nuevo de `TODO.md`) · — no aplica (documentación, formato,
CI).

**Fuera de la tabla:**

- `f9d1541` y `2ed0abb` (fnb) y sus reverts `8584e93` y `6a67ab3`: se anulan
  entre sí y no cambian código. Sus dos puntos siguen abiertos en `TODO.md`.
- `baa8ed3`: documentación del entorno preview.

## Estado previo

- **CI** de la rama en verde (2026-10-04, run `37198286379`): backend con lint,
  formato, tipos y tests; frontend con lint, formato y tipos. El build del
  frontend lo valida Vercel.
- **Entorno preview** operativo (2026-10-04): login de `admin`, el bundle llama
  a `api-preview` y el CORS acepta el origen de preview.

## Arreglos

| Commit | Qué cambia | Punto de `TODO.md` que cierra | Prueba | Resultado |
| ------ | ---------- | ----------------------------- | ------ | --------- |
| `ec8e901` | fix(logbook): validate messages, dates, route params and list queries | Logbook: validación incompleta |  | ⏳ |
| `0a47a7f` | fix(logbook): take the entry author from the session, not the body | Logbook: cualquiera puede crear entradas en nombre de otro |  | ⏳ |
| `dba54de` | chore(githooks): mark commit-msg and pre-push as executable | — | no aplica | — |
| `7f8ea41` | fix(conciliation): validate dates, form entries, status and route params | Conciliation: sin validación Zod, a diferencia del resto del proyecto<br>Conciliation: un `reason` que no sea uno de los válidos falla en… |  | ⏳ |
| `a592aae` | fix(search): limit global search to the modules the role can open | `mantenimiento` lee la lista negra por la búsqueda global |  | ⏳ |
| `cdb871a` | fix(activity): show only activity from modules the role can open | `mantenimiento` lee actividad de módulos vetados por `/api/activity` |  | ⏳ |
| `df41041` | fix(api): stop sending caught error messages in 500 responses | Maintenance: los errores 500 devuelven el mensaje de MySQL<br>El controlador de notificaciones devuelve `error.message` de MySQL<br>Parking: `listAvailableSpots` devuelve el mensaje de error de MySQL |  | ⏳ |
| `a621139` | docs(todo): record how to merge the working branch without its extra history | — | no aplica | — |
| `3993e35` | fix(cashier): answer known shift, payment and count errors with 4xx | Cashier: los 500 de turnos, pagos y recuentos devuelven… |  | ⏳ |
| `96b9393` | fix(checklist): cap image uploads in multer instead of after buffering | Checklist: subida de imágenes sin límite de tamaño en multer |  | ⏳ |
| `f2d19b0` | fix(uploads): check image uploads by their bytes, not the declared type | Blacklist: el tipo de imagen solo se valida por el mimetype que declara… |  | ⏳ |
| `33a0f00` | fix(uploads): use the checked image upload for maintenance and avatars | — |  | ⏳ |
| `f6dc0ff` | fix(checklist): reject unknown checklists, foreign steps and bad record ids | Checklist: `:id` sin validar<br>Checklist: comentarios e imágenes no comprueban que el paso exista |  | ⏳ |
| `4051153` | fix(checklist): validate the history query instead of failing with 500 | Checklist: fechas de `/history` sin validar |  | ⏳ |
| `acc3f3d` | fix(maintenance): reject blank and oversized texts and invalid route ids | Maintenance: validación incompleta |  | ⏳ |
| `d26cca9` | fix(blacklist): reject blank texts and impossible dates | — |  | ⏳ |
| `fe4e006` | fix(api): reject impossible calendar dates in every date param and field | — |  | ⏳ |
| `bd6cfe4` | fix(notifications): keep direct links inside the app and validate notices | `direct_link` de las notificaciones admite cualquier URL<br>Notificaciones manuales: destinatarios y textos sin validar |  | ⏳ |
| `42e827f` | docs(todo): restore the blank line between the groups and scheduling blocks | — | no aplica | — |
| `42fc46f` | fix(messages): validate participants and query params, escape LIKE search | Mensajería: sin validación de entrada ni transacción al crear<br>Mensajería: `limit` sin validar, `LIKE` sin escapar y fallo de la… |  | ⏳ |
| `8948e37` | docs(todo): detail why the parking booking source is lost and what to decide | — | no aplica | — |
| `1949da7` | fix(logbook): answer 403 when editing someone else's entry | Logbook: editar una entrada ajena devuelve 500 |  | ⏳ |
| `9715966` | chore(backend): remove the unused email service and EJS view engine | — |  | ⏳ |
| `415b767` | fix(api): send Cache-Control: no-store on every API response | El API no envía `Cache-Control: no-store` |  | ⏳ |
| `1720bdd` | fix(backoffice): allow-list the columns supplier and invoice edits may set | Backoffice: inyección SQL por los nombres de campo |  | ⏳ |
| `5640950` | fix(backoffice): only fetch invoice PDFs from our own Cloudinary cloud | Backoffice: SSRF en la descarga de PDF |  | ⏳ |
| `25c0fc5` | fix(cloudinary): only delete files from the folder of the module asking | Blacklist: `DELETE /upload/:publicId` borra cualquier recurso de…<br>Backoffice: borrado arbitrario en Cloudinary |  | ⏳ |
| `e4a0254` | fix(backoffice): accept only integer year and month in batch payments | Backoffice: el pago en lote paga todos los meses con un objeto |  | ⏳ |
| `c5ee754` | fix(scheduling): stop constraint edits from setting their own status | — |  | ⏳ |
| `b94c5d3` | docs(todo): close the scheduling self-approval entry, note the open decision | Scheduling: un recepcionista puede aprobarse sus propias solicitudes | no aplica | — |
| `2569c05` | fix(parking): validate the booking update body against its columns | Parking: rutas de edición sin Zod |  | ⏳ |
| `59f8450` | fix(scheduling): bound bulk edits and validate employee id lists | Scheduling: validación incompleta |  | ⏳ |
| `b931244` | fix(scheduling): stop sending solver internals in generate errors | Scheduling: errores del solver y del arranque devueltos al cliente. |  | ⏳ |
| `7284910` | fix(blacklist): accept only images uploaded through the blacklist upload | Blacklist: el array `images` acepta cualquier URL |  | ⏳ |
| `91c8063` | fix(cloudinary): sanitise new public ids, accept legacy ones when deleting | Maintenance: `public_id` con el nombre original sin sanear. |  | ⏳ |
| `c95514d` | fix(cloudinary): check control characters without a control-character regex | — |  | ⏳ |
| `65308c1` | chore(conciliation): drop the commented-out admin check in the monthly status | Conciliation: comentario de código muerto en el controlador mensual |  | ⏳ |
| `527e6ad` | docs(tests): replace the outdated backend tests README | `backend/tests/README.md` está desfasado | no aplica | — |
| `84d79a0` | chore(db): keep a single copy of the Aiven CA certificate | Certificado de Aiven duplicado |  | ⏳ |
| `852a4b9` | chore(env): bring the .env.example files in line with the code | Actualizar los `.env.example` |  | ⏳ |
| `63c6bd6` | docs(agents): note that the unused email service is gone | Corregir el `AGENTS.md` raíz sobre next-intl | no aplica | — |
| `1b0619b` | docs(cashier): stop presenting the daily totals trigger as reliable | Corregir el `AGENTS.md` de cashier | no aplica | — |
| `009dd3c` | docs(logbook): document the input checks and close the stale entry | Corregir `backend/services/logbook/AGENTS.md` | no aplica | — |
| `738807c` | docs(todo): close the module and parking AGENTS.md entries, already fixed | Corregir los `AGENTS.md` de módulo<br>Corregir los `AGENTS.md` de parking | no aplica | — |
| `69c3d0d` | docs(blacklist): describe the real blacklist_entries columns and soft delete | Corregir el `AGENTS.md` de blacklist | no aplica | — |
| `9a2258c` | docs(backoffice): describe assets, both PDFs and the unenforced lifecycle | Corregir el `AGENTS.md` de backoffice | no aplica | — |
| `f3b6175` | docs(checklist): describe the param validation and the real table names | Corregir el `AGENTS.md` de checklist | no aplica | — |
| `e3f8c11` | refactor(api): drop param checks the route guards already make | — |  | ⏳ |
| `ab2700b` | refactor(maintenance): drop the per-handler id checks the route guard makes | — |  | ⏳ |
| `79f5831` | refactor(parking): call isCalendarDate directly instead of a one-line wrapper | — |  | ⏳ |
| `3cd0e52` | chore(backend): remove the parking PDF placeholder and dead config code | — |  | ⏳ |
| `34888a8` | chore(backend): remove the unused conciliation logic and payment method repo | — |  | ⏳ |
| `229d9f7` | refactor(backend): remove exports nothing uses | — |  | ⏳ |
| `196cb20` | docs(scheduling): fix PI and FO, the weights claim and the rotation emitter | Corregir los `AGENTS.md` de scheduling | no aplica | — |
| `dcfae5b` | chore(backend): remove the unused nodemailer dependency | — |  | ⏳ |
| `9be16b1` | fix(messages): store message notifications under the messages module | Notificaciones de mensajes con `module: 'system'` |  | ⏳ |
| `acf6feb` | fix(logbook): stop returning author and editor emails nobody displays | Emails de más en las respuestas de logbook |  | ⏳ |
| `7090b47` | fix(checklist): keep attachment public_id on the server | Checklist: respuestas con campos internos |  | ⏳ |
| `10064b1` | fix(checklist): reject control characters in comments, escape them in reports | Checklist: `checklist-report.ts` imprime los comentarios sin filtrar… |  | ⏳ |
| `683b618` | refactor(blacklist): remove the unused image delete endpoint and API methods | Blacklist: `DELETE /upload/:publicId` borra cualquier imagen de la…<br>Ids sin codificar en las URL de `blacklistApi.ts` |  | ⏳ |
| `7804790` | refactor(parking): remove the analytics API and occupancy query nobody calls | Parking: código sin uso |  | ⏳ |
| `2f19ca8` | chore(frontend): remove the unused auth routes and dependencies | Quitar código muerto |  | ⏳ |
| `4cbfbf7` | chore(frontend): remove the old backoffice tabs and their mock data | Backoffice: notas `IMPORTANT-PRODUCTION.MD` obsoletas |  | ⏳ |
| `5df5e86` | chore(frontend): remove 19 unimported files and 3 unused dependencies | — |  | ⏳ |
| `a67fe04` | refactor(frontend): remove unused exports and fix the real lint errors | — |  | ⏳ |
| `eb216e4` | fix(reports): filter maintenance by the statuses the backend uses | Informes: la sección de mantenimiento filtra por estados que no… |  | ⏳ |
| `1de7d8b` | fix(blacklist): render search highlights as React nodes, not injected HTML | Blacklist: resaltado de búsqueda con `dangerouslySetInnerHTML` |  | ⏳ |
| `1498c48` | fix(backoffice): neutralise spreadsheet formulas in the paid invoices CSV | Backoffice: inyección de fórmulas en la exportación CSV |  | ⏳ |
| `af883d4` | style(frontend): apply Prettier to the TypeScript and JavaScript files | — | no aplica | — |
| `1d5fa18` | refactor(logbook): drop the req.user.isAdmin check that never holds | Logbook: comprobación de `isAdmin` que nunca se cumple<br>`backend/scheduling-solver/AGENTS.md` cita `backend/debug-*.js` |  | ⏳ |
| `1c56b24` | fix(parking): read every occupying booking on the status map and wizard | Parking: el mapa de estado deja de ver reservas a partir de 50 |  | ⏳ |
| `60265d7` | refactor(blacklist): drop the created_by list filter and two unused actions | Blacklist: filtro `created_by` sin restricción |  | ⏳ |
| `a459dbe` | docs(blacklist): note that no screen restores a deleted entry | — | no aplica | — |
| `60189a3` | chore(fnb): log uploads through the logger and fix the cache docs | Corregir el `AGENTS.md` de `fnb`<br>Fnb: `console.log` sin pasar por el logger del proyecto<br>Corregir el comentario de `canAccessFnb` |  | ⏳ |
| `dc6565c` | ci: lint, format, typecheck and DB-free tests on every push | CI mínimo | no aplica | — |
| `8138448` | fix(cashier): export the PDF when a text has an emoji or a non-Latin-1 letter | Cashier: la exportación a PDF puede romperse con emojis |  | ⏳ |
| `d4ad8e1` | fix(pdf): keep free text drawable in the scheduling, invoice and editor PDFs | — |  | ⏳ |
| `809dcd8` | fix(logbook): stop solving, reopening, reading or editing deleted rows | Logbook: se pueden resolver, reabrir y marcar como leídas entradas…<br>Logbook: comentarios borrados que se pueden editar y volver a borrar |  | ⏳ |
| `24e7d24` | fix(messages): a removed participant can no longer edit or delete messages | Mensajería: un expulsado sigue editando y borrando sus mensajes |  | ⏳ |
| `79417b5` | fix(maintenance): keep deleted reports out of non-admin lists and writes | Maintenance: partes borrados visibles y modificables |  | ⏳ |
| `7d8b419` | fix(parking): keep the floor or number a booking edit leaves unchanged | Parking: cambiar solo la planta puede mover la reserva a otra plaza |  | ⏳ |
| `03a6b4e` | fix(maintenance): only admins read a deleted report | — |  | ⏳ |
| `26ba020` | fix(notifications): only admin and group-admin run the pending check | — |  | ⏳ |
| `fc55127` | docs(logbook): record that any user may re-route an entry by commenting | Logbook: un comentario cambia la prioridad o el departamento de una…<br>Cualquier rol lanza a mano la generación de notificaciones<br>Maintenance: el detalle, las fotos y el historial de un parte borrado… | no aplica | — |
| `1f4bd5f` | fix(auth): leave the disabled demo-admin role out of the new rules | — |  | ⏳ |
| `1c6886c` | docs(todo): the demo user being disabled was not checked in the database | — | no aplica | — |
| `1b7c3f1` | fix(parking): free a deleted booking's days and validate list paging | Parking: borrar una reserva no libera sus días |  | ⏳ |
| `80c540e` | fix(search): escape LIKE wildcards in every text search | — |  | ⏳ |
