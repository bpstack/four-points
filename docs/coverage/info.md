# Coverage - Documentacion del Sistema de Cobertura de Codigo

## Estado Actual (2026-01-19)

### Resumen Ejecutivo

El sistema de coverage esta **parcialmente configurado pero subutilizado**. Existe un reporte de cobertura generado pero proviene de una ejecucion anterior y no refleja el estado actual del codigo.

**Metricas globales actuales:**
- Statements: 1.48% (286/19204)
- Branches: 47.42% (83/175)
- Functions: 17.75% (19/107)
- Lines: 1.48% (286/19204)

---

## Lo que ESTA Implementado

### 1. Estructura de Archivos de Coverage

```
backend/coverage/
├── index.html                    # Reporte principal (HTML interactivo)
├── coverage-final.json           # Datos crudos en JSON
├── lcov.info                     # Formato LCOV para herramientas externas
├── base.css                      # Estilos del reporte
├── prettify.css/js              # Resaltado de sintaxis
├── sorter.js                    # Ordenamiento de columnas
├── block-navigation.js          # Navegacion entre bloques
├── favicon.png                  # Icono del reporte
├── sort-arrow-sprite.png        # Sprite para ordenamiento
│
├── config/                      # Coverage de modulo config
│   ├── index.html
│   └── config.ts.html
│
├── middlewares/                 # Coverage de middlewares
│   ├── index.html
│   ├── authenticateToken.ts.html   # 100% coverage
│   ├── demoRestriction.ts.html     # 100% coverage
│   ├── rateLimiter.ts.html         # 0% coverage
│   └── roleCheck.ts.html           # 100% coverage
│
└── lcov-report/                 # Version LCOV del reporte
    ├── index.html
    ├── middlewares/
    │   ├── index.html
    │   ├── authenticateToken.ts.html
    │   ├── demoRestriction.ts.html
    │   ├── rateLimiter.ts.html
    │   └── roleCheck.ts.html
    └── favicon.png
```

### 2. Middlewares con Cobertura (UNICO modulo con tests)

| Archivo | Statements | Branches | Functions | Lines |
|---------|------------|----------|-----------|-------|
| `authenticateToken.ts` | 100% (42/42) | 100% (14/14) | 100% (1/1) | 100% (42/42) |
| `demoRestriction.ts` | 100% (52/52) | 73.68% (14/19) | 100% (3/3) | 100% (52/52) |
| `roleCheck.ts` | 100% (145/145) | 100% (50/50) | 100% (10/10) | 100% (145/145) |
| `rateLimiter.ts` | 0% (0/86) | 0% (0/1) | 0% (0/1) | 0% (0/86) |

### 3. Validaciones con Cobertura

| Archivo | Statements | Branches | Functions | Lines |
|---------|------------|----------|-----------|-------|
| `validations/logbook/index.ts` | 100% (47/47) | 100% (1/1) | 50% (1/2) | 100% (47/47) |

### 4. Scripts en package.json

```json
{
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "test:unit": "node --test tests/user.test.js",
    "test:auth": "node --test tests/auth.integration.test.js",
    "test:users": "node --test tests/user-routes.integration.test.js",
    "test:watch": "node --test --watch tests/**/*.test.js",
    "test:coverage": "node --test --experimental-test-coverage tests/**/*.test.js"
  }
}
```

---

## Lo que NO esta Implementado

### 1. Archivos de Test

**No existen archivos de test** en la ubicacion esperada (`backend/tests/`).

Los scripts en package.json referencian archivos que no existen:
- `tests/user.test.js`
- `tests/auth.integration.test.js`
- `tests/user-routes.integration.test.js`

### 2. Modulos sin Coverage

| Categoria | Coverage |
|-----------|----------|
| controllers/ (todos) | 0% |
| repositories/ (todos) | 0% |
| services/ (casi todos) | 0% |
| validations/ (excepto logbook) | 0% |
| models/ | No medido |
| routes/ | No medido |
| config/ | 0% |

### 3. Configuracion de Coverage

No existe archivo de configuracion dedicado para:
- Umbrales de coverage requeridos
- Exclusiones de archivos/carpetas
- Formato de salida personalizado
- Integracion con CI/CD

---

## Como Ejecutar el Sistema de Coverage

### Requisitos Previos

```bash
# Verificar quepnpm este instalado
pnpm --version

# Debe ser >= 8.0
```

### Ejecucion Rapida

```bash
# 1. Ir al directorio del backend
cd backend

# 2. Ejecutar tests con coverage
pnpm test:coverage
```

### Comandos Disponibles

```bash
# Ejecutar todos los tests
pnpm test

# Ejecutar un test especifico
pnpm test:unit          # tests/user.test.js (no existe)
pnpm test:auth          # tests/auth.integration.test.js (no existe)
pnpm test:users         # tests/user-routes.integration.test.js (no existe)

# Ejecutar en modo watch
pnpm test:watch

# Ejecutar con coverage
pnpm test:coverage
```

### Con Node.js Directamente

```bash
cd backend

# Con soporte nativo de coverage (Node.js 20+)
node --test --experimental-test-coverage tests/**/*.test.js

# Con Istanbul (coverage legacy)
npx istanbul cover node_modules/.bin/_mocha -- tests/**/*.js
```

---

## Como Ver el Reporte en el Navegador

### Opcion 1: Abrir Archivo Directamente

```bash
# Windows
start backend/coverage/index.html

# O manualmente:
# C:\Users\dz\projects\Four-Points\backend\coverage\index.html
```

### Opcion 2: Servidor Local (Recomendado)

```bash
# Usando npx serve (mas rapido)
npx serve backend/coverage

# Usando http-server
npx http-server backend/coverage -p 8080

# Usando Python (si esta instalado)
cd backend/coverage && python -m http.server 8080
```

Luego abrir: `http://localhost:8080`

### Opcion 3: Con el Servidor de Desarrollo

```bash
# Desde la raiz del proyecto
cd backend

# Ejecutar el servidor con coverage
pnpm test:coverage

# El reporte se genera automaticamente en:
# backend/coverage/index.html
```

### Navegacion del Reporte

1. **Pagina Principal**: Vista general de todos los archivos
2. **Click en carpeta**: Navega a coverage de modulo especifico
3. **Click en archivo**: Ve el codigo fuente con lineas resaltadas:
   - **Verde**: Lineas cubiertas
   - **Rojo**: Lineas NO cubiertas
   - **Amarillo**: Branch parcial
4. **Teclas de navegacion**:
   - `n` / `j`: Siguiente bloque no cubierto
   - `b` / `p`: Bloque anterior
   - `k`: Saltar al siguiente archivo

---

## Como Agregar Tests (Guia Rapida)

### Estructura de Archivos de Test

```
backend/tests/
├── unit/
│   ├── user.test.js
│   └── auth.test.js
├── integration/
│   ├── auth.integration.test.js
│   └── api.integration.test.js
└── e2e/
    └── *.test.js
```

### Ejemplo de Test Unitario

```javascript
// tests/unit/auth.test.js
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert'

describe('Auth Controller', () => {
  it('should validate user credentials', () => {
    // Tu test aqui
    assert.strictEqual(true, true)
  })
})
```

### Ejemplo de Test con Coverage

```bash
# Node.js 20+ soporta coverage nativo
node --test --experimental-test-coverage tests/**/*.test.js
```

---

## Configuracion Recomendada

### Instalar Dependencias de Test

```bash
cd backend
pnpm add -D @types/node
```

### Crear vitest.config.ts (Opcional)

```typescript
// backend/vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
      ],
    },
  },
})
```

---

## Siguientes Pasos Recomendados

1. **Crear primeros tests unitarios** para los controllers mas utilizados
2. **Configurar Vitest** para mejor integracion con TypeScript
3. **Establecer thresholds** de coverage (ej: 80% statements)
4. **Integrar con CI/CD** para ejecutar coverage en cada push
5. **Agregar tests de integracion** para los endpoints principales
6. **Crear tests E2E** para flujos criticos de usuario

---

## Notas

- El reporte actual fue generado el `2026-01-04T12:48:15.999Z`
- La herramienta de coverage usada fue **Istanbul** (no nativo de Node.js)
- Para regenerar el reporte actualizado, primero deben crearse los archivos de test
- El modulo `middlewares/` es el unico con coverage porque fue el unico modulo con tests escritos
