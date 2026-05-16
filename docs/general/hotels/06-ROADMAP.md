# Roadmap de Implementación Multi-Hotel

## 1. Resumen del Proyecto

| Aspecto | Detalle |
|---------|---------|
| **Objetivo** | Convertir Four-Points en plataforma multi-hotel |
| **Base de datos** | Aiven MySQL 8.0 (utf8mb4_0900_ai_ci) |
| **Duración estimada** | 2 semanas (10 días laborables) |
| **Riesgo** | Medio |
| **Downtime esperado** | 5-10 minutos (migración DB) |
| **Rollback** | Completo en < 1 hora |

---

## 2. Estructura de Tablas en Aiven

### 2.1 Tabla Core
| Tabla | Notas |
|-------|-------|
| `users` | id es CHAR(36), añadir hotel_id |
| `roles` | Global, NO necesita hotel_id |
| `departments` | Global, NO necesita hotel_id |

### 2.2 Tablas Operativas (necesitan hotel_id)
| Módulo | Tablas |
|--------|--------|
| **Logbook** | `logbooks`, `logbook_comments`, `logbook_history` |
| **Parking** | `parking_spots`, `parking_vehicles`, `parking_bookings`, `parking_availability` |
| **Groups** | `hotel_groups`, `group_contacts`, `group_history` |
| **Cashier** | `cashier_shifts`, `cashier_vouchers`, `cashier_history`, `cashier_daily` |
| **Maintenance** | `maintenance_reports`, `maintenance_history` |
| **Messages** | `conversations` |
| **Notifications** | `notifications` |
| **Blacklist** | `blacklist_entries` |
| **Backoffice** | `bo_invoices`, `bo_suppliers`, `bo_assets`, `bo_invoice_history` |

### 2.3 Tablas Globales (NO necesitan hotel_id)
- `payment_methods`
- `parking_rates`
- `bo_categories`
- `cashier_payments`, `cashier_denominations`, `cashier_shift_users`, `cashier_shift_vouchers`
- `group_rooms`, `group_status`, `group_payments`
- `maintenance_images`
- `conversation_participants`, `messages`
- `notification_recipients`

---

## 3. Día 1: Preparación y Base de Datos

### 3.1 Tareas del Día

| # | Tarea | Duración | Entregable |
|---|-------|----------|------------|
| 1.1 | Backup completo de DB Aiven | 30 min | `backup-aiven-pre-hotel.sql` |
| 1.2 | Crear script migración DB | 2 horas | `aiven/99_multi_hotel_migration.sql` |
| 1.3 | Probar migración en dev | 1 hora | DB con hotel_id |
| 1.4 | Crear script rollback | 30 min | `aiven/99_multi_hotel_rollback.sql` |

### 3.2 Acciones

```bash
# Backup desde Aiven
mysqldub -h aiven-host -u user -p hotel_db > backup-$(date +%Y%m%d).sql

# Probar migración en entorno dev
mysql -h dev-host -u user -p hotel_db < aiven/99_multi_hotel_migration.sql

# Verificar
mysql -h dev-host -u user -p hotel_db -e "SELECT COUNT(*) FROM hoteles; SELECT COUNT(*) FROM users WHERE hotel_id IS NOT NULL;"
```

### 3.3 Criterios de Éxito

- [ ] Backup creado y verificado
- [ ] Script de migración ejecuta sin errores
- [ ] Todas las tablas relevantes tienen hotel_id
- [ ] FK constraints creadas correctamente
- [ ] Script de rollback funciona

---

## 4. Día 2: Backend Core

### 4.1 Tareas del Día

| # | Tarea | Duración | Entregable |
|---|-------|----------|------------|
| 2.1 | Crear tipos TypeScript | 1 hora | `backend/models/hotel.ts` |
| 2.2 | Crear hotel middleware | 2 horas | `backend/middlewares/hotel-middleware.ts` |
| 2.3 | Crear HotelDB helper | 2 horas | `backend/config/db-hotel.ts` |
| 2.4 | Exportar en db.ts | 30 min | `backend/config/db.ts` |
| 2.5 | Integrar middleware | 1 hora | `backend/index.ts` |

### 4.2 Criterios de Éxito

- [ ] Middleware extrae hotel_id de sesión
- [ ] HotelDB helper filtra queries
- [ ] Endpoints de test devuelven hotel_id correcto

### 4.3 Test del Día

```typescript
// Test endpoint temporal
app.get('/api/test/hotel', hotelMiddleware, (req: HotelAuthRequest, res) => {
  res.json({
    hotelId: req.hotelId,
    hotel: req.hotel,
  });
});
```

---

## 5. Días 3-4: Backend Modules (Repositories)

### 5.1 Día 3: Módulos de Alta Prioridad

| # | Tarea | Módulo | Repository | Duración |
|---|-------|--------|------------|----------|
| 3.1 | Actualizar | Logbook | `repositories/logbook/logbook-repository.ts` | 2 horas |
| 3.2 | Actualizar | Parking | `repositories/parking/parking-repository.ts` | 3 horas |
| 3.3 | Actualizar | Cashier | `repositories/cashier/cashier-*.ts` | 3 horas |

### 5.2 Día 4: Módulos de Media Prioridad

| # | Tarea | Módulo | Repository | Duración |
|---|-------|--------|------------|----------|
| 4.1 | Actualizar | Groups | `repositories/group/group-*.ts` | 2 horas |
| 4.2 | Actualizar | Maintenance | `repositories/maintenance/maintenance-repository.ts` | 2 horas |
| 4.3 | Actualizar | Backoffice | `repositories/backoffice/backoffice-repository.ts` | 2 horas |

### 5.3 Módulos de Baja Prioridad (opcional, día 5)

| # | Tarea | Módulo |
|---|-------|--------|
| 5.1 | Actualizar | Messages (`repositories/messages/message-repository.ts`) |
| 5.2 | Actualizar | Notifications (`repositories/notifications/notification-repository.ts`) |
| 5.3 | Actualizar | Blacklist (`repositories/blacklist/blacklist-repository.ts`) |

### 5.4 Criterios de Éxito

- [ ] Cada endpoint devuelve solo datos del hotel activo
- [ ] Filtro funciona con el middleware
- [ ] Tests manuales pasan para cada módulo

---

## 6. Día 5: Frontend Core

### 6.1 Tareas del Día

| # | Tarea | Duración | Entregable |
|---|-------|----------|------------|
| 5.1 | Crear HotelContext | 2 horas | `stores/hotel-context.tsx` |
| 5.2 | Actualizar API Client | 1 hora | `lib/api-client.ts` |
| 5.3 | Crear Query Keys | 1 hora | `lib/query-keys.ts` |
| 5.4 | Integrar Provider | 1 hora | `app/layout.tsx` |
| 5.5 | Crear HotelSelector | 2 horas | `components/hotel-selector.tsx` |

### 6.2 Criterios de Éxito

- [ ] HotelContext funciona con localStorage
- [ ] API Client envía `x-hotel-id`
- [ ] Query keys incluyen hotelId
- [ ] Selector visible con múltiples hotels

### 6.3 Test del Día

```typescript
// Verificar que login devuelve hotel_id
const response = await login('admin', 'password');
console.log(response.hotel); // { id: 1 }
console.log(response.user.hotel_id); // 1
```

---

## 7. Días 6-7: Frontend Modules

### 7.1 Día 6: Hooks Principales

| # | Tarea | Hook | Duración |
|---|-------|------|----------|
| 6.1 | Actualizar | useLogbooks | 1 hora |
| 6.2 | Actualizar | useParking | 1 hora |
| 6.3 | Actualizar | useCashier | 1 hora |
| 6.4 | Actualizar | useGroups | 1 hora |
| 6.5 | Actualizar | useMaintenance | 1 hora |

### 7.2 Día 7: Hooks Secundarios

| # | Tarea | Hook | Duración |
|---|-------|------|----------|
| 7.1 | Actualizar | useNotifications | 30 min |
| 7.2 | Actualizar | useBackoffice | 1 hora |
| 7.3 | Crear | Dashboard con selector | 2 horas |

### 7.3 Criterios de Éxito

- [ ] Cada página muestra datos del hotel correcto
- [ ] Cambio de hotel actualiza datos
- [ ] Cache se invalida correctamente

---

## 8. Día 8: Testing y Bug Fixes

### 8.1 Tareas del Día

| # | Tarea | Duración |
|---|-------|----------|
| 8.1 | Tests unitarios backend | 2 horas |
| 8.2 | Tests unitarios frontend | 2 horas |
| 8.3 | Tests de integración | 2 horas |
| 8.4 | Bug fixes | 2 horas |

### 8.2 Checklist de Testing

- [ ] Login/logout funciona
- [ ] Selector de hotel funciona
- [ ] Cada módulo muestra datos correctos
- [ ] Cambio de hotel actualiza UI
- [ ] Datos no se mezclan entre hoteles
- [ ] Rutas protegidas funcionan
- [ ] Permisos de usuario se respetan

---

## 9. Día 9: Documentación y Preparación

### 9.1 Tareas del Día

| # | Tarea | Duración |
|---|-------|----------|
| 9.1 | Actualizar README multi-hotel | 1 hora |
| 9.2 | Documentar variables de entorno | 30 min |
| 9.3 | Crear guía de operaciones | 1 hora |
| 9.4 | Preparar deployment checklist | 1 hora |
| 9.5 | Backup final antes de deploy | 30 min |

### 9.2 Entregables de Documentación

- [ ] `README-MULTI-HOTEL.md`
- [ ] `OPERATIONS.md` (cómo añadir nuevos hoteles)
- [ ] `DEPLOYMENT-CHECKLIST.md`

---

## 10. Día 10: Deployment

### 10.1 Checklist de Deployment

#### Pre-deployment
- [ ] Backup completo realizado
- [ ] Tests pasan en staging
- [ ] Team disponible para soporte
- [ ] Plan de comunicación listo

#### Deployment Backend
- [ ] Ejecutar migración DB en Aiven
- [ ] Verificar FK constraints
- [ ] Deploy nuevo código backend
- [ ] Verificar endpoints funcionan
- [ ] Tests de smoke passing

#### Deployment Frontend
- [ ] Deploy nuevo código frontend
- [ ] Verificar build pasa
- [ ] Tests E2E passing

#### Post-deployment
- [ ] Monitorear errores (1 hora)
- [ ] Verificar métricas
- [ ] Comunicar al equipo
- [ ] Documentar issues encontrados

### 10.2 Comandos de Deployment

```bash
# Backend
cd backend
pnpm build
# Ejecutar migración DB en Aiven
mysql -h aiven-host -u user -p hotel_db < db-mysql/aiven/99_multi_hotel_migration.sql
pm2 restart all

# Frontend
cd frontend
pnpm build
# Deploy a Vercel
vercel --prod
```

---

## 11. Métricas de Éxito del Proyecto

### 11.1 Métricas Técnicas

| Métrica | Target | Cómo medir |
|---------|--------|------------|
| Datos aislados | 100% | Tests automatizados |
| Cobertura de tests | > 80% | Istanbul/Coverage |
| Downtime | < 15 min | Uptime monitoring |
| Errores post-deploy | < 5 | Error tracking |

### 11.2 Métricas de Negocio

| Métrica | Target |
|---------|--------|
| Hotels activos soportados | Ilimitado |
| Tiempo de onboarding hotel | < 30 min |
| Usuarios por hotel | Ilimitado |

---

## 12. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Migración DB falla | Media | Alto | Tests en dev primero, rollback script |
| Regression en features | Media | Medio | Tests automatizados, QA |
| Performance degradado | Baja | Medio | Monitoring, optimización queries |
| User confusion | Baja | Medio | UI clara, tooltips |

---

## 13. Recursos Necesarios

### 13.1 Personas

| Rol | Tiempo |
|-----|--------|
| Backend Developer | 5 días |
| Frontend Developer | 4 días |
| DevOps | 0.5 días |
| QA | 1 día |

### 13.2 Infraestructura

- Base de datos de desarrollo Aiven para pruebas
- Entorno de staging
- Acceso a producción Aiven para deployment

---

## 14. Tablero de Seguimiento

### 14.1 Sprint Backlog

```
[ ] Día 1: DB (backup, migración, rollback)
[ ] Día 2: Backend Core (middleware, helper, tipos)
[ ] Día 3-4: Backend Modules (repositories)
[ ] Día 5: Frontend Core (context, api, selector)
[ ] Día 6-7: Frontend Modules (hooks)
[ ] Día 8: Testing y bug fixes
[ ] Día 9: Documentación
[ ] Día 10: Deployment
```

### 14.2 Definition of Done

- [ ] Código revisado (PR aprobado)
- [ ] Tests pasando
- [ ] Documentación actualizada
- [ ] Deploy exitoso
- [ ] Métricas en verde

---

## 15. Información de Contacto

Para dudas durante la migración:

- **Backend**: @backend-team
- **Frontend**: @frontend-team
- **DevOps**: @devops
- **Emergency**: @tech-lead
