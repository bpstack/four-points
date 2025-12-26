# Implementación i18n - Four Points Hotel PMS

## Análisis del Proyecto (23-dic-2025)

### Resumen Ejecutivo

| Métrica | Valor |
|---------|-------|
| Archivos que necesitan i18n | ~200 |
| Toast notifications | 100+ instancias |
| Labels de formularios | 150+ campos |
| Mensajes de validación | 100+ strings |
| Mensajes API backend | 100+ strings |
| Items de navegación | 20+ items |
| Estado actual idiomas | ~60% ES / ~40% EN (inconsistente) |

---

## Decisiones Finales

| # | Pregunta | Decisión |
|---|----------|----------|
| 1 | Librería | **next-intl** |
| 2 | URLs | **Cookie** (sin URLs localizadas, no necesita SEO) |
| 3 | Idioma default | **Español (ES)** |
| 4 | Detección automática | **Sí** (navigator.language) |
| 5 | Ubicación selector | **ProfileDropdown** |
| 6 | Backend strategy | **Códigos** (frontend traduce) |
| 7 | Zod validations | **Códigos** (UI traduce) |
| 8 | Scope migración | **Todo a la vez** (con roadmap.md tracking) |
| 9 | Formato archivos | **Por módulo** (escalable) |
| 10 | Fechas/números | **No** (mantener formato español siempre) |

---

## Estructura de Archivos

```
frontend/
├── messages/
│   ├── es/
│   │   ├── common.json        # Navegación, botones, labels comunes
│   │   ├── dashboard.json     # Dashboard principal
│   │   ├── parking.json       # Módulo parking
│   │   ├── logbooks.json      # Módulo logbooks
│   │   ├── groups.json        # Módulo grupos
│   │   ├── cashier.json       # Módulo caja
│   │   ├── maintenance.json   # Módulo mantenimiento
│   │   ├── blacklist.json     # Módulo blacklist
│   │   ├── backoffice.json    # Módulo backoffice
│   │   ├── messages.json      # Módulo mensajería
│   │   ├── profile.json       # Perfil y settings
│   │   ├── auth.json          # Login, register, auth
│   │   ├── errors.json        # Mensajes de error API
│   │   └── validation.json    # Validaciones Zod
│   └── en/
│       └── ... (misma estructura)
│
├── app/
│   ├── i18n/
│   │   ├── config.ts          # Configuración locales
│   │   └── request.ts         # getRequestConfig para next-intl
│   └── components/
│       └── LanguageSwitcher.tsx
│
└── middleware.ts              # Actualizado para i18n (cookie-based)
```

---

## Notas Técnicas

### Cookie-based i18n (sin loop infinito)

El idioma se guardará en una cookie `NEXT_LOCALE` que:
- NO interfiere con el sistema de auth existente
- Se lee en middleware ANTES de las cookies de auth
- No causa redirects (solo setea locale internamente)

### Detección automática

Primera visita:
1. Leer `navigator.language` → ej: "es-ES" o "en-US"
2. Extraer código base → "es" o "en"
3. Si está soportado → usar ese idioma
4. Si no → usar español (default)
5. Guardar en cookie `NEXT_LOCALE`

### Backend códigos de error

```typescript
// Ejemplo de mapeo
const ERROR_CODES = {
  BOOKING_NOT_FOUND: { status: 404 },
  INVALID_DATE_FORMAT: { status: 400 },
  UNAUTHORIZED: { status: 401 },
  // ...
}

// Backend responde
res.status(404).json({ 
  success: false, 
  code: 'BOOKING_NOT_FOUND' 
})

// Frontend traduce
const message = t(`errors.${response.code}`)
toast.error(message)
```

---

## Referencias

- [next-intl docs](https://next-intl-docs.vercel.app/)
- [App Router integration](https://next-intl-docs.vercel.app/docs/getting-started/app-router)
- [Cookie-based locale](https://next-intl-docs.vercel.app/docs/routing#locale-cookie)

---

*Ver roadmap.md para el progreso de implementación*
