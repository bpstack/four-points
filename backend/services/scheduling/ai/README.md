# AI Integration - Control y Configuracion

## Como activar/desactivar la IA

### Metodo principal: Frontend (recomendado)

1. Ir a: `http://localhost:3000/dashboard/scheduling/config?tab=general`
2. En la seccion "Proveedor IA", seleccionar:
   - **Claude (Anthropic)** - Activa la IA con Claude
   - **OpenAI** - Activa la IA con OpenAI
   - **Ollama (Local)** - Activa la IA con Ollama local
   - **Desactivado** - Desactiva la IA
3. Clic en "Guardar cambios"

El cambio se guarda en la base de datos (`scheduling_config` tabla, key `ai_provider`).

### Metodo emergencia: .env

Si necesitas desactivar la IA urgentemente (API caida, errores, etc):

```env
# backend/.env
AI_ENABLED=false   # Desactiva IA ignorando la DB
```

**Nota:** Requiere reiniciar el servidor.

## Como verificar que el cambio se aplico

### En los logs del servidor

Cuando generas un horario, veras:

```
[Schedule] AI config: provider="claude", env_enabled=true
[Schedule] Running AI optimization on best result...
```

O si esta desactivado:

```
[Schedule] AI config: provider="none", env_enabled=true
[Schedule] AI disabled via DB (ai_provider=none)
```

### En la base de datos

```sql
SELECT * FROM scheduling_config WHERE key_name = 'ai_provider';
-- Resultado: value = 'claude' | 'none' | 'openai' | 'ollama'
```

## Logica de decision

```
SI .env AI_ENABLED = false
    → IA desactivada (emergencia)

SI .env AI_ENABLED = true
    SI DB ai_provider = 'none'
        → IA desactivada
    SI DB ai_provider = 'claude' | 'openai' | 'ollama'
        → IA activada con ese proveedor
```

## Archivos relacionados

| Archivo | Descripcion |
|---------|-------------|
| `backend/.env` | Variable AI_ENABLED (kill switch) |
| `backend/services/scheduling/schedule-generator-v2.ts` | Lee config y ejecuta IA |
| `backend/services/scheduling/phases/ai-optimization.phase.ts` | Fase de optimizacion IA |
| `backend/services/scheduling/ai/ai-client.ts` | Cliente que llama a Claude/OpenAI |
| `frontend/.../SchedulingConfigClient.tsx` | UI para cambiar proveedor |

## Valores validos para ai_provider

| Valor | Descripcion |
|-------|-------------|
| `none` | IA desactivada |
| `claude` | Claude de Anthropic (recomendado) |
| `openai` | GPT de OpenAI |
| `ollama` | Modelo local con Ollama |

## Troubleshooting

### "No veo logs de IA"

1. Verifica que `.env` tenga `AI_ENABLED=true`
2. Verifica en DB: `SELECT value FROM scheduling_config WHERE key_name = 'ai_provider'`
3. Reinicia el servidor si cambiaste `.env`

### "IA no hace cambios"

La IA puede rechazar cambios si rompen restricciones (ej: dejar cobertura en 0).
Revisa los logs:
```
[AI] Rejected 5 changes:
[AI]    Would leave only 0 morning staff (min: 1)
```

### "Error de API key"

Verifica en `.env`:
```env
ANTHROPIC_API_KEY=sk-ant-...  # Para Claude
OPENAI_API_KEY=sk-...         # Para OpenAI
```
