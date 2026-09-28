# Internal messaging

Chat between application users. It lives in the profile
(`/dashboard/profile?panel=messages`). General summary in
[`../README.md`](../README.md).

## What problem it solves

It gives colleagues from different shifts and departments their own channel
inside the application, with the same users and permissions, for notices that do
not fit in a specific module. A message can be marked as urgent so that it also
arrives as a notification.

## Who uses it

**All roles**, including `mantenimiento`: the routes only require a session.
Within each conversation there are two levels:

- **Participant**: reads, writes, edits and deletes **their** messages, and can
  leave.
- **Group administrator**: whoever creates it. They can rename it, add and
  remove participants, and delete the entire thing.

A user with the `admin` role in the application can also **read any
conversation**, even if they do not participate, delete any message and any
conversation, and list them all.

## What it can do

- **Direct conversations** between two people. If one already exists with that
  person, it is reopened instead of creating another.
- **Groups** with a name (max. 100 characters) and up to **10 participants**
  including the creator.
- **Send** messages of up to 5000 characters, **edit them** (they are marked as
  edited) and **delete them**.
- **Urgent message**: when activated, each participant receives a high priority
  notification with a direct link to the conversation.
- **Unread** per conversation, in the side list.
- **Leave** a group. If the administrator leaves, the role passes to the oldest
  participant; if nobody is left, the conversation is deleted.

**The backend offers, but the interface does not use yet**: renaming a group,
adding or removing participants after creation, searching in message text, the
global unread counter and the view of all conversations for `admin`.

## What data it handles

Three tables (`backend/db-mysql/aiven/14_messages.sql`):

- **`conversations`**: type (`dm` or `group`), group name and creator.
- **`conversation_participants`**: who is in each conversation, whether they are
  an administrator, whether they are still active and when they last read.
- **`messages`**: text, author, urgent flag, edit and delete.

- **Nothing is truly deleted when using the application**: a deleted message is
  only marked (`deleted_at`) and whoever leaves a group stays as inactive. If
  they are added again, they are reactivated.
- **90-day retention**: a MySQL event (`cleanup_old_messages`) deletes every day
  the messages older than 90 days and the conversations that are left without
  messages. It needs the MySQL event scheduler (`event_scheduler`) active, as it
  is on local and Aiven.
- **Unread** = a message from another person after the last moment you opened
  that conversation (`last_read_at`).

## What rules it follows

- Only an active participant can read and write in a conversation; the exception
  is the application's `admin`, who can read.
- Only the author edits their messages. Deleting can be done by the author and
  an `admin`.
- A direct conversation has exactly two people and does not accept more.
- Name, participants and content are validated in the controller; messages are
  saved without spaces at the beginning or end.
- The 50 most recent messages are loaded (maximum 100 per request) and
  pagination is possible backwards from the oldest loaded.

## How information flows

```
MessagesPanel.tsx ─► useConversations / useChat / useUserSearch
                        │   (app/lib/messaging/hooks)
                        ▼
                    queries.ts ─► apiClient ─► /api/messages/*
                                                  │
                     conversation-controller / message-controller
                                                  │
                     conversation-repository / message-repository ─► MySQL
                                                  │ (if urgent)
                                    NotificationRepository ─► notification bell
```

1. When opening the panel, the user's conversations are requested, with the last
   message and the unread count of each.
2. When choosing a conversation, its latest messages are loaded and it is marked
   as read. The `?chat=<id>` URL parameter opens a conversation directly: it is
   the link that notifications carry.
3. When sending, the message is saved and, if it is urgent, a notification is
   created for the rest of the participants.
4. **There is no real time**: neither WebSocket nor periodic polling. New
   messages appear when reopening the conversation or reloading. The only nearly
   immediate way is the urgent message, because the notification bell refreshes
   every minute.
