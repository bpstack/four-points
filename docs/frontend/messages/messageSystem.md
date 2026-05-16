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

## Tipos TypeScript

**Archivo:** `frontend/app/lib/messaging/types.ts`

### Enums

```typescript
export type ConversationType = 'dm' | 'group'
```

### Tipos de API (respuesta del backend)

```typescript
export interface Conversation {
  id: number
  type: ConversationType
  name: string | null
  created_by: string
  created_at: string
  updated_at: string
  // Campos extendidos (del repository)
  participant_count?: number
  last_message?: string
  last_message_at?: string
  unread_count?: number
  // Para DMs: informacion del otro usuario
  other_user_id?: string
  other_username?: string
  other_role?: string
}

export interface Participant {
  id: number
  conversation_id: number
  user_id: string
  joined_at: string
  last_read_at: string | null
  is_admin: boolean
  is_active: boolean
  // Campos extendidos
  username: string
  email: string
  role_name?: string
}

export interface Message {
  id: number
  conversation_id: number
  sender_id: string
  content: string
  notify: boolean
  is_edited: boolean
  edited_at: string | null
  deleted_at: string | null
  created_at: string
  // Campos extendidos
  sender_username: string
  sender_role?: string
}

export interface UserSearchResult {
  id: string
  username: string
  email: string
  role_name: string
  existing_dm_id?: number | null  // Si ya existe DM, retorna el ID
}
```

### Tipos de UI (para componentes)

```typescript
export interface ConversationListItem {
  id: number
  type: ConversationType
  name: string  // Para DMs: username del otro usuario, para grupos: nombre del grupo
  avatar?: string
  lastMessage: string
  lastMessageTime: Date | null
  unreadCount: number
  isOnline?: boolean
  role?: string  // Para DMs: rol del otro usuario
}

export interface ChatMessage {
  id: number
  content: string
  senderId: string
  senderName: string
  senderRole?: string
  timestamp: Date
  isOwn: boolean
  isEdited: boolean
  isDeleted: boolean
}
```

---

## API Endpoints

Base: `/api/messages`

### Conversaciones

```
GET    /conversations              - Mis conversaciones (con ultimo mensaje, unread count)
POST   /conversations              - Crear DM o grupo (retorna { conversation, existing? })
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
                                   - Retorna: { success, data: Message[], has_more, oldest_id }
POST   /conversations/:id/messages   - Enviar mensaje
PATCH  /:messageId                   - Editar
DELETE /:messageId                   - Eliminar (soft delete)
```

### Utilidades

```
GET    /users                    - Buscar usuarios para nuevo chat (?q=texto)
GET    /unread-count             - Total de no leidos + desglose por conversacion
GET    /search?q=texto           - Buscar en mis mensajes
GET    /conversations/all        - ADMIN: ver todas las conversaciones
```

---

## Frontend

### Archivos

```
frontend/app/lib/messaging/
├── types.ts              - Interfaces TypeScript
├── queries.ts            - Llamadas a la API
├── index.ts              - Exports
└── hooks/
    ├── index.ts
    ├── useChat.ts              - Gestiona mensajes de una conversacion
    ├── useConversations.ts     - Gestiona lista de conversaciones
    └── useUserSearch.ts        - Busqueda de usuarios

frontend/app/components/profile/
└── MessagesPanel.tsx     - UI completa del chat
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

## Hooks del Frontend

### useChat

Gestiona los mensajes de una conversacion especifica.

```typescript
interface UseChatOptions {
  conversationId: number | null
  onMessageSent?: (message: Message) => void
}

const {
  messages,           // Message[] - lista de mensajes
  loading,            // boolean - cargando mensajes
  sending,            // boolean - enviando mensaje
  hasMore,            // boolean - hay mas mensajes para cargar
  error,              // string | null - error si ocurre
  editingMessageId,   // number | null - ID del mensaje en edicion
  editContent,        // string - contenido del mensaje en edicion
  setEditContent,
  send,               // (content: string, notify?: boolean) => Promise<Message>
  edit,               // (messageId: number, content: string) => Promise<void>
  remove,             // (messageId: number) => Promise<void>
  loadMore,           // () => void - cargar mensajes anteriores
  startEdit,          // (message: Message) => void
  cancelEdit,         // () => void
  scrollToBottom,     // (smooth?: boolean) => void
  refetch,            // () => void - recargar mensajes
  messagesEndRef,     // Ref para scroll automatico
  containerRef,       // Ref del contenedor
} = useChat({ conversationId, onMessageSent })
```

**Features:**
- Pagination con `before` y `limit` (50 mensajes por pagina)
- Optimistic updates al enviar/editar/eliminar
- Edit state con cancelacion
- Scroll automatico al enviar mensaje
- Manejo de errores

### useConversations

Gestiona la lista de conversaciones.

```typescript
interface UseConversationsOptions {
  initialConversationId?: number | null
}

const {
  conversations,          // Conversation[] - lista de conversaciones
  selectedConversation,   // Conversation | null - conversacion seleccionada
  loading,                // boolean
  error,                  // string | null
  totalUnread,            // number - total de no leidos
  fetchConversations,     // () => Promise<Conversation[]>
  getConversationDetails, // (id: number) => Promise<ConversationWithParticipants | null>
  create,                 // (data: CreateConversationRequest) => Promise<{ conversation, existing? }>
  remove,                 // (id: number) => Promise<void>
  leave,                  // (id: number) => Promise<void>
  markAsRead,             // (id: number) => Promise<void>
  select,                 // (conversation: Conversation | null) => void
  updateConversationLocal,// (id: number, updates: Partial<Conversation>) => void
} = useConversations({ initialConversationId })
```

**Features:**
- Auto-seleccion si se proporciona `initialConversationId`
- Optimistic updates al crear/eliminar
- Calculo automatico de `totalUnread`
- Actualizacion local de conversaciones

---

## Logica de Negocio

### DMs

- Si A intenta crear DM con B y ya existe, devuelve `{ conversation, existing: true }`
- No se puede "eliminar" un DM, solo salir (soft delete del participant)
- El nombre del DM es `null`, se muestra el username del otro usuario

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
- Paginacion: `GET /messages?before=123&limit=50` retorna `has_more` y `oldest_id`

### Lectura

- Al abrir una conversacion se hace POST a `/conversations/:id/read`
- Esto actualiza `last_read_at` del participante
- Los mensajes con `created_at > last_read_at` se consideran no leidos
- `GET /unread-count` retorna desglose por conversacion para badges

---

## Optimistic Updates

El frontend actualiza el estado local inmediatamente, antes de esperar la respuesta del servidor:

```typescript
// Al enviar mensaje
const send = async (content: string, notify = false) => {
  const message = await sendMessage(conversationId, { content, notify })
  setMessages((prev) => [...prev, message])  // Optimistic add
  onMessageSent?.(message)
}

// Al editar mensaje
const edit = async (messageId: number, content: string) => {
  const updated = await editMessage(messageId, { content })
  setMessages((prev) => prev.map((m) => (m.id === messageId ? updated : m)))  // Optimistic update
  cancelEdit()
}

// Al eliminar mensaje
const remove = async (messageId: number) => {
  await deleteMessage(messageId)
  setMessages((prev) => prev.filter((m) => m.id !== messageId))  // Optimistic delete
}
```

---

## Paginacion de Mensajes

```typescript
// Obtener mensajes (50 por defecto)
const response = await getMessages(conversationId, { before: 123, limit: 50 })
// response = { success: true, data: [...], has_more: true, oldest_id: 73 }

// Cargar mas mensajes antiguos
const loadMore = () => {
  if (hasMore && !loading) {
    fetchMessages(messages[0].id)  // ID del mensaje mas antiguo
  }
}
```

---

## Traducciones (i18n)

**Archivos:** `frontend/messages/{es|en}/messages.json`

```json
{
  "inbox": { ... },
  "conversation": { ... },
  "compose": { ... },
  "recipients": { ... },
  "notifications": { ... },
  "time": { ... }
}
```

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
- **Enviar imagenes**: nope

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
backend/config/error-codes.ts  (codigos de error para mensajes)
```

### Frontend
```
frontend/app/lib/messaging/types.ts
frontend/app/lib/messaging/queries.ts
frontend/app/lib/messaging/index.ts
frontend/app/lib/messaging/hooks/index.ts
frontend/app/lib/messaging/hooks/useChat.ts
frontend/app/lib/messaging/hooks/useConversations.ts
frontend/app/lib/messaging/hooks/useUserSearch.ts
frontend/app/components/profile/MessagesPanel.tsx
frontend/messages/es/messages.json
frontend/messages/en/messages.json
```
