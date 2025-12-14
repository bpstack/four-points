# Frontend Error Solutions Guide

> **Project:** for-Points Frontend  
> **Date:** December 14, 2024  
> **Total Errors:** ~200+  
> **Estimated Time:** 4-6 hours

---

## Table of Contents

1. [Critical Errors (Fix First)](#1-critical-errors-fix-first)
2. [no-useless-escape](#2-no-useless-escape)
3. [no-explicit-any](#3-no-explicit-any)
4. [no-unused-vars](#4-no-unused-vars)
5. [react-hooks/exhaustive-deps](#5-react-hooksexhaustive-deps)
6. [react/no-unescaped-entities](#6-reactno-unescaped-entities)
7. [no-img-element](#7-no-img-element)
8. [Quick Fix Scripts](#8-quick-fix-scripts)
9. [ESLint Configuration Options](#9-eslint-configuration-options)

---

## 1. Critical Errors (Fix First)

### 1.1 react-hooks/rules-of-hooks

**File:** `app/components/layout/ProfileDropdown.tsx` (Line 29)

**Problem:** `useEffect` is called conditionally. React Hooks must be called in the same order on every render.

**❌ Wrong Pattern:**
```tsx
function ProfileDropdown({ user }) {
  if (!user) {
    return null  // Early return BEFORE hooks
  }
  
  useEffect(() => {  // ❌ Hook called after conditional return
    // some effect
  }, [])
  
  return <div>...</div>
}
```

**✅ Correct Pattern:**
```tsx
function ProfileDropdown({ user }) {
  // ALL hooks must be called BEFORE any conditional returns
  useEffect(() => {
    if (!user) return  // Handle condition INSIDE the hook
    // some effect
  }, [user])
  
  if (!user) {
    return null  // Early return AFTER all hooks
  }
  
  return <div>...</div>
}
```

**Alternative Pattern (if you need to skip the effect entirely):**
```tsx
function ProfileDropdown({ user }) {
  const [data, setData] = useState(null)
  
  useEffect(() => {
    if (!user) return  // Guard clause inside effect
    
    fetchData(user.id).then(setData)
  }, [user])
  
  if (!user) return null
  
  return <div>{data}</div>
}
```

---

## 2. no-useless-escape

**Files:**
- `app/api/auth/_backup_httponly_cookies/login/route.ts` (Line 35)
- `app/api/auth/_backup_httponly_cookies/refresh-token/route.ts` (Line 49)

**Problem:** The `-` character doesn't need escaping in this context.

**❌ Wrong:**
```typescript
const regex = /[\w\-\.]+/  // \- is unnecessary
```

**✅ Correct:**
```typescript
const regex = /[\w\-.]+/   // - at end of character class doesn't need escape
// OR
const regex = /[\w.-]+/    // . also doesn't need escape in character class
```

**Note:** Since these are backup files, consider:
1. Deleting them if not needed
2. Moving to `_archive/` folder
3. Adding to `.eslintignore`:
```
**/_backup_*/**
```

---

## 3. no-explicit-any

This is the most common error (~130+ occurrences). Here are solutions by pattern:

### 3.1 Error Handlers (Most Common)

**❌ Wrong:**
```typescript
catch (err: any) {
  setError(err.message)
}
```

**✅ Solution A - Type assertion:**
```typescript
catch (err: unknown) {
  const error = err as Error
  setError(error.message || 'Unknown error')
}
```

**✅ Solution B - Type guard (safer):**
```typescript
catch (err: unknown) {
  if (err instanceof Error) {
    setError(err.message)
  } else {
    setError('An unexpected error occurred')
  }
}
```

**✅ Solution C - Custom error type:**
```typescript
interface ApiError {
  message: string
  errors?: Record<string, string>
  status?: number
}

catch (err: unknown) {
  const error = err as ApiError
  if (error.errors) {
    setFieldErrors(error.errors)
  } else {
    setError(error.message || 'Unknown error')
  }
}
```

### 3.2 API Response Data

**❌ Wrong:**
```typescript
const data: any = await res.json()
```

**✅ Correct:**
```typescript
interface ApiResponse {
  success: boolean
  data?: YourDataType
  error?: string
}

const data: ApiResponse = await res.json()
```

### 3.3 Event Handlers

**❌ Wrong:**
```typescript
const handleChange = (e: any) => {
  setValue(e.target.value)
}
```

**✅ Correct:**
```typescript
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setValue(e.target.value)
}

// For select elements:
const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
  setOption(e.target.value)
}

// For form submit:
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault()
}
```

### 3.4 Function Parameters

**❌ Wrong:**
```typescript
const processItem = (item: any) => {
  return item.name
}
```

**✅ Correct:**
```typescript
interface Item {
  id: number
  name: string
}

const processItem = (item: Item) => {
  return item.name
}
```

### 3.5 Array Methods (map, filter, etc.)

**❌ Wrong:**
```typescript
data.map((item: any) => item.name)
```

**✅ Correct:**
```typescript
interface DataItem {
  id: number
  name: string
}

// Type the array itself
const data: DataItem[] = await fetchData()
data.map((item) => item.name)  // TypeScript infers item type

// OR inline
data.map((item: DataItem) => item.name)
```

### 3.6 Dynamic Objects

**❌ Wrong:**
```typescript
const config: any = {}
config.setting = 'value'
```

**✅ Solution A - Record type:**
```typescript
const config: Record<string, string> = {}
config.setting = 'value'
```

**✅ Solution B - Index signature:**
```typescript
interface Config {
  [key: string]: string | number | boolean
}
const config: Config = {}
```

**✅ Solution C - Specific interface:**
```typescript
interface Config {
  setting?: string
  enabled?: boolean
}
const config: Config = {}
config.setting = 'value'
```

### 3.7 Third-party Library Types

**❌ Wrong:**
```typescript
const chart: any = new Chart(ctx, options)
```

**✅ Correct:**
```typescript
import type { ChartConfiguration } from 'chart.js'

const options: ChartConfiguration = { /* ... */ }
const chart = new Chart(ctx, options)
```

### 3.8 Quick Reference Table

| Context | Replace `any` with |
|---------|-------------------|
| Error catch | `unknown` + type guard |
| Event handler | `React.ChangeEvent<HTMLInputElement>` |
| Form submit | `React.FormEvent<HTMLFormElement>` |
| Click handler | `React.MouseEvent<HTMLButtonElement>` |
| API response | Custom interface |
| Array items | `ItemType[]` |
| Object keys | `Record<string, ValueType>` |
| Unknown structure | `unknown` |

---

## 4. no-unused-vars

### 4.1 Unused Imports

**❌ Wrong:**
```typescript
import { useState, useEffect, useCallback } from 'react'  // useCallback not used
```

**✅ Correct:**
```typescript
import { useState, useEffect } from 'react'
```

### 4.2 Unused Variables in Destructuring

**❌ Wrong:**
```typescript
const { data, error, isLoading } = useQuery()  // error not used
```

**✅ Solution A - Remove it:**
```typescript
const { data, isLoading } = useQuery()
```

**✅ Solution B - Prefix with underscore (if intentionally unused):**
```typescript
const { data, _error, isLoading } = useQuery()
```

### 4.3 Unused Function Parameters

**❌ Wrong:**
```typescript
const handleClick = (event, index) => {  // event not used
  console.log(index)
}
```

**✅ Solution A - Underscore prefix:**
```typescript
const handleClick = (_event, index) => {
  console.log(index)
}
```

**✅ Solution B - Omit if possible:**
```typescript
const handleClick = (_, index) => {
  console.log(index)
}
```

### 4.4 Unused Catch Parameter

**❌ Wrong:**
```typescript
try {
  await doSomething()
} catch (err) {  // err not used
  setError('Operation failed')
}
```

**✅ Correct (ES2019+):**
```typescript
try {
  await doSomething()
} catch {  // Omit parameter entirely
  setError('Operation failed')
}
```

### 4.5 Files with Unused Imports to Fix

| File | Unused Imports |
|------|---------------|
| `app/api/logbooks/route.ts` | `LogbookEntry`, `LogbookComment` |
| `app/components/blacklist/mains/BlacklistModal.tsx` | `IoClose` |
| `app/components/blacklist/mains/BlacklistTable.tsx` | `useSearchParams`, `SEVERITY_COLORS`, `STATUS_COLORS` |
| `app/components/blacklist/mains/SearchBar.tsx` | `IoCalendarOutline`, `DOCUMENT_TYPES` |
| `app/components/cashier/reports/PaymentChart.tsx` | `Legend` |
| `app/dashboard/layout.tsx` | `FiBell` |
| `app/dashboard/departments/page.tsx` | `FiPackage` |
| `app/dashboard/cashier/hotel/layout.tsx` | `FiDollarSign` |

---

## 5. react-hooks/exhaustive-deps

### 5.1 Understanding the Problem

When `useEffect` or `useCallback` uses a variable but doesn't include it in the dependency array, the hook may use stale (outdated) values.

### 5.2 Solution Patterns

**Pattern A - Add the dependency:**
```typescript
// ❌ Wrong
useEffect(() => {
  loadData()
}, [])  // loadData is missing

// ✅ Correct
useEffect(() => {
  loadData()
}, [loadData])
```

**Pattern B - Wrap function in useCallback:**
```typescript
// ❌ Wrong
const loadData = () => {
  fetch(`/api/items?page=${page}`)
}

useEffect(() => {
  loadData()
}, [page])  // loadData should be dependency, but causes infinite loop

// ✅ Correct
const loadData = useCallback(() => {
  fetch(`/api/items?page=${page}`)
}, [page])

useEffect(() => {
  loadData()
}, [loadData])
```

**Pattern C - Move function inside useEffect:**
```typescript
// ✅ Best for functions only used in one effect
useEffect(() => {
  const loadData = async () => {
    const res = await fetch(`/api/items?page=${page}`)
    setData(await res.json())
  }
  loadData()
}, [page])
```

**Pattern D - Use functional updates for setState:**
```typescript
// ❌ Wrong - needs `count` in deps
useEffect(() => {
  const interval = setInterval(() => {
    setCount(count + 1)
  }, 1000)
  return () => clearInterval(interval)
}, [])

// ✅ Correct - functional update doesn't need `count`
useEffect(() => {
  const interval = setInterval(() => {
    setCount(prev => prev + 1)
  }, 1000)
  return () => clearInterval(interval)
}, [])
```

### 5.3 Specific Fixes for Your Files

#### SearchBar.tsx (Line 46)
```typescript
// Add applyFilters to useCallback or move inside useEffect
const applyFilters = useCallback(() => {
  // filter logic
}, [/* dependencies */])

useEffect(() => {
  applyFilters()
}, [applyFilters])
```

#### useBookingWizard.ts (Line 256)
```typescript
const validateDates = useCallback(() => {
  // validation logic
}, [startDate, endDate])

useEffect(() => {
  validateDates()
}, [validateDates])
```

#### HistoryTab.tsx (Line 32)
```typescript
const loadHistory = useCallback(async () => {
  const data = await fetchHistory(groupId)
  setHistory(data)
}, [groupId])

useEffect(() => {
  loadHistory()
}, [loadHistory])
```

---

## 6. react/no-unescaped-entities

### 6.1 Escape Characters Reference

| Character | Escape Code | Alternative |
|-----------|-------------|-------------|
| `"` | `&quot;` | `{'"'}` or `` {`"`} `` |
| `'` | `&apos;` | `{"'"}` or `` {`'`} `` |
| `<` | `&lt;` | `{'<'}` |
| `>` | `&gt;` | `{'>'}` |
| `&` | `&amp;` | `{'&'}` |

### 6.2 Examples

**❌ Wrong:**
```tsx
<p>Click "here" to continue</p>
<p>It's working</p>
```

**✅ Correct (entity codes):**
```tsx
<p>Click &quot;here&quot; to continue</p>
<p>It&apos;s working</p>
```

**✅ Correct (template literals):**
```tsx
<p>{`Click "here" to continue`}</p>
<p>{`It's working`}</p>
```

### 6.3 Files to Fix

| File | Line | Fix |
|------|------|-----|
| `ShiftCard.tsx` | 338 | `&quot;` or `` {`"..."` } `` |
| `ShiftCard.tsx` | 413 | `&quot;` or `` {`"..."` } `` |
| `cashier/hotel/page.tsx` | 71 | `&quot;` or `` {`"..."` } `` |
| `departments/page.tsx` | 265 | `&quot;` or `` {`"..."` } `` |

---

## 7. no-img-element

### 7.1 Basic Conversion

**❌ Wrong:**
```tsx
<img src="/photo.jpg" alt="Photo" width={200} height={150} />
```

**✅ Correct:**
```tsx
import Image from 'next/image'

<Image src="/photo.jpg" alt="Photo" width={200} height={150} />
```

### 7.2 External Images

Add domains to `next.config.ts`:

```typescript
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'your-api-domain.com',
      },
      {
        protocol: 'https',
        hostname: '**.cloudinary.com',  // Wildcard for subdomains
      },
    ],
  },
}
```

### 7.3 Dynamic/Unknown Sources

For user-uploaded images with unknown dimensions:

```tsx
<Image
  src={imageUrl}
  alt="User upload"
  width={0}
  height={0}
  sizes="100vw"
  style={{ width: '100%', height: 'auto' }}
/>
```

Or use `fill` for container-based sizing:

```tsx
<div style={{ position: 'relative', width: '200px', height: '150px' }}>
  <Image
    src={imageUrl}
    alt="User upload"
    fill
    style={{ objectFit: 'cover' }}
  />
</div>
```

### 7.4 Files to Fix

| File | Line |
|------|------|
| `BlacklistForm.tsx` | 372 |
| `CreateReportPanel.tsx` | 409 |
| `DetailTab.tsx` | 520 |

---

## 8. Quick Fix Scripts

### 8.1 Find and Replace Patterns (VS Code)

**Find unused imports:** Use VS Code extension "Remove Unused Imports"
- `Ctrl+Shift+P` → "Remove Unused Imports"

**Find all `any` types:**
```
Search: : any
Regex: :\s*any\b
```

**Find unescaped quotes in JSX:**
```
Regex: >[^<]*"[^<]*<
```

### 8.2 ESLint Auto-fix

```bash
# Fix auto-fixable errors
npx eslint --fix .

# Fix specific rules
npx eslint --fix --rule '@typescript-eslint/no-unused-vars: error' .
```

### 8.3 TypeScript Strict Mode Check

Add to `tsconfig.json` to catch more issues:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

---

## 9. ESLint Configuration Options

### 9.1 Downgrade Errors to Warnings (Temporary)

In `.eslintrc.json`:

```json
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": "warn",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

### 9.2 Disable Rules (Not Recommended)

```json
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "off"
  }
}
```

### 9.3 Ignore Specific Files

In `.eslintignore`:

```
# Backup files
**/_backup_*/**
**/*.disabled*.ts

# Generated files
.next/
node_modules/
```

### 9.4 Inline Disable (Last Resort)

```typescript
// Disable for next line
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = response.json()

// Disable for entire file (add at top)
/* eslint-disable @typescript-eslint/no-explicit-any */
```

---

## Priority Order for Fixes

### Phase 1: Critical (30 min)
1. ✅ `react-hooks/rules-of-hooks` in ProfileDropdown.tsx
2. ✅ `no-useless-escape` in backup files (or delete/ignore them)

### Phase 2: Unused Variables (1 hour)
3. Remove unused imports (~35 files)
4. Remove or prefix unused variables

### Phase 3: Unescaped Entities (15 min)
5. Fix `&quot;` issues (~12 cases)

### Phase 4: Hook Dependencies (2 hours)
6. Fix `exhaustive-deps` warnings (~14 cases)

### Phase 5: Types (3+ hours)
7. Replace `any` with proper types (~130+ cases)
   - Start with error handlers (most common pattern)
   - Then API responses
   - Then event handlers

### Phase 6: Images (30 min)
8. Convert `<img>` to `<Image>` (3 files)

---

## Recommended Workflow

```bash
# 1. Fix auto-fixable issues first
cd frontend
npx eslint --fix .

# 2. Run build to see remaining errors
pnpm build 2>&1 | head -100

# 3. Fix errors by file/type
# Start with critical errors, then work through phases

# 4. Commit incrementally
git add -p  # Stage changes interactively
git commit -m "fix: [specific fix description]"
```

---

## Common Type Definitions to Create

Create `app/types/common.ts`:

```typescript
// API Error type
export interface ApiError {
  message: string
  errors?: Record<string, string>
  status?: number
}

// Generic API Response
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Pagination
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

// Form field errors
export type FieldErrors = Record<string, string>

// Generic ID type
export type ID = number | string
```

Then import where needed:

```typescript
import type { ApiError, ApiResponse } from '@/app/types/common'
```