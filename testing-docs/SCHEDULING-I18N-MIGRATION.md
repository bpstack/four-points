# Scheduling Module - i18n Migration Guide

This guide explains how to migrate the scheduling components from hardcoded Spanish text to using the i18n translation system with `next-intl`.

## Translation Files Created

✅ **Spanish**: `frontend/messages/es/scheduling.json`
✅ **English**: `frontend/messages/en/scheduling.json`
✅ **Navigation**: Added "scheduling" key to both `common.json` files
✅ **i18n Config**: Added 'scheduling' to modules array in `app/i18n/request.ts`

## How to Use Translations

### 1. Import the useTranslations hook

```tsx
import { useTranslations } from 'next-intl'
```

### 2. Initialize the translation function in your component

```tsx
const t = useTranslations('scheduling')
```

For nested keys, you can scope to a specific section:

```tsx
const t = useTranslations('scheduling.config.ai')  // For AI config section
const tActions = useTranslations('scheduling.actions')  // For action buttons
const tToasts = useTranslations('scheduling.toasts')  // For toast messages
const tStatus = useTranslations('scheduling.status')  // For status labels
const tMessages = useTranslations('scheduling.messages')  // For general messages
const tTypes = useTranslations('scheduling.config.rules.types')  // For rule types
```

### 3. Replace hardcoded text with translation keys

#### Before (hardcoded):
```tsx
<h1>Planificación de Horarios</h1>
<p>Gestión de turnos del personal de recepción</p>
<button>Generar Horarios</button>
```

#### After (translated):
```tsx
<h1>{t('page.title')}</h1>
<p>{t('page.subtitle')}</p>
<button>{tActions('generate')}</button>
```

## Translation Key Structure

The translation files are organized hierarchically:

```
scheduling/
├── page/              # Page titles and metadata
├── status/            # Schedule status labels (draft, generated, etc.)
├── actions/           # Action buttons (save, create, delete, etc.)
├── messages/          # General UI messages (loading, no data, etc.)
├── toasts/            # Toast notifications (success, error messages)
├── grid/              # Schedule grid table
├── stats/             # Statistics panel
├── monthSelector/     # Month selection
├── legend/            # Shift type legend
├── shiftSelector/     # Shift selection popover
├── warnings/          # Generation warnings/errors
│   └── types/         # Warning type labels
├── contracts/         # Employee contracts and totals
└── config/            # Configuration page
    ├── tabs/
    ├── employees/
    ├── totals/
    ├── general/
    ├── ai/
    ├── shifts/
    │   └── modal/
    ├── rules/
    │   ├── types/
    │   ├── placeholders/
    │   └── help/
    └── requests/
```

## Migration Checklist

- [x] SchedulingClient.tsx
- [x] ScheduleGrid.tsx
- [x] ScheduleStats.tsx
- [x] MonthSelector.tsx
- [x] ShiftLegend.tsx
- [x] ShiftSelector.tsx
- [x] GenerationWarnings.tsx
- [x] EmployeeTotals.tsx
- [x] SchedulingConfigClient.tsx
- [x] scheduling/page.tsx
- [x] scheduling/config/page.tsx

## Current Progress (Last Updated: 2026-01-05)

### ✅ All Components Migrated
- Translation files created (`scheduling.json` for EN/ES)
- All scheduling components converted to use i18n
- Page layouts updated with static metadata
- 'scheduling' module added to i18n configuration

### Migrated Components:
1. MonthSelector.tsx
2. ScheduleStats.tsx
3. ShiftLegend.tsx
4. ShiftSelector.tsx
5. ScheduleGrid.tsx
6. GenerationWarnings.tsx
7. SchedulingConfigClient.tsx (all sections: EmployeesTab, AIStatusPanel, GeneralConfigTab, ShiftsSection, ShiftModal, RulesTab, AddRuleModal, RequestsTab, AddRequestModal)
8. EmployeeTotals.tsx
9. SchedulingClient.tsx
10. scheduling/page.tsx
11. scheduling/config/page.tsx

### Translation Files:
- `messages/es/scheduling.json` - Spanish translations (complete)
- `messages/en/scheduling.json` - English translations (complete)

### Configuration Updated:
- `app/i18n/request.ts` - Added 'scheduling' to modules array

## Common Patterns

### 1. Pluralization
Use a `{plural}` placeholder and determine the suffix:

```tsx
t('toasts.generatedWithErrors', {
  count: errorCount,
  plural: errorCount > 1 ? 's' : ''
})
```

### 2. Variable Substitution
Use `{variable}` placeholders:

```tsx
t('stats.daysWithoutMorning', { count: daysWithoutMorning })
t('warnings.day', { day: dayNumber })
t('config.ai.activeProvider', { provider: providerName })
```

### 3. Conditional Text
Instead of ternary in JSX, use translation keys:

```tsx
// Before:
{isActive ? 'IA Activa' : 'IA Desactivada'}

// After:
{isActive ? t('config.ai.active') : t('config.ai.inactive')}
```

### 4. Loading States
```tsx
// Before:
{isLoading ? 'Cargando datos...' : content}

// After:
{isLoading ? t('messages.loadingData') : content}
```

### 5. Sub-components Need Own useTranslations()
Each nested function component inside a parent component needs its own `useTranslations()` call:

```tsx
// Parent component
function ParentComponent() {
  const t = useTranslations('scheduling')
  return <ChildComponent />
}

// Child component (separate function)
function ChildComponent() {
  const tChild = useTranslations('scheduling.config.rules')
  return <p>{tChild('noRules')}</p>
}
```

## Testing Translations

1. **Start the development server**:
   ```bash
   cd frontend && pnpm dev
   ```

2. **Test language switching**:
   - Use the language switcher in the UI
   - Verify all text changes from Spanish to English

3. **Check for missing translations**:
   - next-intl will show `MISSING_MESSAGE` errors in console for missing keys
   - All keys should resolve properly

4. **Clear cache if needed**:
   ```bash
   rd /s /q .next
   pnpm dev
   ```

## Common Issues Fixed During Migration

### 1. Duplicate Keys in JSON
- Spanish file had duplicate `selectMonthToSeeRequests` in messages section
- English file had duplicate `ruleUpdateError` in toasts section
- **Fix**: Removed duplicates manually

### 2. Missing Translation Keys
- `configButton` was under `actions` but component used `t('configButton')` instead of `tActions('configButton')`
- `noRules` and `noRulesHint` were in wrong location (`requests` instead of `rules`)
- **Fix**: Moved keys to correct locations and used proper namespaces

### 3. Sub-component Translation Scope
- Each sub-component (EmployeesTab, RulesTab, etc.) needs its own `useTranslations()` declaration
- Cannot reuse parent's `t` function inside child components
- **Fix**: Added proper `useTranslations()` to each sub-component

### 4. Turbopack Cache
- Translation changes might not appear immediately
- **Fix**: Restart dev server and clear `.next` cache if needed

## Notes

- **Month names**: Use `common.calendar.months` and `common.calendar.monthsShort` from the common translations
- **Weekday names**: Use `common.calendar.weekdays` and `common.calendar.weekdaysShort`
- **Common actions**: Some actions (save, cancel, delete) exist in `common.actions` - you can use either
- **Navigation**: The "Horarios" / "Scheduling" navigation label is now in `common.navigation.scheduling`
- **JSON Validation**: Always validate JSON files have no duplicate keys (VS Code will show warnings)

## Benefits

✅ Support for multiple languages (Spanish/English initially)
✅ Easy to add new languages in the future
✅ Centralized text management
✅ Type-safe translation keys (with proper TypeScript setup)
✅ Consistent terminology across the app
✅ Better maintainability
