# Revisión de Arquitectura: Módulo PROFILE

**Fecha de revisión:** Diciembre 2024  
**Puntuación:** 7/10 (Bueno con mejoras necesarias)  
**Estado:** Funcional - Requiere refactorización de componente grande

---

## Resumen Ejecutivo

El módulo Profile es un **hub de configuración** que agrupa: gestión de usuarios, departamentos, notificaciones, seguridad, mensajes y reportes. Tiene buena estructura general con hooks bien organizados para messaging y notifications, pero **SettingsPanel.tsx tiene 1,209 líneas** - el componente más grande del proyecto.

**Enfoque pragmático aplicado:**
- ✅ Dashboard privado = NO necesita SSR
- ✅ `page.tsx` como 'use client' es aceptable
- ⚠️ SettingsPanel.tsx NECESITA división (1,209 líneas = difícil mantener)

---

## 1. Evaluación por Criterios Pragmáticos

### ALTA Prioridad (Críticos)

| Criterio | Estado | Notas |
|----------|--------|-------|
| ¿Duplicación de código? | 🟢 OK | No hay Server Actions, usa apiClient directo |
| ¿TypeScript completo? | 🟢 Bien | Tipos definidos localmente + lib/messaging/types |
| ¿Queries/mutations separados? | 🟢 Bien | `lib/messaging/`, `lib/notifications/` |
| ¿React Query bien usado? | 🟡 Parcial | Messaging sí, Settings usa useState manual |

### MEDIA Prioridad

| Criterio | Estado | Notas |
|----------|--------|-------|
| ¿Componentes > 300 líneas? | 🔴 Crítico | `SettingsPanel.tsx` = 1,209 líneas |
| ¿Loading states? | 🟢 Bien | `loading.tsx` + skeletons internos |
| ¿Error boundaries? | 🟢 Bien | `error.tsx` usa `ModuleError` |

### BAJA Prioridad

| Criterio | Estado | Notas |
|----------|--------|-------|
| ¿URL state donde aporta? | 🟢 Bien | Usa `?panel=` y `?tab=` searchParams |
| ¿Zustand optimizado? | N/A | No usa Zustand, estado local |

---

## 2. Estructura de Archivos

```
dashboard/profile/
├── page.tsx               # 'use client' - 122 líneas (OK)
├── error.tsx              # ✅ Usa ModuleError
└── loading.tsx            # ✅ Skeleton completo

components/profile/
├── index.ts               # Barrel exports
├── ProfileSidebar.tsx     # 712 líneas (mejorable)
├── SettingsPanel.tsx      # ⚠️ 1,209 líneas (CRÍTICO)
├── MessagesPanel.tsx      # 881 líneas (grande)
├── NotificationsPanel.tsx # 108 líneas (OK)
└── reports/
    ├── ReportsTab.tsx     # 210 líneas - lazy loading ✅
    ├── DateFilter.tsx
    ├── types.ts
    └── sections/          # Lazy loaded
        ├── OverviewSection.tsx
        ├── LogbooksSection.tsx
        ├── MaintenanceSection.tsx
        ├── GroupsSection.tsx
        └── CashierSection.tsx

lib/messaging/
├── queries.ts             # API calls
├── types.ts               # Tipos de mensajes
└── hooks/
    ├── useChat.ts
    ├── useConversations.ts
    └── useUserSearch.ts

lib/notifications/
├── queries.ts
├── types.ts
└── useNotifications.ts
```

---

## 3. Issue Crítico: SettingsPanel.tsx (1,209 líneas)

**Este es el componente más grande del proyecto** y contiene:

1. **DepartmentsTab** (líneas 307-463) - Gestión de departamentos
2. **AddDepartmentModal** (líneas 470-548)
3. **EditDepartmentModal** (líneas 550-629)
4. **UserManagement** (líneas 635-703) - Lista de usuarios
5. **UserTable** (líneas 705-1005) - Tabla editable + Reset Password Modal
6. **NotificationsSettings** (líneas 1011-1121)
7. **SecuritySettings** (líneas 1123-1158)
8. **SettingRow** (líneas 1160-1182)
9. **SessionItem** (líneas 1184-1207)

### Propuesta de División

```
components/profile/settings/
├── index.ts                    # Barrel exports
├── SettingsPanel.tsx           # ~100 líneas (orquestador)
├── tabs/
│   ├── UsersTab.tsx            # UserManagement + UserTable (~400 líneas)
│   ├── DepartmentsTab.tsx      # DepartmentsTab + modals (~250 líneas)
│   ├── NotificationsTab.tsx    # NotificationsSettings (~120 líneas)
│   ├── SecurityTab.tsx         # SecuritySettings (~100 líneas)
│   └── ReportsTab.tsx          # Ya existe, mover aquí
├── modals/
│   ├── AddDepartmentModal.tsx
│   ├── EditDepartmentModal.tsx
│   └── ResetPasswordModal.tsx
└── shared/
    ├── SettingRow.tsx
    └── SessionItem.tsx
```

**Esfuerzo estimado:** 4-6 horas
**Prioridad:** Alta (afecta mantenibilidad)

---

## 4. Otros Componentes Grandes

### ProfileSidebar.tsx (712 líneas)

Contiene lógica de:
- Edición de username
- Cambio de contraseña  
- Upload/delete de avatar
- Navegación

**Propuesta:**
```
components/profile/sidebar/
├── ProfileSidebar.tsx      # ~150 líneas (orquestador)
├── ProfileHeader.tsx       # Avatar + info
├── UsernameEditor.tsx      # Form de username
├── PasswordEditor.tsx      # Form de password
└── ProfileNavigation.tsx   # Botones de navegación
```

**Esfuerzo:** 2-3 horas
**Prioridad:** Media

### MessagesPanel.tsx (881 líneas)

Panel de mensajería completo con:
- Lista de conversaciones
- Área de chat
- Modal de nueva conversación
- Modal de participantes

**Propuesta:**
```
components/profile/messages/
├── MessagesPanel.tsx           # ~100 líneas
├── ConversationsList.tsx       # Lista lateral
├── ChatArea.tsx                # Área de mensajes
├── ChatInput.tsx               # Input + notify
├── NewConversationModal.tsx    # Modal de crear
└── ParticipantsModal.tsx       # Modal de participantes
```

**Esfuerzo:** 3-4 horas
**Prioridad:** Media

---

## 5. Lo que Funciona Bien

### 5.1 Hooks de Messaging - EXCELENTE

```typescript
// lib/messaging/hooks/useConversations.ts
export function useConversations({ initialConversationId }) {
  // Estado de conversaciones
  // Crear, seleccionar, eliminar, marcar como leído
  // Actualización local optimista
}

// lib/messaging/hooks/useChat.ts
export function useChat({ conversationId, onMessageSent }) {
  // Mensajes de una conversación
  // Enviar, editar, eliminar
  // Scroll infinito con loadMore
}

// lib/messaging/hooks/useUserSearch.ts
export function useUserSearch({ enabled }) {
  // Búsqueda de usuarios para crear conversación
  // Selección múltiple para grupos
}
```

### 5.2 Reports con Lazy Loading

```typescript
// ReportsTab.tsx - Excelente implementación
const OverviewSection = lazy(() => import('./sections/OverviewSection'))
const LogbooksSection = lazy(() => import('./sections/LogbooksSection'))
// ... más secciones

<Suspense fallback={<SectionSkeleton />}>
  {renderSection()}
</Suspense>
```

### 5.3 URL State

```typescript
// page.tsx
const activePanel = searchParams.get('panel') // 'settings' | 'messages' | null

// SettingsPanel.tsx
const activeTab = searchParams.get('tab') as SettingsTab
```

### 5.4 Error/Loading

```typescript
// error.tsx
export default function ProfileError({ error, reset }: ErrorProps) {
  return <ModuleError error={error} reset={reset} translationNamespace="profile" />
}

// loading.tsx - Skeleton completo de 60 líneas
```

---

## 6. Patrón de Data Fetching

El módulo Profile usa **diferentes patrones** según el sub-módulo:

| Sub-módulo | Patrón | Notas |
|------------|--------|-------|
| Messages | Custom hooks | `useConversations`, `useChat` |
| Notifications | Custom hook | `useNotifications` |
| Users | useState + fetch | Sin React Query |
| Departments | useState + fetch | Sin React Query |
| Reports | Lazy components | Cada sección fetcha sus datos |

**Inconsistencia:** Users y Departments podrían beneficiarse de React Query para cache y refetch.

---

## 7. Resumen de Mejoras

### Prioridad Alta

| Tarea | Esfuerzo | Impacto |
|-------|----------|---------|
| Dividir SettingsPanel.tsx (1,209 → ~6 archivos) | 4-6h | Alto |

### Prioridad Media

| Tarea | Esfuerzo | Impacto |
|-------|----------|---------|
| Dividir ProfileSidebar.tsx | 2-3h | Medio |
| Dividir MessagesPanel.tsx | 3-4h | Medio |
| Migrar Users/Departments a React Query | 2-3h | Medio |

### Prioridad Baja

| Tarea | Esfuerzo | Impacto |
|-------|----------|---------|
| Extraer tipos a lib/profile/types.ts | 1h | Bajo |

---

## 8. Comparación con Otros Módulos

| Criterio | Profile | Groups | Parking |
|----------|---------|--------|---------|
| Componente más grande | 1,209 líneas ⚠️ | 480 líneas | ~300 líneas |
| Custom hooks | ✅ Messaging | ✅ 25+ hooks | ✅ Excelente |
| Loading/Error | ✅ Ambos | ✅ Ambos | ✅ Ambos |
| React Query | 🟡 Parcial | ✅ Completo | ✅ Completo |
| URL state | ✅ Bien | 🟡 Parcial | ✅ Bien |

---

## 9. Checklist Rápido

```
✅ Loading states (loading.tsx + skeletons)
✅ Error boundaries (error.tsx con ModuleError)
✅ URL state para navegación (?panel=, ?tab=)
✅ Hooks de messaging bien estructurados
✅ Lazy loading en ReportsTab
🔴 SettingsPanel.tsx = 1,209 líneas (CRÍTICO)
🟡 ProfileSidebar.tsx = 712 líneas (mejorable)
🟡 MessagesPanel.tsx = 881 líneas (mejorable)
🟡 Users/Departments sin React Query
```

---

## 10. Plan de Acción Recomendado

### Fase 1: SettingsPanel (4-6h)
1. Extraer DepartmentsTab + modales
2. Extraer UsersTab + UserTable + ResetPasswordModal
3. Extraer NotificationsTab
4. Extraer SecurityTab
5. SettingsPanel queda como orquestador

### Fase 2: Otros componentes (5-7h)
1. Dividir ProfileSidebar
2. Dividir MessagesPanel
3. Migrar Users/Departments a React Query

**Total estimado:** 10-13 horas

---

## 11. Puntuación Final: 7/10

**Fortalezas:**
- Hooks de messaging bien estructurados
- Lazy loading en reports
- URL state funcional
- Error/loading implementados

**Debilidades:**
- SettingsPanel.tsx con 1,209 líneas (crítico)
- Componentes grandes sin dividir
- Inconsistencia en data fetching (algunos con React Query, otros no)
