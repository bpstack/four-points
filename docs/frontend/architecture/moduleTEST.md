# Prompt para Revisar Módulos - Four Points

## Uso

Reemplaza `[MODULO]` con el nombre del módulo (Cashier, Logbooks, Profile, etc) y pega el prompt a la IA.

---

## PROMPT SIMPLE (RECOMENDADO)

```
Revisa el módulo [MODULO] de Four Points usando estos criterios pragmáticos:

**Criterios de ALTA Prioridad (Críticos):**
1. ¿Hay duplicación de código? (React Query + Server Actions haciendo lo mismo)
2. ¿Todos los tipos TypeScript están completos? (props, responses, state)
3. ¿Queries y mutations están bien separados? (queries.ts, store.ts, components/)
4. ¿React Query está bien usado? (query keys factory, invalidación correcta, staleTime)

**Criterios de MEDIA Prioridad:**
5. ¿Hay componentes > 300 líneas? (dividir si es el caso)
6. ¿Existen loading states? (loading.tsx o skeletons)
7. ¿Hay error boundaries? (error.tsx para recuperación)

**Criterios de BAJA Prioridad:**
8. ¿Se usa URL state (searchParams) solo donde aporte valor?
9. ¿Zustand está optimizado? (selectores individuales)

**Contexto:**
- Esta es una app PRIVADA de dashboard (no SEO)
- Archivos > 300 líneas = difícil mantener
- No forzar Server Components donde no aportan
- No duplicar data fetching (React Query ya hace el trabajo)

Proporciona:
1. Estado actual (✅ bien / ⚠️ mejorable / ❌ crítico)
2. Top 3 issues si hay
3. Recomendaciones concretas
4. Esfuerzo estimado de mejoras
```

---

## PROMPT DETALLADO (SI NECESITAS MÁS)

```
Revisa arquitectura del módulo [MODULO] en Four Points.

**PARTE 1: Estructura de Ficheros**
- ¿Tiene queries.ts (React Query)?
- ¿Tiene store.ts o hooks para Zustand?
- ¿Tiene components/ bien organizado?
- ¿Tiene types.ts separado?
- ¿Tiene actions/? (Si SÍ, ¿por qué si ya tiene queries.ts?)

**PARTE 2: React Query**
- ¿Query keys usan factory pattern?
- ¿staleTime configurado apropiadamente?
- ¿Invalidaciones son específicas (no globales)?
- ¿Hay initialData del SSR siendo reutilizado?
- ¿Error handling presente?

**PARTE 3: Zustand (si lo usa)**
- ¿Selectores son individuales? (no devolver todo el estado)
- ¿Usa useShallow para múltiples valores?
- ¿El estado es solo para UI? (no server state)

**PARTE 4: Componentes**
- ¿Hay componentes > 300 líneas?
- ¿Hay barrel exports?
- ¿Props bien tipadas?
- ¿'use client' solo donde es necesario?

**PARTE 5: Loading/Error**
- ¿Existe loading.tsx?
- ¿Existe error.tsx?
- ¿Hay skeletons en componentes?

**PARTE 6: TypeScript**
- ¿No hay 'any'?
- ¿Todos los responses tipados?
- ¿Types compartidos entre módulos?

Resultado esperado:
1. Puntuación (1-10)
2. Top 3 issues críticos
3. 3-5 mejoras recomendadas (con esfuerzo)
4. Ejemplos de código mejorado si es necesario
```

---

## PROMPT MINIMALISTA (MÁS RÁPIDO)

```
Revisa [MODULO] - Four Points.

Busca SOLO estos 5 issues:
1. ❌ Duplicación (queries + actions)?
2. ❌ Componentes > 300 líneas?
3. ❌ Sin loading.tsx o error.tsx?
4. ❌ TypeScript incompleto (any)?
5. ❌ React Query mal usado (query keys, staleTime)?

Responde: Verde 🟢 / Amarillo 🟡 / Rojo 🔴 para cada punto.
```

---

## PROMPT POR TIPO DE MÓDULO

### Para módulos SIMPLES (Profile, Maintenance, etc)

```
Revisa el módulo [MODULO]:

Solo verifica:
1. ¿React Query está bien usado? (query keys factory, staleTime)
2. ¿Componentes separados? (< 300 líneas)
3. ¿TypeScript completo?

Sí = 8+/10, No = 6-7/10
```

### Para módulos COMPLEJOS (Cashier, Conciliation, etc)

```
Revisa el módulo [MODULO]:

Verifica:
1. React Query: query keys factory, invalidación, staleTime
2. Zustand: selectores optimizados, estado solo UI
3. Componentes: separación de concerns, < 300 líneas
4. Loading/Error: loading.tsx, error.tsx presentes
5. TypeScript: sin any, types compartidos

Puntuación esperada: 8-9/10
```

### Para módulos sin BACKEND (Restaurant)

```
Revisa el módulo [MODULO]:

Estado actual (prototipo sin backend):
1. ¿Mock data bien estructurado?
2. ¿Listo para conectar backend?
3. ¿Componentes reutilizables?
4. Cuando tengas backend:
   - Reemplazar mock por React Query
   - Agregar loading/error states
   - Validar tipos con API real

Puntuación actual: [X]/10 (prototipo)
```

---

## EJEMPLOS DE USO

### Ejemplo 1: Revisar Cashier

```
Revisa el módulo Cashier de Four Points usando estos criterios pragmáticos:

**Criterios de ALTA Prioridad:**
1. ¿Hay duplicación de código? (React Query + Server Actions)
2. ¿Todos los tipos TypeScript están completos?
3. ¿Queries y mutations están separados?
4. ¿React Query está bien usado?

**Criterios de MEDIA Prioridad:**
5. ¿Hay componentes > 300 líneas?
6. ¿Existen loading states?
7. ¿Hay error boundaries?

**Criterios de BAJA Prioridad:**
8. ¿Zustand está optimizado?

Proporciona:
1. Estado actual (✅ / ⚠️ / ❌)
2. Top 3 issues
3. Recomendaciones
4. Esfuerzo estimado
```

### Ejemplo 2: Revisar Logbooks

```
Revisa el módulo Logbooks de Four Points.

Busca SOLO estos 5 issues:
1. ❌ Duplicación (useLogbooks + useLogbookMutations)?
2. ❌ Componentes > 300 líneas?
3. ❌ Sin loading.tsx o error.tsx?
4. ❌ TypeScript incompleto?
5. ❌ React Query mal usado?

Responde: Verde 🟢 / Amarillo 🟡 / Rojo 🔴 para cada punto.
```

### Ejemplo 3: Revisar Restaurant

```
Revisa el módulo Restaurant de Four Points (prototipo):

Estado actual (sin backend):
1. ¿Mock data bien estructurado?
2. ¿Listo para conectar backend?
3. ¿Componentes reutilizables?

Cuando tengas backend:
- Reemplazar mock por React Query
- Agregar loading/error states
- Validar tipos con API real
```

---

## REFERENCIA RÁPIDA

Copiar-pegar según necesidad:

**SIMPLE** (5 min)

```
Revisa [MODULO]:
1. ¿Duplicación código?
2. ¿Componentes > 300 líneas?
3. ¿loading.tsx + error.tsx?
4. ¿TypeScript completo?
5. ¿React Query bien usado?

Verde/Amarillo/Rojo para cada uno.
```

**ESTÁNDAR** (10 min)

```
Revisa [MODULO] - High priority:
1. Duplicación (React Query + Server Actions)?
2. TypeScript completo?
3. Queries/mutations separados?
4. React Query bien usado?

Media priority:
5. Componentes > 300 líneas?
6. Loading states?
7. Error boundaries?

Estado + Top 3 issues + recomendaciones.
```

**DETALLADO** (15 min)
Usa el "PROMPT DETALLADO" completo.

---

## Checklist: Antes de enviar a la IA

- [ ] Reemplacé [MODULO] con el nombre real
- [ ] Seleccioné el nivel de detalle (simple/estándar/detallado)
- [ ] Tengo el código del módulo listo para pastear
- [ ] Sé cuál es el resultado esperado

---

## Módulos a Revisar

```
Priority 1 (Critical):
  ✅ Logbooks (7.5/10 - SIN duplicación, componente grande)
  - [ ] Restaurant (sin backend)

Priority 2 (Medium):
  - [ ] Profile (SettingsPanel 1,209 líneas)
  - [ ] Cashier (ShiftCard 463 líneas)
  - [ ] Groups (componentes grandes)

Priority 3 (Low):
  ✅ Maintenance (8/10 - duplicación aceptable)
  - [ ] Conciliation
  - [ ] Blacklist

Ya excelentes:
  ✅ Parking (9/10)
  ✅ Backoffice (9/10)
```
