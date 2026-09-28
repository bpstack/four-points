# Mensajería interna

Chat entre usuarios de la aplicación. Vive en el perfil
(`/dashboard/profile?panel=messages`). Resumen general en
[`../README.md`](../README.md).

## Qué problema resuelve

Da a los compañeros de distintos turnos y departamentos un canal propio dentro
de la aplicación, con los mismos usuarios y permisos, para avisos que no
encajan en un módulo concreto. Un mensaje puede marcarse como urgente para que
llegue también como notificación.

## Quién lo usa

**Todos los roles**, incluido `mantenimiento`: las rutas solo exigen sesión
iniciada. Dentro de cada conversación hay dos niveles:

- **Participante**: lee, escribe, edita y borra **sus** mensajes, y puede salir.
- **Administrador del grupo**: quien lo crea. Puede renombrarlo, añadir y
  quitar participantes, y borrarlo entero.

Un usuario con rol `admin` en la aplicación puede además **leer cualquier
conversación**, aunque no participe, borrar cualquier mensaje y cualquier
conversación, y listar todas.

## Qué puede hacer

- **Conversaciones directas** entre dos personas. Si ya existe una con esa
  persona, se reabre en vez de crear otra.
- **Grupos** con nombre (máx. 100 caracteres) y hasta **10 participantes**
  contando al creador.
- **Enviar** mensajes de hasta 5000 caracteres, **editarlos** (quedan marcados
  como editados) y **borrarlos**.
- **Mensaje urgente**: al activarlo, cada participante recibe una notificación
  de prioridad alta con enlace directo a la conversación.
- **No leídos** por conversación, en la lista lateral.
- **Salir** de un grupo. Si sale el administrador, el rol pasa al participante
  más antiguo; si no queda nadie, la conversación se borra.

**El backend ofrece, pero la interfaz no usa todavía**: renombrar un grupo,
añadir o quitar participantes después de crearlo, buscar en el texto de los
mensajes, el contador global de no leídos y la vista de todas las
conversaciones para `admin`.

## Qué datos maneja

Tres tablas (`backend/db-mysql/aiven/14_messages.sql`):

- **`conversations`**: tipo (`dm` o `group`), nombre del grupo y creador.
- **`conversation_participants`**: quién está en cada conversación, si es
  administrador, si sigue activo y cuándo leyó por última vez.
- **`messages`**: texto, autor, marca de urgente, edición y borrado.

- **Nada se borra de verdad al usar la aplicación**: un mensaje borrado solo se
  marca (`deleted_at`) y quien sale de un grupo queda como inactivo. Si vuelve a
  ser añadido, se reactiva.
- **Retención de 90 días**: un evento de MySQL (`cleanup_old_messages`) borra
  cada día los mensajes de más de 90 días y las conversaciones que se quedan sin
  mensajes. Necesita el programador de eventos de MySQL (`event_scheduler`)
  activo, como lo está en local y en Aiven.
- **No leído** = mensaje de otra persona posterior al último momento en que
  abriste esa conversación (`last_read_at`).

## Qué reglas cumple

- Solo un participante activo puede leer y escribir en una conversación; la
  excepción es el `admin` de la aplicación, que puede leer.
- Solo el autor edita sus mensajes. Borrarlos pueden el autor y un `admin`.
- Una conversación directa tiene exactamente dos personas y no admite más.
- Nombre, participantes y contenido se validan en el controlador; los mensajes
  se guardan sin espacios al principio ni al final.
- Se cargan los 50 mensajes más recientes (máximo 100 por petición) y se puede
  paginar hacia atrás desde el más antiguo cargado.

## Cómo viaja la información

```
MessagesPanel.tsx ─► useConversations / useChat / useUserSearch
                        │   (app/lib/messaging/hooks)
                        ▼
                    queries.ts ─► apiClient ─► /api/messages/*
                                                  │
                     conversation-controller / message-controller
                                                  │
                     conversation-repository / message-repository ─► MySQL
                                                  │ (si es urgente)
                                    NotificationRepository ─► campana de notificaciones
```

1. Al abrir el panel se piden las conversaciones del usuario, con el último
   mensaje y los no leídos de cada una.
2. Al elegir una conversación se cargan sus últimos mensajes y se marca como
   leída. El parámetro `?chat=<id>` de la URL abre una conversación
   directamente: es el enlace que llevan las notificaciones.
3. Al enviar, el mensaje se guarda y, si es urgente, se crea una notificación
   para el resto de participantes.
4. **No hay tiempo real**: ni WebSocket ni sondeo periódico. Los mensajes nuevos
   aparecen al volver a abrir la conversación o recargar. La única vía casi
   inmediata es el mensaje urgente, porque la campana de notificaciones se
   refresca cada minuto.
