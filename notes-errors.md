# Frontend Build Errors Documentation

> **Fecha de generacion:** 14 de Diciembre, 2024  
> **Comando ejecutado:** `pnpm build`  
> **Version Next.js:** 15.5.3  
> **Estado:** Failed to compile

---

## Resumen Ejecutivo

| Tipo de Error | Cantidad | Severidad |
|---------------|----------|-----------|
| `@typescript-eslint/no-explicit-any` | ~130+ | Error |
| `@typescript-eslint/no-unused-vars` | ~35 | Error |
| `react-hooks/exhaustive-deps` | ~14 | Warning |
| `react-hooks/rules-of-hooks` | 1 | Error (Critico) |
| `react/no-unescaped-entities` | ~12 | Error |
| `@next/next/no-img-element` | 3 | Warning |
| `no-useless-escape` | 2 | Error |

---

## Indice de Errores por Tipo

1. [Errores Criticos](#1-errores-criticos)
2. [no-useless-escape](#2-no-useless-escape)
3. [no-explicit-any](#3-no-explicit-any)
4. [no-unused-vars](#4-no-unused-vars)
5. [react-hooks/exhaustive-deps](#5-react-hooksexhaustive-deps)
6. [react/no-unescaped-entities](#6-reactno-unescaped-entities)
7. [no-img-element](#7-no-img-element)

---

## 1. Errores Criticos

### 1.1 react-hooks/rules-of-hooks

**Archivo:** `app/components/layout/ProfileDropdown.tsx`  
**Linea:** 29  
**Error:** `React Hook "useEffect" is called conditionally. React Hooks must be called in the exact same order in every component render.`

**Descripcion:**  
Este es el error mas critico de todos. Los React Hooks deben ser llamados siempre en el mismo orden en cada render del componente. Llamar un hook condicionalmente (dentro de un `if`, `for`, o despues de un `return` anticipado) viola las reglas fundamentales de React Hooks.

**Causa probable:**  
El `useEffect` esta siendo llamado despues de una condicion `if` que retorna anticipadamente, o esta dentro de un bloque condicional.

**Solucion sugerida:**  
- Mover el `useEffect` antes de cualquier return anticipado
- Asegurar que todos los hooks esten al inicio del componente
- Usar una variable de estado para controlar el comportamiento en lugar de condicionar el hook

---

## 2. no-useless-escape

### 2.1 login/route.ts

**Archivo:** `app/api/auth/_backup_httponly_cookies/login/route.ts`  
**Linea:** 35, Columna: 60  
**Error:** `Unnecessary escape character: \-.`

**Descripcion:**  
El caracter `-` no necesita ser escapado con `\` en este contexto. Es codigo de respaldo/backup.

**Solucion sugerida:**  
Cambiar `\-` por `-` en la expresion regular o string.

---

### 2.2 refresh-token/route.ts

**Archivo:** `app/api/auth/_backup_httponly_cookies/refresh-token/route.ts`  
**Linea:** 49, Columna: 62  
**Error:** `Unnecessary escape character: \-.`

**Descripcion:**  
Mismo problema que el anterior, caracter de escape innecesario.

**Solucion sugerida:**  
Cambiar `\-` por `-`.

---

## 3. no-explicit-any

### Descripcion General
El uso del tipo `any` en TypeScript desactiva el chequeo de tipos, perdiendo los beneficios de seguridad de tipos. Se debe especificar un tipo mas concreto.

---

### 3.1 API Routes

#### app/api/groups/route.ts
| Linea | Columna | Contexto |
|-------|---------|----------|
| 532 | 72 | Tipo any en parametro o variable |
| 624 | 40 | Tipo any en parametro o variable |

#### app/api/users/route.ts
| Linea | Columna | Contexto |
|-------|---------|----------|
| 65 | 19 | Tipo any en catch block o parametro |

---

### 3.2 Components - Auth

#### app/components/auth/NewUserModal.tsx
| Linea | Columna | Contexto |
|-------|---------|----------|
| 50 | 19 | Tipo any probablemente en error handler |

---

### 3.3 Components - Blacklist

#### app/components/blacklist/mains/AuditTrail.tsx
| Linea | Columna | Contexto |
|-------|---------|----------|
| 126 | 13 | Tipo any |
| 127 | 13 | Tipo any |
| 223 | 29 | Tipo any |

#### app/components/blacklist/mains/BlacklistForm.tsx
| Linea | Columna | Contexto |
|-------|---------|----------|
| 184 | 21 | Tipo any en error handler |

#### app/components/blacklist/mains/BlacklistModal.tsx
| Linea | Columna | Contexto |
|-------|---------|----------|
| 84 | 21 | Tipo any |
| 115 | 21 | Tipo any |

#### app/components/blacklist/mains/DeleteButton.tsx
| Linea | Columna | Contexto |
|-------|---------|----------|
| 43 | 21 | Tipo any |

---

### 3.4 Components - Booking

#### app/components/booking/BookingWizard/hooks/useBookingWizard.ts
| Linea | Columna | Contexto |
|-------|---------|----------|
| 120 | 15 | Tipo any |
| 181 | 19 | Tipo any |
| 213 | 48 | Tipo any |
| 216 | 71 | Tipo any |
| 231 | 78 | Tipo any |
| 250 | 19 | Tipo any |
| 349 | 22 | Tipo any |
| 382 | 19 | Tipo any |

#### app/components/booking/BookingWizard/types.ts
| Linea | Columna | Contexto |
|-------|---------|----------|
| 11 | 13 | Tipo any en definicion de tipo |

#### app/components/booking/BookingWizard/variants.ts
| Linea | Columna | Contexto |
|-------|---------|----------|
| 9 | 31 | Tipo any |

---

### 3.5 Components - Cashier

#### app/components/cashier/CloseDayModal.tsx
| Linea | Columna |
|-------|---------|
| 88 | 21 |

#### app/components/cashier/CloseShiftModal.tsx
| Linea | Columna |
|-------|---------|
| 60 | 21 |

#### app/components/cashier/CreateVoucherModal.tsx
| Linea | Columna |
|-------|---------|
| 68 | 21 |

#### app/components/cashier/DenominationForm.tsx
| Linea | Columna |
|-------|---------|
| 71 | 21 |

#### app/components/cashier/InitializeDayModal.tsx
| Linea | Columna |
|-------|---------|
| 46 | 21 |

#### app/components/cashier/PaymentForm.tsx
| Linea | Columna |
|-------|---------|
| 71 | 21 |

#### app/components/cashier/ReopenDayModal.tsx
| Linea | Columna |
|-------|---------|
| 30 | 21 |

#### app/components/cashier/reports/MonthlyReport.tsx
| Linea | Columna |
|-------|---------|
| 57 | 35 |
| 72 | 16 |
| 79 | 13 |

#### app/components/cashier/reports/PaymentChart.tsx
| Linea | Columna |
|-------|---------|
| 44 | 58 |
| 45 | 54 |
| 52 | 48 |
| 53 | 51 |

#### app/components/cashier/ShiftCard.tsx
| Linea | Columna |
|-------|---------|
| 90 | 21 |
| 105 | 21 |
| 294 | 50 |
| 329 | 46 |
| 368 | 45 |
| 404 | 46 |

---

### 3.6 Components - Groups

#### app/components/groups/history/HistoryItem.tsx
| Linea | Columna |
|-------|---------|
| 174 | 53 |
| 174 | 66 |

#### app/components/groups/modal/NotificationModal.tsx
| Linea | Columna |
|-------|---------|
| 83 | 19 |
| 103 | 19 |

#### app/components/groups/panels/ContactPanel.tsx
| Linea | Columna |
|-------|---------|
| 77 | 21 |

#### app/components/groups/panels/CreateGroupPanel.tsx
| Linea | Columna |
|-------|---------|
| 96 | 21 |

#### app/components/groups/panels/EditGroupPanel.tsx
| Linea | Columna |
|-------|---------|
| 108 | 21 |
| 121 | 21 |

#### app/components/groups/panels/PaymentPanel.tsx
| Linea | Columna |
|-------|---------|
| 169 | 32 |
| 185 | 21 |
| 203 | 21 |

#### app/components/groups/panels/RoomPanel.tsx
| Linea | Columna |
|-------|---------|
| 90 | 21 |

#### app/components/groups/status/BalanceCard.tsx
| Linea | Columna |
|-------|---------|
| 41 | 33 |

#### app/components/groups/status/BookingCard.tsx
| Linea | Columna |
|-------|---------|
| 79 | 21 |

#### app/components/groups/status/ContractCard.tsx
| Linea | Columna |
|-------|---------|
| 70 | 21 |

#### app/components/groups/status/RoomingCard.tsx
| Linea | Columna |
|-------|---------|
| 87 | 22 |
| 110 | 21 |

#### app/components/groups/tabs/OverviewTab.tsx
| Linea | Columna |
|-------|---------|
| 31 | 33 |

#### app/components/groups/tabs/PaymentsTab.tsx
| Linea | Columna |
|-------|---------|
| 37 | 33 |

---

### 3.7 Components - Logbooks

#### app/components/logbooks/LogbooksContainer.tsx
| Linea | Columna |
|-------|---------|
| 32 | 34 |

#### app/components/logbooks/LogbooksList.tsx
| Linea | Columna |
|-------|---------|
| 298 | 21 |
| 426 | 21 |
| 505 | 21 |
| 528 | 21 |
| 644 | 36 |
| 739 | 34 |

#### app/components/logbooks/NewLogbookEntry.tsx
| Linea | Columna |
|-------|---------|
| 90 | 19 |

---

### 3.8 Components - Maintenance

#### app/components/maintenance/MaintenanceListClient.tsx
| Linea | Columna |
|-------|---------|
| 39 | 44 |
| 40 | 48 |
| 41 | 58 |
| 320 | 79 |
| 337 | 81 |
| 353 | 55 |

#### app/components/maintenance/panels/CreateReportPanel.tsx
| Linea | Columna |
|-------|---------|
| 144 | 21 |

#### app/components/maintenance/panels/EditReportPanel.tsx
| Linea | Columna |
|-------|---------|
| 88 | 21 |

#### app/components/maintenance/ReportDetailClient.tsx
| Linea | Columna |
|-------|---------|
| 68 | 21 |

#### app/components/maintenance/tabs/DetailTab.tsx
| Linea | Columna |
|-------|---------|
| 61 | 21 |
| 78 | 21 |
| 98 | 21 |

---

### 3.9 Components - Notifications

#### app/components/notifications/NotificationBell.tsx
| Linea | Columna |
|-------|---------|
| 132 | 17 |

---

### 3.10 Dashboard Pages

#### app/dashboard/blacklist/actions/createBlacklist.ts
| Linea | Columna |
|-------|---------|
| 81 | 19 |

#### app/dashboard/blacklist/actions/deleteBlacklist.ts
| Linea | Columna |
|-------|---------|
| 51 | 19 |

#### app/dashboard/blacklist/actions/getBlacklist.ts
| Linea | Columna |
|-------|---------|
| 50 | 19 |

#### app/dashboard/blacklist/actions/getBlacklistById.ts
| Linea | Columna |
|-------|---------|
| 38 | 19 |

#### app/dashboard/blacklist/actions/restoreBlacklist.ts
| Linea | Columna |
|-------|---------|
| 66 | 19 |

#### app/dashboard/blacklist/actions/updateBlacklist.ts
| Linea | Columna |
|-------|---------|
| 44 | 20 |
| 86 | 19 |

#### app/dashboard/blacklist/page.tsx
| Linea | Columna |
|-------|---------|
| 48 | 34 |
| 49 | 30 |
| 59 | 17 |

#### app/dashboard/conciliation/layout.tsx
| Linea | Columna |
|-------|---------|
| 39 | 21 |
| 61 | 21 |

#### app/dashboard/conciliation/page.tsx
| Linea | Columna |
|-------|---------|
| 45 | 96 |
| 47 | 11 |
| 107 | 31 |
| 120 | 34 |
| 196 | 89 |
| 206 | 12 |

#### app/dashboard/departments/page.tsx
| Linea | Columna |
|-------|---------|
| 41 | 21 |
| 63 | 21 |
| 225 | 21 |
| 331 | 21 |

#### app/dashboard/groups/[id]/page.tsx
| Linea | Columna |
|-------|---------|
| 32 | 21 |

#### app/dashboard/maintenance/actions/createMaintenance.ts
| Linea | Columna |
|-------|---------|
| 58 | 19 |

#### app/dashboard/maintenance/actions/deleteMaintenance.ts
| Linea | Columna |
|-------|---------|
| 44 | 19 |

#### app/dashboard/maintenance/actions/getMaintenance.ts
| Linea | Columna |
|-------|---------|
| 19 | 36 |
| 64 | 19 |

#### app/dashboard/maintenance/actions/getMaintenanceById.ts
| Linea | Columna |
|-------|---------|
| 46 | 19 |

#### app/dashboard/maintenance/actions/updateMaintenance.ts
| Linea | Columna |
|-------|---------|
| 50 | 19 |

#### app/dashboard/maintenance/actions/updateMaintenancePriority.ts
| Linea | Columna |
|-------|---------|
| 50 | 19 |

#### app/dashboard/maintenance/actions/updateMaintenanceStatus.ts
| Linea | Columna |
|-------|---------|
| 51 | 19 |

#### app/dashboard/maintenance/page.tsx
| Linea | Columna |
|-------|---------|
| 21 | 30 |
| 22 | 34 |
| 23 | 44 |
| 34 | 17 |

#### app/dashboard/maintenance/[id]/page.tsx
| Linea | Columna |
|-------|---------|
| 26 | 21 |

#### app/dashboard/page.tsx
| Linea | Columna |
|-------|---------|
| 120 | 28 |
| 122 | 61 |
| 127 | 66 |
| 132 | 77 |

#### app/dashboard/parking/bookings/page.tsx
| Linea | Columna |
|-------|---------|
| 303 | 21 |
| 442 | 21 |
| 465 | 21 |
| 489 | 21 |
| 499 | 21 |
| 509 | 21 |
| 668 | 76 |

#### app/dashboard/parking/bookings/[code]/page.tsx
| Linea | Columna |
|-------|---------|
| 94 | 21 |
| 121 | 21 |
| 150 | 21 |
| 163 | 21 |
| 176 | 21 |
| 185 | 27 |
| 197 | 21 |
| 211 | 21 |

#### app/dashboard/parking/page.tsx
| Linea | Columna |
|-------|---------|
| 59 | 46 |

#### app/dashboard/parking/status/components/modals/OverdueModal.tsx
| Linea | Columna |
|-------|---------|
| 112 | 52 |

#### app/dashboard/parking/status/components/StatusPanels.tsx
| Linea | Columna |
|-------|---------|
| 13 | 24 |
| 14 | 25 |

#### app/dashboard/parking/status/hooks/useParkingStatus.ts
| Linea | Columna |
|-------|---------|
| 101 | 55 |
| 126 | 21 |
| 149 | 21 |
| 171 | 21 |
| 193 | 21 |
| 233 | 21 |

#### app/dashboard/profile/notifications/page.tsx
| Linea | Columna |
|-------|---------|
| 116 | 85 |

#### app/dashboard/profile/settings/page.tsx
| Linea | Columna |
|-------|---------|
| 108 | 19 |
| 123 | 19 |
| 336 | 19 |
| 613 | 21 |

---

### 3.11 Lib Files

#### app/lib/apiClient.ts
| Linea | Columna |
|-------|---------|
| 28 | 21 |
| 31 | 30 |
| 237 | 36 |
| 254 | 37 |
| 271 | 35 |

#### app/lib/apiClient.disabled1.ts
| Linea | Columna |
|-------|---------|
| 24 | 21 |
| 27 | 30 |
| 177 | 36 |
| 200 | 37 |
| 223 | 35 |

#### app/lib/apiClient.disabled2.ts
| Linea | Columna |
|-------|---------|
| 36 | 21 |
| 39 | 30 |
| 196 | 36 |
| 226 | 35 |

#### app/lib/auth/useAuth.tsx
| Linea | Columna |
|-------|---------|
| 90 | 21 |

#### app/lib/blacklist/blacklistApi.ts
| Linea | Columna |
|-------|---------|
| 83 | 20 |

#### app/lib/blacklist/blacklistUtils.ts
| Linea | Columna |
|-------|---------|
| 172 | 46 |
| 172 | 56 |

#### app/lib/blacklist/types.ts
| Linea | Columna |
|-------|---------|
| 41 | 42 |
| 41 | 52 |

---

## 4. no-unused-vars

### Descripcion General
Variables, funciones o imports declarados pero nunca utilizados en el codigo. Esto genera codigo muerto y dificulta el mantenimiento.

---

### 4.1 API Routes

#### app/api/logbooks/route.ts
| Linea | Columna | Variable |
|-------|---------|----------|
| 4 | 15 | `LogbookEntry` |
| 4 | 29 | `LogbookComment` |

---

### 4.2 Components - Blacklist

#### app/components/blacklist/mains/AuditTrail.tsx
| Linea | Columna | Variable |
|-------|---------|----------|
| 50 | 17 | `iconColor` |
| 50 | 37 | `action` |

#### app/components/blacklist/mains/BlacklistForm.tsx
| Linea | Columna | Variable |
|-------|---------|----------|
| 25 | 27 | `blacklistEditSchema` |
| 32 | 3 | `BlacklistCreateFormData` |
| 33 | 3 | `BlacklistEditFormData` |
| 100 | 9 | `images` |

#### app/components/blacklist/mains/BlacklistModal.tsx
| Linea | Columna | Variable |
|-------|---------|----------|
| 25 | 3 | `IoClose` |

#### app/components/blacklist/mains/BlacklistTable.tsx
| Linea | Columna | Variable |
|-------|---------|----------|
| 12 | 21 | `useSearchParams` |
| 18 | 27 | `SEVERITY_COLORS` |
| 18 | 44 | `STATUS_COLORS` |

#### app/components/blacklist/mains/SearchBar.tsx
| Linea | Columna | Variable |
|-------|---------|----------|
| 14 | 39 | `IoCalendarOutline` |
| 15 | 27 | `DOCUMENT_TYPES` |

---

### 4.3 Components - Booking

#### app/components/booking/BookingWizard/steps/ConfirmationStep.tsx
| Linea | Columna | Variable |
|-------|---------|----------|
| 7 | 10 | `stat` |

---

### 4.4 Components - Cashier

#### app/components/cashier/reports/PaymentChart.tsx
| Linea | Columna | Variable |
|-------|---------|----------|
| 14 | 3 | `Legend` |

---

### 4.5 Components - Groups

#### app/components/groups/GroupDetailClient.tsx
| Linea | Columna | Variable |
|-------|---------|----------|
| 54 | 5 | `isLoadingGroup` |

#### app/components/groups/history/HistoryItem.tsx
| Linea | Columna | Variable |
|-------|---------|----------|
| 200 | 14 | `error` |

#### app/components/groups/layout/GroupHeader.tsx
| Linea | Columna | Variable |
|-------|---------|----------|
| 8 | 44 | `FiTrash2` |
| 16 | 46 | `onDelete` |

#### app/components/groups/layout/TabNavigation.tsx
| Linea | Columna | Variable |
|-------|---------|----------|
| 28 | 33 | `groupId` |

#### app/components/groups/panels/CreateGroupPanel.tsx
| Linea | Columna | Variable |
|-------|---------|----------|
| 23 | 9 | `router` |

#### app/components/groups/panels/PaymentPanel.tsx
| Linea | Columna | Variable |
|-------|---------|----------|
| 83 | 9 | `amount` |

#### app/components/groups/tabs/PaymentsTab.tsx
| Linea | Columna | Variable |
|-------|---------|----------|
| 17 | 71 | `openPanel` |

---

### 4.6 Components - Logbooks

#### app/components/logbooks/LogbooksList.tsx
| Linea | Columna | Variable |
|-------|---------|----------|
| 187 | 10 | `isSubmitting` |
| 343 | 14 | `error` |
| 456 | 14 | `error` |
| 492 | 14 | `error` |

#### app/components/logbooks/NewCommentEntry.tsx
| Linea | Columna | Variable |
|-------|---------|----------|
| 60 | 14 | `e` |

---

### 4.7 Components - Maintenance

#### app/components/maintenance/layout/TabNavigation.tsx
| Linea | Columna | Variable |
|-------|---------|----------|
| 12 | 33 | `reportId` |

#### app/components/maintenance/MaintenanceListClient.tsx
| Linea | Columna | Variable |
|-------|---------|----------|
| 5 | 10 | `useEffect` |

#### app/components/maintenance/ReportDetailClient.tsx
| Linea | Columna | Variable |
|-------|---------|----------|
| 28 | 58 | `isLoadingReport` |

---

### 4.8 Components - Theme

#### app/components/theme/SetThemeButton.tsx
| Linea | Columna | Variable |
|-------|---------|----------|
| 34 | 11 | `theme` |
| 72 | 11 | `theme` |

---

### 4.9 Dashboard Pages

#### app/dashboard/blacklist/new/page.tsx
| Linea | Columna | Variable |
|-------|---------|----------|
| 7 | 10 | `Card` |

#### app/dashboard/blacklist/[id]/edit/page.tsx
| Linea | Columna | Variable |
|-------|---------|----------|
| 10 | 10 | `Card` |
| 29 | 12 | `error` |

#### app/dashboard/blacklist/[id]/page.tsx
| Linea | Columna | Variable |
|-------|---------|----------|
| 14 | 42 | `IoTrashOutline` |
| 49 | 12 | `error` |

#### app/dashboard/cashier/hotel/layout.tsx
| Linea | Columna | Variable |
|-------|---------|----------|
| 5 | 53 | `FiDollarSign` |

#### app/dashboard/conciliation/page.tsx
| Linea | Columna | Variable |
|-------|---------|----------|
| 21 | 3 | `ConciliationDetail` |

#### app/dashboard/departments/page.tsx
| Linea | Columna | Variable |
|-------|---------|----------|
| 6 | 42 | `FiPackage` |

#### app/dashboard/layout.tsx
| Linea | Columna | Variable |
|-------|---------|----------|
| 9 | 20 | `FiBell` |

#### app/dashboard/parking/page.tsx
| Linea | Columna | Variable |
|-------|---------|----------|
| 59 | 10 | `occupancy` |

#### app/dashboard/parking/status/components/modals/BaseModal.tsx
| Linea | Columna | Variable |
|-------|---------|----------|
| 51 | 3 | `onClose` |
| 57 | 3 | `loading` |

#### app/dashboard/profile/notifications/page.tsx
| Linea | Columna | Variable |
|-------|---------|----------|
| 8 | 50 | `FiFilter` |

#### app/dashboard/profile/page.tsx
| Linea | Columna | Variable |
|-------|---------|----------|
| 144 | 27 | `username` |

#### app/dashboard/profile/settings/page.tsx
| Linea | Columna | Variable |
|-------|---------|----------|
| 16 | 3 | `FiUser` |

---

### 4.10 Lib Files

#### app/lib/cashier/queries.ts
| Linea | Columna | Variable |
|-------|---------|----------|
| 7 | 3 | `CashierDaily` |
| 8 | 3 | `CashierShift` |

---

## 5. react-hooks/exhaustive-deps

### Descripcion General
Los hooks `useEffect` y `useCallback` tienen arrays de dependencias incompletos. Esto puede causar bugs donde el efecto no se re-ejecuta cuando deberia, o se ejecuta con valores obsoletos (stale closures).

---

### 5.1 Lista de Errores

#### app/components/blacklist/mains/SearchBar.tsx
| Linea | Dependencia Faltante |
|-------|---------------------|
| 46 | `applyFilters` |

#### app/components/blacklist/ui/ImageUploader.tsx
| Linea | Dependencia Faltante |
|-------|---------------------|
| 79 | `validateFile` |

#### app/components/booking/BookingWizard/hooks/useBookingWizard.ts
| Linea | Dependencia Faltante |
|-------|---------------------|
| 256 | `validateDates` |

#### app/components/groups/tabs/HistoryTab.tsx
| Linea | Dependencia Faltante |
|-------|---------------------|
| 32 | `loadHistory` |

#### app/components/logbooks/LogbooksList.tsx
| Linea | Dependencia Faltante |
|-------|---------------------|
| 226 | `loadReaders` |

#### app/dashboard/cashier/hotel/layout.tsx
| Linea | Dependencias Faltantes |
|-------|------------------------|
| 88 | `queryClient`, `selectedDate` |

#### app/dashboard/conciliation/layout.tsx
| Linea | Dependencias Faltantes |
|-------|------------------------|
| 101 | `currentYear`, `selectedDay` |

#### app/dashboard/conciliation/page.tsx
| Linea | Dependencia Faltante |
|-------|---------------------|
| 83 | `loadMonthlySummary` |

#### app/dashboard/groups/page.tsx
| Linea | Dependencia Faltante |
|-------|---------------------|
| 23 | `loadGroups` |

#### app/dashboard/parking/bookings/[code]/page.tsx
| Linea | Dependencia Faltante |
|-------|---------------------|
| 106 | `loadBooking` |

#### app/dashboard/parking/page.tsx
| Linea | Dependencia Faltante |
|-------|---------------------|
| 64 | `loadDashboardData` |

#### app/dashboard/parking/status/hooks/useParkingStatus.ts
| Linea | Dependencia Faltante |
|-------|---------------------|
| 243 | `loadParkingData` |

---

### Solucion General para exhaustive-deps

**Opcion A - Agregar la dependencia:**
```typescript
useEffect(() => {
  loadData()
}, [loadData]) // Agregar la funcion como dependencia
```

**Opcion B - Usar useCallback para la funcion:**
```typescript
const loadData = useCallback(() => {
  // logica
}, [/* dependencias de loadData */])

useEffect(() => {
  loadData()
}, [loadData])
```

**Opcion C - Mover la funcion dentro del useEffect:**
```typescript
useEffect(() => {
  const loadData = () => {
    // logica
  }
  loadData()
}, [/* dependencias reales */])
```

---

## 6. react/no-unescaped-entities

### Descripcion General
Caracteres especiales como `"`, `'`, `<`, `>` deben ser escapados en JSX para evitar problemas de parsing.

---

### 6.1 Lista de Errores

#### app/components/cashier/ShiftCard.tsx
| Linea | Columna | Caracter | Escape Sugerido |
|-------|---------|----------|-----------------|
| 338 | 55 | `"` | `&quot;` o `&#34;` |
| 338 | 62 | `"` | `&quot;` o `&#34;` |
| 413 | 55 | `"` | `&quot;` o `&#34;` |
| 413 | 62 | `"` | `&quot;` o `&#34;` |

#### app/dashboard/cashier/hotel/page.tsx
| Linea | Columna | Caracter | Escape Sugerido |
|-------|---------|----------|-----------------|
| 71 | 63 | `"` | `&quot;` o `&#34;` |
| 71 | 79 | `"` | `&quot;` o `&#34;` |

#### app/dashboard/departments/page.tsx
| Linea | Columna | Caracter | Escape Sugerido |
|-------|---------|----------|-----------------|
| 265 | 51 | `"` | `&quot;` o `&#34;` |
| 265 | 62 | `"` | `&quot;` o `&#34;` |
| 265 | 81 | `"` | `&quot;` o `&#34;` |
| 265 | 93 | `"` | `&quot;` o `&#34;` |

---

### Ejemplo de Correccion

**Antes:**
```tsx
<p>Click "here" to continue</p>
```

**Despues:**
```tsx
<p>Click &quot;here&quot; to continue</p>
// o usando template literals
<p>{`Click "here" to continue`}</p>
```

---

## 7. no-img-element

### Descripcion General
Next.js recomienda usar el componente `<Image />` de `next/image` en lugar del tag HTML `<img>` para optimizacion automatica de imagenes (lazy loading, responsive, formatos modernos).

---

### 7.1 Lista de Warnings

| Archivo | Linea |
|---------|-------|
| `app/components/blacklist/mains/BlacklistForm.tsx` | 372 |
| `app/components/maintenance/panels/CreateReportPanel.tsx` | 409 |
| `app/components/maintenance/tabs/DetailTab.tsx` | 520 |

---

### Ejemplo de Correccion

**Antes:**
```tsx
<img src="/image.jpg" alt="description" width={100} height={100} />
```

**Despues:**
```tsx
import Image from 'next/image'

<Image src="/image.jpg" alt="description" width={100} height={100} />
```

**Nota:** Si la imagen es externa, agregar el dominio a `next.config.ts`:
```typescript
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'example.com',
      },
    ],
  },
}
```

---

## Archivos Adicionales con Errores (Detectados pero truncados)

Los siguientes archivos probablemente tambien contienen errores pero la salida fue truncada:

- `app/lib/cashier/queries.ts`
- `app/lib/cashier/types.ts`
- `app/lib/groups/*`
- `app/lib/maintenance/*`
- `app/lib/parking/*`
- `app/stores/*`

---

## Plan de Correccion Sugerido

### Fase 1: Criticos (Inmediato)
1. [ ] Corregir `react-hooks/rules-of-hooks` en `ProfileDropdown.tsx`
2. [ ] Corregir `no-useless-escape` en archivos de auth backup

### Fase 2: Variables no usadas (1-2 horas)
3. [ ] Eliminar imports no usados (~35 archivos)
4. [ ] Eliminar variables no usadas

### Fase 3: Hooks Dependencies (2-3 horas)  
5. [ ] Corregir `useEffect`/`useCallback` con deps faltantes (~14 casos)

### Fase 4: Caracteres sin escapar (30 min)
6. [ ] Escapar comillas en JSX (~12 casos)

### Fase 5: Tipos `any` (Mayor esfuerzo)
7. [ ] Opcion A: Corregir todos los `any` (~130+ casos)
8. [ ] Opcion B: Desactivar regla temporalmente en `.eslintrc.json`

### Fase 6: Optimizaciones Next.js (Opcional)
9. [ ] Cambiar `<img>` por `<Image>` (3 archivos)

---

## Configuracion Alternativa

Si deseas ignorar temporalmente algunos errores, modifica `.eslintrc.json`:

```json
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": "warn",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

O para desactivar completamente:

```json
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "off"
  }
}
```

---

## Referencias

- [ESLint Rules](https://eslint.org/docs/rules/)
- [TypeScript ESLint Rules](https://typescript-eslint.io/rules/)
- [React Hooks Rules](https://react.dev/reference/rules/rules-of-hooks)
- [Next.js Image Component](https://nextjs.org/docs/pages/api-reference/components/image)
