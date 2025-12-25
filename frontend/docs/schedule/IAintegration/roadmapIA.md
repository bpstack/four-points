# Roadmap AI Integration - Schedule Generator V2

## Modelo Confirmado

**Claude `claude-sonnet-4-20250514`**

---

## Fase 1: Estructura Base - COMPLETADA

### Archivos creados

```
backend/services/scheduling/ai/
  index.ts           
  types.ts           
  ai-client.ts       
  ai-prompt-builder.ts  
  ai-context-builder.ts 
  ai-proposal-validator.ts 
  ai-logger.ts       
  README.md          (documentacion de control AI)
```

### Dependencias

```bash
cd backend
pnpm add @anthropic-ai/sdk  # Instalado (^0.71.2)
```

### Variables de entorno

```env
ANTHROPIC_API_KEY=sk-ant-api03-...
CLAUDE_MODEL=claude-sonnet-4-20250514
AI_ENABLED=true
```

---

## Fase 2: Integracion - COMPLETADA

### Archivos creados/modificados

```
backend/services/scheduling/phases/
  ai-optimization.phase.ts  (fase de optimizacion IA)

backend/services/scheduling/phases/
  index.ts                  (createAIPhaseRegistry exportada)

backend/services/scheduling/types/
  index.ts                  (IPhase soporta async)

backend/services/scheduling/phases/
  base-phase.ts             (execute soporta async)
  registry.ts               (executeAll es async)

backend/services/scheduling/
  schedule-generator-v2.ts  (arquitectura AI fuera del loop)
```

---

## Fase 2.5: Configuracion Enum - COMPLETADA

### Problema detectado

La IA no se ejecutaba porque:

1. `aiProvider` en DB estaba en `'none'`
2. El enum no incluia `'claude'` como opcion valida

### Archivos corregidos

| Archivo | Cambio |
|---------|--------|
| `validations/scheduling/scheduling-schemas.ts` | Agregado `'claude'` al enum |
| `models/scheduling/index.ts` | Agregado `'claude'` a tipos (2 lugares) |
| `repositories/scheduling/scheduling-repository.ts` | Agregado `'claude'` al cast |
| `db-mysql/aiven/19_scheduling.sql` | Cambiado valor default a `'claude'` |
| `db-mysql/local/19_scheduling.sql` | Cambiado valor default a `'claude'` |

### Valores del enum aiProvider

```typescript
aiProvider: 'none' | 'claude' | 'ollama' | 'openai'
```

---

## Fase 3: Arquitectura AI Fuera del Loop - COMPLETADA (25 Dic 2024)

### Problema detectado

La fase AI estaba DENTRO del loop de 50 intentos, lo que causaba:
- AI se ejecutaba hasta 50 veces (costoso en tokens)
- Cambios de AI se perdian en cada nuevo intento
- Lentitud extrema (6+ segundos por intento)

### Solucion implementada

Nueva arquitectura en `schedule-generator-v2.ts`:

```
FASE 1: Loop 50 intentos (SIN AI)
├── Cada intento ejecuta fases 10-90
├── Se guarda el mejor resultado (menos errores)
└── Si hay 0 errores, termina temprano

FASE 2: AI Optimization (UNA VEZ)
├── Solo si aiProvider !== 'none'
├── Solo si AI_ENABLED === true en .env
├── Ejecuta AIOptimizationPhase sobre el mejor resultado
├── Re-valida despues de cambios AI
└── Log: "After AI: X errors (was Y) [emoji] +Z fixed"

FASE 3: Retornar resultado final
```

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `phases/index.ts` | Creada `createAIPhaseRegistry()` separada |
| `phases/index.ts` | AI removida de `createDefaultPhaseRegistry()` |
| `schedule-generator-v2.ts` | Importa `createAIPhaseRegistry` y `FinalValidationPhase` |
| `schedule-generator-v2.ts` | Loop sin AI, AI ejecuta despues del loop |
| `schedule-generator-v2.ts` | Re-validacion post-AI |
| `schedule-generator-v2.ts` | Logs mejorados con emojis |

### Logs de la nueva arquitectura

```
[Schedule] Starting generation (50 max attempts)
[Schedule] Attempt 1: 22 errors (11ms)
[Schedule] Attempt 2: 19 errors (4ms)
...
[Schedule] Attempt 47: 15 errors (3ms)
[Schedule] AI config: provider="claude", env_enabled=true
[Schedule] 🤖 Running AI optimization on best result (15 errors)...
[AI] ════════════════════════════════════════
[AI] 🤖 Starting optimization
[AI] 📊 Errors to resolve: 15
[AI] 📤 Sending request to Claude...
[AI] 📥 Response received (5234ms)
[AI] 📝 Proposed 7 changes (confidence: 0.85)
[AI] ✅ Applied 4 changes
[AI] ❌ Rejected 3 changes (would break coverage)
[AI] 📈 Result: 15 errors → 11 errors
[AI] ════════════════════════════════════════
[Schedule] 🤖 AI optimization completed in 5240ms
[Schedule] Re-validating after AI changes...
[Schedule] After AI: 11 errors (was 15) ✅ +4 fixed
[Schedule] ❌ Completed with 11 errors (5500ms total)
```

---

## Fase 4: Control AI desde Frontend - COMPLETADA (25 Dic 2024)

### Cambios en Frontend

**Archivo:** `frontend/app/components/scheduling/SchedulingConfigClient.tsx`

| Cambio | Descripcion |
|--------|-------------|
| Tab "Turnos" eliminado | Ya no es tab separado |
| Turnos movido a "Configuracion General" | Seccion informativa dentro del tab |
| Selector AI mejorado | Nuevas opciones: Desactivado, Claude, OpenAI, Ollama |
| Badge "IA Activa" | Indicador visual verde con pulso cuando AI esta activa |
| Mensaje informativo | Explica que hace la AI cuando esta activa |

### Opciones del selector AI

| Valor en DB | Label en Frontend | Descripcion |
|-------------|-------------------|-------------|
| `none` | Desactivado | Solo usa algoritmo base |
| `claude` | Claude (Anthropic) | Usa Claude para optimizar |
| `openai` | OpenAI | Usa GPT para optimizar |
| `ollama` | Ollama (Local) | Usa modelo local |

### Como funciona el control

```
┌─────────────────────────────────────────────────────────┐
│                    ¿Se usa la IA?                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   .env (AI_ENABLED)     +    DB (ai_provider)          │
│        ↓                          ↓                     │
│      true               +       claude      →  ✅ SI    │
│      true               +       none        →  ❌ NO    │
│      false              +       claude      →  ❌ NO    │
│      false              +       none        →  ❌ NO    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Recomendacion de uso

1. **`.env` → Dejarlo SIEMPRE en `AI_ENABLED=true`**
2. **Frontend → Controlar AI desde Configuracion General**
3. **`.env` solo para emergencias** (API caida, etc.)

---

## Fase 5: Documentacion - COMPLETADA (25 Dic 2024)

### Archivos de documentacion

| Archivo | Contenido |
|---------|-----------|
| `backend/services/scheduling/ai/README.md` | Control y troubleshooting de AI |
| `frontend/docs/schedule/IAintegration/roadmapIA.md` | Este archivo |
| `frontend/docs/schedule/IAintegration/AINFO.md` | Info tecnica del modelo |
| `frontend/docs/schedule/IAintegration/ia.md` | Documentacion general |

---

## Como Verificar que AI Funciona

### 1. En el Frontend

- Ir a: `http://localhost:3000/dashboard/scheduling/config?tab=general`
- Seccion "Proveedor IA" debe mostrar "Claude (Anthropic)" seleccionado
- Badge verde "IA Activa" debe aparecer

### 2. En los Logs (al generar horario)

Buscar estas lineas en la terminal del backend:

```
[Schedule] AI config: provider="claude", env_enabled=true
[Schedule] 🤖 Running AI optimization on best result...
[AI] 🤖 Starting optimization
```

Si AI esta desactivada:

```
[Schedule] AI config: provider="none", env_enabled=true
[Schedule] ⚠️ AI disabled via DB (ai_provider=none)
```

### 3. En la Base de Datos

```sql
SELECT * FROM scheduling_config WHERE config_key = 'ai_provider';
-- Debe mostrar: config_value = 'claude'
```

---

## Troubleshooting

### "No veo logs de AI"

1. Verificar `.env` tiene `AI_ENABLED=true`
2. Verificar en DB: `SELECT config_value FROM scheduling_config WHERE config_key = 'ai_provider'`
3. Reiniciar el servidor si cambiaste `.env`

### "AI no hace cambios"

La AI puede rechazar cambios si rompen restricciones:
```
[AI] ❌ Rejected 5 changes:
[AI]    ✗ Would leave only 0 morning staff (min: 1)
```

### "Error de API key"

Verificar en `.env`:
```env
ANTHROPIC_API_KEY=sk-ant-...  # Para Claude
```

### "AI tarda mucho"

Normal. Claude tarda 3-10 segundos en responder. Los logs muestran el tiempo:
```
[AI] 📥 Response received (5234ms)
```

---

## Resumen de Archivos Modificados (Sesion 25 Dic 2024)

### Backend

| Archivo | Tipo | Descripcion |
|---------|------|-------------|
| `services/scheduling/schedule-generator-v2.ts` | MODIFICADO | Arquitectura AI fuera del loop |
| `services/scheduling/phases/index.ts` | MODIFICADO | createAIPhaseRegistry() separada |
| `services/scheduling/ai/README.md` | CREADO | Documentacion control AI |
| `validations/scheduling/scheduling-schemas.ts` | MODIFICADO | Enum incluye 'claude' |
| `models/scheduling/index.ts` | MODIFICADO | Tipos incluyen 'claude' |
| `repositories/scheduling/scheduling-repository.ts` | MODIFICADO | Cast incluye 'claude' |
| `db-mysql/aiven/19_scheduling.sql` | MODIFICADO | Default 'claude' |
| `db-mysql/local/19_scheduling.sql` | MODIFICADO | Default 'claude' |

### Frontend

| Archivo | Tipo | Descripcion |
|---------|------|-------------|
| `app/components/scheduling/SchedulingConfigClient.tsx` | MODIFICADO | Tab Turnos eliminado, AI mejorado |

### Documentacion

| Archivo | Tipo |
|---------|------|
| `frontend/docs/schedule/IAintegration/roadmapIA.md` | ACTUALIZADO |
| `backend/services/scheduling/ai/README.md` | CREADO |

---

## Estado Final

- **AI Integration:** FUNCIONAL
- **Control Frontend:** FUNCIONAL  
- **Control .env:** FUNCIONAL (emergencia)
- **Logs:** FUNCIONALES con emojis
- **Documentacion:** COMPLETA

### Arquitectura Final

```
Usuario genera horario
        ↓
[Loop 50 intentos - SIN AI]
        ↓
    Mejor resultado
        ↓
[AI habilitada?] ──NO──→ Retornar resultado
        ↓ SI
[AI Optimization - 1 vez]
        ↓
[Re-validacion]
        ↓
    Resultado final
```
