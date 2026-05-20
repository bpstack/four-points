# docs/backend/ — Índice de Documentación

## Estructura actual

```
docs/backend/
├── README.md                          ← este archivo
│
├── auth/
│   └── productionAuthSetup.md         ← cookies HttpOnly en producción
│
├── bff/
│   └── BFF.md                         ← arquitectura backend-for-frontend
│
├── config/
│   └── cors-configuration.md          ← configuración CORS (index.ts)
│
├── enviroments/
│   └── environment-variables.md       ← variables de entorno (.env)
│
├── scheduling/
│   ├── README.md                      ← arquitectura completa del módulo
│   └── solver-setup.md                ← daemon Python, OR-Tools, tests
│
├── security/
│   └── security-implementation.md     ← JWT, roleCheck, middlewares
│
├── testing/
│   ├── README.md                      ← guía de tests y comandos
│   ├── TESTING-REALITY-CHECK.md       ← qué testear y qué no
│   └── SECURITY-FINDINGS.md          ← vulnerabilidades detectadas
│
└── pdfPROXY.md                        ← proxy de PDFs (backoffice)
```

## Fuente de verdad para DB

La documentación de base de datos **no** está en `docs/backend/`. Está directamente en:

```
backend/db-mysql/
├── INDEX.md               ← índice de todas las tablas
├── MIGRATION_GUIDE.md     ← cómo aplicar migraciones
├── MIGRATIONS_POLICY.md   ← política de scripts incrementales
├── scripts/               ← scripts incrementales (post-instalación)
└── aiven/                 ← scripts base de instalación completa
```
