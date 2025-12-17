en caja dashboard necesito recoger esto

### ═══════════════════════════════════════════════════════

### REPORTS - Reportes y Estadísticas (Solo Admin)

### ═══════════════════════════════════════════════════════

### Dashboard overview (resumen de hoy)

GET {{baseUrl}}/api/cashier/reports/dashboard
Authorization: Bearer {{accessToken}}

### Reporte diario completo

GET {{baseUrl}}/api/cashier/reports/daily/2025-11-28
Authorization: Bearer {{accessToken}}

### Reporte de período con desglose diario

GET {{baseUrl}}/api/cashier/reports/period?from_date=2025-11-01&to_date=2025-11-30
Authorization: Bearer {{accessToken}}

### Historial completo de vales

GET {{baseUrl}}/api/cashier/reports/vouchers-history
Authorization: Bearer {{accessToken}}

### Historial de vales con límite

GET {{baseUrl}}/api/cashier/reports/vouchers-history?limit=50
Authorization: Bearer {{accessToken}}

### Resumen por tipo de turno

GET {{baseUrl}}/api/cashier/reports/shifts-summary?from_date=2025-11-01&to_date=2025-11-30
Authorization: Bearer {{accessToken}}
