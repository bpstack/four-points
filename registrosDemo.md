# Registro de Intentos Demo Bloqueados

Este archivo registra los intentos de escritura bloqueados para usuarios demo.

| Timestamp | Usuario | Método | Ruta | Body (truncado) |
|-----------|---------|--------|------|-----------------|
| 2025-12-18T15:10:10.708Z | demo | PATCH | /me/profile | {"username":"Demoz","currentPassword":"demo987654"} |
| 2025-12-18T15:14:13.205Z | demo | PUT | /some-fake-id | {"username":"newname"} |
| 2025-12-18T15:14:16.550Z | demo | PATCH | /me/password | {"currentPassword":"demo987654","newPassword":"newpass123"} |
| 2025-12-18T15:15:27.493Z | demo | PATCH | /api/auth/me/password | {"currentPassword":"demo987654","newPassword":"newpass123"} |
| 2025-12-18T19:46:28.155Z | demo | POST | /api/notifications/check-pending | {} |
| 2025-12-18T20:53:50.976Z | demo | POST | /api/messages/conversations/5/read | {} |
| 2025-12-18T20:53:51.032Z | demo | POST | /api/messages/conversations/5/read | {} |
| 2025-12-18T20:53:55.731Z | demo | POST | /api/messages/conversations/5/messages | {"content":"sdf","notify":false} |
| 2025-12-18T20:54:57.927Z | demo | PUT | /api/logbooks/83/solve | {} |
| 2025-12-18T20:54:59.729Z | demo | POST | /api/logbooks/83/read | {} |
| 2025-12-18T20:55:01.087Z | demo | POST | /api/logbooks/83/read | {} |
