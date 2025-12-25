# Sistema de IA para Optimización de Horarios

## Resumen

El módulo de IA es un sistema de **optimización de último recurso**. Se ejecuta después de que el algoritmo principal haya hecho 50 intentos de generar un horario. Su trabajo es proponer cambios puntuales para resolver errores que el algoritmo no pudo solucionar.

**Importante**: La IA no genera horarios desde cero. Solo propone cambios sobre un horario ya generado, y cada cambio se valida antes de aplicarse.

---

## Arquitectura

```
ai/
├── index.ts                  # Exports del módulo
├── types.ts                  # Tipos e interfaces
├── ai-client.ts              # Cliente que coordina todo
├── ai-context-builder.ts     # Prepara los datos para la IA
├── ai-prompt-builder.ts      # Construye el prompt
├── ai-proposal-validator.ts  # Valida los cambios propuestos
├── ai-logger.ts              # Logging (silencioso por defecto)
└── providers/
    ├── index.ts              # Factory de proveedores
    ├── claude-provider.ts    # Anthropic Claude
    ├── gemini-provider.ts    # Google Gemini
    └── ollama-provider.ts    # Ollama (local)
```

---

## Flujo Completo

```
┌─────────────────────────────────────────────────────────────────────┐
│  GENERADOR (50 intentos)                                            │
│    └── Mejor resultado con N errores                                │
├─────────────────────────────────────────────────────────────────────┤
│  ¿Hay errores Y la IA está activada?                                │
│    NO → Devolver resultado                                          │
│    SÍ → Continuar con IA                                            │
├─────────────────────────────────────────────────────────────────────┤
│  MÓDULO DE IA                                                       │
│    1. buildAIContext()      → Preparar datos para la IA             │
│    2. buildPrompt()         → Construir el prompt                   │
│    3. provider.sendPrompt() → Enviar a Claude/Gemini                │
│    4. Parsear respuesta JSON                                        │
│    5. validateProposalStructure() → Validar formato                 │
│    6. validateAndApplyChanges()   → Validar y aplicar cambios       │
├─────────────────────────────────────────────────────────────────────┤
│  RE-VALIDACIÓN                                                      │
│    1. FinalValidationPhase  → Re-validar todo el horario            │
│    2. Constraints           → Re-validar restricciones              │
│    3. Contar errores finales                                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Proveedores Implementados

| Proveedor | Estado | SDK/Método | Timeout | Uso |
|-----------|--------|------------|---------|-----|
| **Claude** (Anthropic) | Funcional | SDK `@anthropic-ai/sdk` | 30s | Producción |
| **Gemini** (Google) | Funcional | API REST con `fetch` | 30s | Producción |
| **Ollama** (Local) | Funcional | API REST con `fetch` | 3 min | Solo testing |

**Nota sobre Ollama**: Solo disponible en desarrollo (`NODE_ENV !== 'production'`). Los modelos locales no tienen la capacidad suficiente para optimizar horarios de forma efectiva. Útil solo para verificar que la integración funciona.

Para más detalles sobre proveedores, ver `providers/providers.md`.

---

## Configuración

### Variables de Entorno

```env
# Kill-switch global (en .env)
AI_ENABLED=true

# API Keys (según proveedor)
CLAUDE_API_KEY=sk-ant-...
GEMINI_API_KEY=...

# Override de modelo (opcional)
CLAUDE_MODEL=claude-sonnet-4-20250514
GEMINI_MODEL=gemini-2.0-flash

# Configuración Ollama (solo testing)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2:latest
```

### Configuración en Base de Datos

El proveedor se configura en la tabla `scheduling_config`:

```sql
SELECT * FROM scheduling_config WHERE key_name = 'ai_provider';
-- Valores posibles: 'none', 'claude', 'gemini'
```

### Lógica de Activación

```
SI AI_ENABLED = false en .env
   → IA desactivada (kill-switch)

SI AI_ENABLED = true
   SI ai_provider = 'none' en DB
      → IA desactivada
   SI ai_provider = 'claude' o 'gemini'
      → IA activada con ese proveedor
   SI ai_provider = 'ollama'
      → IA activada (solo en desarrollo)
```

---

## Validación de Cambios

Cada cambio propuesto por la IA pasa por **11 validaciones**:

| # | Validación | Descripción |
|---|------------|-------------|
| 1 | Empleado existe | El `employeeId` debe existir |
| 2 | Día existe | El `day` debe estar en el mes |
| 3 | Turno actual coincide | `from` debe ser el turno real en la matriz |
| 4 | Turno no protegido | No puede modificar V, B, IT, E, FO |
| 5 | Turno destino válido | `to` debe ser un código válido |
| 6 | Cobertura mantenida | No puede dejar cobertura por debajo del mínimo |
| 7 | Días consecutivos | No puede crear más de 6 días de trabajo seguidos |
| 8 | Bloques pequeños | No puede crear bloques de trabajo de 1-2 días |
| 9 | Descanso semanal | Debe mantener 2 días libres consecutivos por semana |
| 10 | Noches consecutivas | Si añade N, debe ser adyacente a un bloque existente |
| 11 | 48h post-noche | No puede violar el descanso obligatorio después de noches |

Si un cambio falla cualquier validación, se rechaza y se registra el motivo.

---

## Estructura de Datos

### Propuesta de la IA (`AIProposal`)

```typescript
{
  analysis: string       // Análisis del problema
  changes: AIChange[]    // Cambios propuestos
  confidence: number     // Confianza 0-1
  cannotResolve?: boolean // Si no puede resolver sin romper reglas
  reasoning?: string     // Explicación
}
```

### Cambio Individual (`AIChange`)

```typescript
{
  employeeId: string  // ID del empleado
  day: number         // Día del mes (1-31)
  from: string        // Turno actual
  to: string          // Turno propuesto
  reason: string      // Justificación (mín 5 caracteres)
}
```

### Resultado de Validación (`AIValidationResult`)

```typescript
{
  valid: boolean              // Todos los cambios fueron válidos
  appliedChanges: AIChange[]  // Cambios aplicados
  rejectedChanges: [{         // Cambios rechazados
    change: AIChange
    reason: string
  }]
}
```

---

## Logs en Terminal

La fase de IA genera logs detallados:

```
[AI] ════════════════════════════════════════
[AI] Starting optimization
[AI] Provider: Claude (claude-sonnet-4-20250514)
[AI] Errors to resolve: 3
[AI] ────────────────────────────────────────
[AI] Sending request to Claude...
[AI] Response received (1234ms)
[AI] Analysis: Employee X has scattered nights on days 5, 8, 12
[AI] Proposed 2 changes (confidence: 0.85):
[AI]    1. emp123 día 6: M → N (connect night block)
[AI]    2. emp123 día 7: T → N (complete block)
[AI] ────────────────────────────────────────
[AI] Validating changes...
[AI] Applied 1 changes:
[AI]    ✓ emp123 día 7: T → N
[AI] Rejected 1 changes:
[AI]    ✗ emp123 día 6: Night must be adjacent to existing block
[AI] ────────────────────────────────────────
[AI] Result: 3 errors → 2 errors
[AI] Improved by 1 errors!
[AI] ════════════════════════════════════════
```

---

## Protecciones de Seguridad

### Lo que la IA NO puede hacer:

- Generar horarios desde cero
- Modificar ausencias (V, B, IT, E, FO)
- Dejar cobertura por debajo del mínimo
- Crear más de 6 días de trabajo consecutivos
- Crear bloques de trabajo de 1-2 días
- Eliminar el descanso semanal
- Crear noches aisladas
- Violar el descanso post-noche de 48h

### Límite de confianza

Si la IA responde con `confidence < 0.5` y propone más de 3 cambios, se rechaza toda la propuesta.

---

## Troubleshooting

### "AI optimization unavailable"

1. Verificar `AI_ENABLED=true` en `.env`
2. Verificar que existe la API key del proveedor
3. Reiniciar el servidor si cambiaste `.env`

### "AI request timeout"

- Timeout por proveedor:
  - Claude/Gemini: 30 segundos
  - Ollama: 3 minutos
- El modelo `llama2:latest` responde en ~4 segundos pero con baja calidad
- Para resultados útiles, usa Claude o Gemini

### Muchos cambios rechazados

Es normal. La IA propone cambios y el validador decide cuáles son seguros. Revisar logs para entender qué reglas se están violando.

---

## Extensibilidad

### Añadir nueva validación

En `ai-proposal-validator.ts`:

```typescript
function checkMiNuevaRegla(
  context: GeneratorContext,
  change: AIChange
): { valid: boolean; reason?: string } {
  // Lógica de validación
  return { valid: true }
}
```

Llamarla en `validateSingleChange()`.

### Cambiar modelo

Por variable de entorno:
```env
CLAUDE_MODEL=claude-3-opus-20240229
```

O en código, modificar `PROVIDER_DEFAULTS` en `types.ts`.
