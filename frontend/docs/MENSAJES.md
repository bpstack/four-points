# Sistema de Mensajeria Interna

Sistema de chat interno para Four-Points. DMs y grupos, sin websockets (polling manual o refresh).

## TL;DR

- **DMs**: conversacion 1 a 1, si ya existe se reutiliza
- **Grupos**: hasta 10 personas, el creador es admin
- **Notificaciones**: el que envia decide si es urgente (toggle)
- **Retencion**: 90 dias, despues se borran automaticamente
- **Sin tiempo real**: hay que refrescar para ver mensajes nuevos

---

## Base de Datos

Tres tablas en `14_messages.sql`:

```
conversations          conversation_participants       messages
-------------          -------------------------       --------
id                     id                              id
type (dm/group)        conversation_id                 conversation_id
name                   user_id                         sender_id
created_by             joined_at                       content
created_at             last_read_at                    notify (0/1)
updated_at             is_admin (0/1)                  is_edited
                       is_active (0/1)                 edited_at
                                                       deleted_at
                                                       created_at
```

**Decisiones importantes:**

- No hay tabla `message_reads`. Usamos `last_read_at` en participants - mas simple, menos queries
- `notify` lo decide el remitente, no el receptor
- Soft delete en mensajes (`deleted_at`), pero en el UI desaparece completamente
- El enum de `notifications.related_to` se amplio para incluir 'message'

---

## API Endpoints

Base: `/api/messages`

### Conversaciones

```
GET    /conversations              - Mis conversaciones (con ultimo mensaje, unread count)
POST   /conversations              - Crear DM o grupo
GET    /conversations/:id          - Detalle + participantes
PATCH  /conversations/:id          - Cambiar nombre del grupo
DELETE /conversations/:id          - Salir de la conversacion (soft)
DELETE /conversations/:id/delete   - Eliminar todo (solo admin conv o admin sistema)
POST   /conversations/:id/read     - Marcar como leida
```

### Participantes (solo grupos)

```
POST   /conversations/:id/participants           - Agregar gente
DELETE /conversations/:id/participants/:userId   - Echar a alguien
```

### Mensajes

```
GET    /conversations/:id/messages   - Mensajes paginados (?before=123&limit=50)
POST   /conversations/:id/messages   - Enviar mensaje
PATCH  /:messageId                   - Editar
DELETE /:messageId                   - Eliminar (soft delete)
```

### Utilidades

```
GET    /users                    - Buscar usuarios para nuevo chat (?q=texto)
GET    /unread-count             - Total de no leidos
GET    /search?q=texto           - Buscar en mis mensajes
GET    /conversations/all        - ADMIN: ver todas las conversaciones
```

---

## Frontend

### Archivos

```
frontend/app/lib/messaging/
  types.ts      - Interfaces TypeScript
  queries.ts    - Llamadas a la API
  index.ts      - Exports

frontend/app/components/profile/
  MessagesPanel.tsx   - UI completa del chat
```

### Acceso

```
/dashboard/profile?panel=messages            - Panel de mensajes
/dashboard/profile?panel=messages&chat=123   - Abrir conversacion especifica
```

### Funcionalidades UI

- Lista de conversaciones con preview del ultimo mensaje
- Badge de no leidos por conversacion y total
- Busqueda de conversaciones
- Modal para nueva conversacion (buscar usuarios, seleccionar multiples para grupo)
- Chat con burbujas, timestamps, indicador de editado
- Editar/eliminar mensajes propios (hover en el mensaje)
- Toggle de notificacion urgente (campanita en el input)
- Ver participantes del grupo (click en "X participantes")
- Menu de opciones: salir del grupo, eliminar conversacion

---

## Logica de Negocio

### DMs

- Si A intenta crear DM con B y ya existe, devuelve el existente
- No se puede "eliminar" un DM, solo salir (soft delete del participant)

### Grupos

- Maximo 10 participantes
- El creador es admin automaticamente
- Si el admin sale, el siguiente en unirse (por `joined_at`) pasa a ser admin
- Solo el admin puede agregar/echar gente
- Cualquiera puede salir

### Mensajes

- Solo el autor puede editar/eliminar
- Al editar se marca `is_edited = 1` y `edited_at = NOW()`
- Al eliminar se pone `deleted_at = NOW()` (no se muestra en UI)
- Con `notify = 1` se crea una entrada en `notifications` para cada participante

### Lectura

- Al abrir una conversacion se hace POST a `/conversations/:id/read`
- Esto actualiza `last_read_at` del participante
- Los mensajes con `created_at > last_read_at` se consideran no leidos

---

## Limpieza Automatica

Hay un evento MySQL que corre diario:

```sql
-- Borra mensajes de mas de 90 dias
DELETE FROM messages WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);

-- Borra conversaciones sin mensajes
DELETE FROM conversations WHERE id NOT IN (SELECT DISTINCT conversation_id FROM messages);
```

Requiere `event_scheduler = ON` en MySQL.

---

## Testing

Archivo de pruebas HTTP en `backend/API REST/messages/messages.http`

Flujo basico:
1. Login para obtener token
2. GET /users para buscar con quien hablar
3. POST /conversations para crear DM o grupo
4. POST /conversations/:id/messages para enviar
5. GET /conversations/:id/messages para leer

---

## Cosas que NO tiene (a proposito)

- **Websockets**: seria overengineering para el uso que le van a dar
- **Typing indicators**: mismo motivo
- **Reacciones/emojis**: solo texto plano
- **Archivos adjuntos**: fuera de scope
- **Mensajes de voz**: nope
- **Hilos/respuestas**: los mensajes son lineales

---

## Deploy

1. Ejecutar `14_messages.sql` en la BD (hay version LOCAL y AIVEN)
2. El backend ya tiene las rutas registradas en `index.ts`
3. El frontend ya tiene el componente en el profile

---

## Archivos del sistema

### Backend
```
backend/db-mysql/14_messages.sql
backend/models/messages/index.ts
backend/repositories/messages/conversation-repository.ts
backend/repositories/messages/message-repository.ts
backend/controllers/messages/conversation-controller.ts
backend/controllers/messages/message-controller.ts
backend/routes/messages/messages-routes.ts
```

### Frontend
```
frontend/app/lib/messaging/types.ts
frontend/app/lib/messaging/queries.ts
frontend/app/lib/messaging/index.ts
frontend/app/components/profile/MessagesPanel.tsx
```
