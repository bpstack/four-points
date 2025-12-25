# Proveedores de IA

## Estado Actual

| Proveedor              | Estado          | Archivo              | Uso recomendado |
| ---------------------- | --------------- | -------------------- | --------------- |
| **Claude** (Anthropic) | Funcional       | `claude-provider.ts` | Producción      |
| **Gemini** (Google)    | Funcional       | `gemini-provider.ts` | Producción      |
| **Ollama** (Local)     | Funcional       | `ollama-provider.ts` | Solo testing    |
| OpenAI                 | No implementado | -                    | -               |

---

## Logs de Inicio del Servidor

Al iniciar el backend (`pnpm run dev:aiven`), verás estos logs:

### Con Claude activo

```
🤖 AI Integration: ✅ enabled
   ⚡ Active: CLAUDE
   📦 Claude: ✅ claude-sonnet-4-20250514
   📦 Gemini: ✅ gemini-2.0-flash
   📦 Ollama: ✅ llama2:latest @ http://localhost:11434
```

### Con Ollama activo (sin keys de cloud)

```
🤖 AI Integration: ✅ enabled
   ⚡ Active: OLLAMA
   📦 Claude: ❌ no key
   📦 Gemini: ❌ no key
   📦 Ollama: ✅ llama2:latest @ http://localhost:11434
```

### Con AI deshabilitado

```
🤖 AI Integration: ❌ disabled
   ⚡ Active: NONE
   📦 Claude: ✅ claude-sonnet-4-20250514
   📦 Gemini: ❌ no key
   📦 Ollama: ✅ llama2:latest @ http://localhost:11434
```

### Leyenda

| Línea | Significado |
|-------|-------------|
| `AI Integration` | Si `AI_ENABLED=true` en `.env` |
| `⚡ Active` | Proveedor activo en DB (`scheduling_config.ai_provider`) |
| `📦 Provider` | Si tiene API key configurada (o disponible para Ollama) |

> **Nota:** El proveedor **activo** se configura en la base de datos, no en `.env`. Usa el frontend (Configuración > IA) o SQL directo para cambiarlo.

---

## Claude (Anthropic)

### Configuración

| Parámetro   | Valor por defecto          | Variable de entorno |
| ----------- | -------------------------- | ------------------- |
| Modelo      | `claude-sonnet-4-20250514` | `CLAUDE_MODEL`      |
| Temperature | `0.1`                      | -                   |
| Max tokens  | `2000`                     | -                   |
| Timeout     | `30000ms`                  | -                   |
| Reintentos  | `3`                        | -                   |

### API Key

```env
CLAUDE_API_KEY=sk-ant-api03-...
```

Obtener en: https://console.anthropic.com/

### SDK

Usa el SDK oficial `@anthropic-ai/sdk`:

```typescript
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey })
const response = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 2000,
  temperature: 0.1,
  messages: [{ role: 'user', content: prompt }],
})
```

### Modelos Disponibles

| Modelo                     | Velocidad  | Calidad  | Costo |
| -------------------------- | ---------- | -------- | ----- |
| `claude-sonnet-4-20250514` | Rápido     | Alta     | Medio |
| `claude-3-opus-20240229`   | Lento      | Muy alta | Alto  |
| `claude-3-haiku-20240307`  | Muy rápido | Media    | Bajo  |

---

## Gemini (Google)

### Configuración

| Parámetro   | Valor por defecto  | Variable de entorno |
| ----------- | ------------------ | ------------------- |
| Modelo      | `gemini-2.0-flash` | `GEMINI_MODEL`      |
| Temperature | `0.1`              | -                   |
| Max tokens  | `2000`             | -                   |
| Timeout     | `30000ms`          | -                   |
| Reintentos  | `3`                | -                   |

### API Key

```env
GEMINI_API_KEY=AIza...
```

Obtener en: https://aistudio.google.com/apikey

### Implementación

Usa la API REST directamente con `fetch`:

```typescript
const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

const response = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 2000,
      topP: 0.95,
      topK: 40,
    },
  }),
})
```

### Modelos Disponibles

| Modelo             | Velocidad  | Calidad | Costo |
| ------------------ | ---------- | ------- | ----- |
| `gemini-2.0-flash` | Muy rápido | Alta    | Bajo  |
| `gemini-1.5-pro`   | Medio      | Alta    | Medio |
| `gemini-1.5-flash` | Rápido     | Media   | Bajo  |

---

## Ollama (Local) - Solo Testing

> ⚠️ **Nota importante**: Ollama está diseñado solo para **testing y desarrollo**. Los modelos locales no tienen la capacidad suficiente para optimizar horarios de forma efectiva. Para uso real, usa Claude o Gemini.

### Requisitos

- Ollama instalado en Windows (nativo) o Docker
- Tu PC encendido (es local)
- El modelo descargado (`ollama pull llama2:latest`)

### Configuración

| Parámetro   | Valor por defecto        | Variable de entorno |
| ----------- | ------------------------ | ------------------- |
| Modelo      | `llama2:latest`          | `OLLAMA_MODEL`      |
| Base URL    | `http://localhost:11434` | `OLLAMA_BASE_URL`   |
| Temperature | `0.1`                    | -                   |
| Max tokens  | `2000`                   | -                   |
| Timeout     | `180000ms` (3 min)       | -                   |
| Reintentos  | `2`                      | -                   |

### Variables de Entorno

```env
# URL de Ollama (puerto por defecto 11434)
OLLAMA_BASE_URL=http://localhost:11434

# Override del modelo (opcional)
OLLAMA_MODEL=llama2:latest
```

### Implementación

Usa la API REST de Ollama:

```typescript
const url = `${baseUrl}/api/generate`

const response = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'llama2:latest',
    prompt: prompt,
    stream: false,
    options: {
      temperature: 0.1,
      num_predict: 2000,
    },
  }),
})
```

### Modelos Probados

| Modelo           | RAM Necesaria | Velocidad | Calidad para Scheduling |
| ---------------- | ------------- | --------- | ----------------------- |
| `llama2:latest`  | ~8GB          | Rápido (~4s) | ❌ Baja (no entiende bien el prompt) |
| `deepseek-r1:8b` | ~8GB          | Muy lento (2+ min) | ⚠️ Media (timeout frecuente) |
| `gemma3:12b`     | ~12GB         | Lento     | ⚠️ Media |

### Resultado de pruebas

Con `llama2:latest`:
- **Tiempo de respuesta**: ~4 segundos ✅
- **Calidad de respuesta**: Baja ❌
- El modelo no interpreta correctamente los IDs de empleados
- Usa placeholders literales en vez de datos reales

**Conclusión**: Ollama funciona para verificar que la integración está correcta, pero no produce resultados útiles para optimización real.

### Ventajas

- **Gratis**: Sin costos de API
- **Privado**: Los datos no salen de tu máquina
- **Sin límites**: No hay rate limits

### Limitaciones

- Solo funciona con el PC encendido
- Más lento que APIs cloud (depende de tu hardware)
- **No funciona en producción** (solo desarrollo local)

### Verificar que Funciona

```bash
# Ver modelos instalados
ollama list

# Verificar que Ollama responde
curl http://localhost:11434/api/tags

# Probar el modelo
curl http://localhost:11434/api/generate -d '{
  "model": "llama2:latest",
  "prompt": "Hello",
  "stream": false
}'
```

### Troubleshooting

**Error "model not found"**: El modelo no está descargado. Ejecuta:
```bash
ollama pull llama2:latest
```

**Error "connection refused"**: Ollama no está corriendo. Verifica que el servicio esté activo.

**Conflicto con WSL/Docker**: Si tienes WSL o Docker usando el puerto 11434, pueden interferir. Usa `netstat -ano | findstr :11434` para ver qué proceso usa el puerto.

---

## OpenAI (No Implementado)

Configuración preparada pero sin implementación:

```typescript
// En providers/index.ts
case 'openai':
  console.warn('[AI] OpenAI provider not yet implemented')
  return null
```

### Configuración Prevista

| Parámetro | Valor            |
| --------- | ---------------- |
| Modelo    | `gpt-4o-mini`    |
| API Key   | `OPENAI_API_KEY` |

---

## Logs en Terminal

### Inicio de Optimización

```
[AI] ════════════════════════════════════════
[AI] 🤖 Starting optimization
[AI] 🔌 Provider: Ollama (llama2:latest)
[AI] 📊 Errors to resolve: 3
[AI] ────────────────────────────────────────
```

### Envío y Respuesta

```
[AI] 📤 Sending request to Ollama...
[AI] 📥 Response received (45230ms)
```

### Análisis de la IA

```
[AI] 💭 Analysis: Employee X has scattered nights on days 5, 8, 12
[AI] 📝 Proposed 2 changes (confidence: 0.85):
[AI]    1. emp123 día 6: M → N (connect night block)
[AI]    2. emp123 día 7: T → N (complete block)
```

### Validación de Cambios

```
[AI] ────────────────────────────────────────
[AI] 🔍 Validating changes...
[AI] ✅ Applied 1 changes:
[AI]    ✓ emp123 día 7: T → N
[AI] ❌ Rejected 1 changes:
[AI]    ✗ emp123 día 6: Night must be adjacent to existing block
```

### Resultado Final

```
[AI] ────────────────────────────────────────
[AI] 📈 Result: 3 errors → 2 errors
[AI] 🎉 Improved by 1 errors!
[AI] ════════════════════════════════════════
```

### Errores Comunes

```
[AI] ❌ Error: Ollama not reachable at http://localhost:11434. Is Docker/Ollama running?
```

```
[AI] ❌ Error: Ollama request timeout after 120000ms
```

---

## Timeouts de Generación

El timeout total de generación depende del proveedor:

| Proveedor | Timeout de Generación |
| --------- | --------------------- |
| Claude    | 30 segundos           |
| Gemini    | 30 segundos           |
| Ollama    | **3 minutos**         |

Ollama tiene más tiempo porque los modelos locales son más lentos que las APIs cloud.

---

## Comparativa de Proveedores

| Aspecto            | Claude   | Gemini           | Ollama                    |
| ------------------ | -------- | ---------------- | ------------------------- |
| **Costo**          | Pago     | Pago (free tier) | Gratis                    |
| **Velocidad**      | ~10-30s  | ~5-15s           | ~4s (llama2)              |
| **Privacidad**     | Cloud    | Cloud            | Local (100% privado)      |
| **Disponibilidad** | 24/7     | 24/7             | Solo con PC encendido     |
| **Calidad**        | Muy alta | Alta             | Baja (no entiende el prompt) |
| **Rate limits**    | Sí       | Sí               | No                        |
| **Producción**     | ✅ Sí    | ✅ Sí            | ❌ Solo testing           |

### Recomendaciones

- **Testing/desarrollo**: Ollama (gratis, rápido, verifica integración)
- **Producción pequeña**: Gemini (free tier generoso)
- **Producción seria**: Claude (mejor calidad)

---

## Uso en Producción

### Proveedores válidos en producción

Solo **Claude** y **Gemini** funcionan en producción (servidores cloud).

**Ollama NO funciona en producción** porque:
- Requiere que Ollama esté corriendo en la misma máquina
- Conecta a `localhost:11434`
- Los servidores cloud (Vercel, Railway, etc.) no tienen Ollama disponible

### Protecciones implementadas

1. **Backend**: Si intentas seleccionar Ollama con `NODE_ENV=production`, devuelve error 400:
   ```
   "Ollama solo funciona en desarrollo local. En producción usa Claude o Gemini."
   ```

2. **Frontend**: La opción "Ollama (Local)" se oculta automáticamente cuando el servidor está en producción.

3. **Validación de API keys**: Al seleccionar Claude o Gemini, el backend verifica que la API key correspondiente esté configurada.

---

## Auto-detección de Proveedor

Si no se especifica proveedor en la configuración, el sistema detecta automáticamente:

```typescript
// En ai-client.ts
private getDefaultProviderType(): AIProviderType {
  if (process.env.CLAUDE_API_KEY) return 'claude'
  if (process.env.GEMINI_API_KEY) return 'gemini'
  if (process.env.OPENAI_API_KEY) return 'openai'  // No funcional
  return 'none'
}
```

---

## Crear un Nuevo Proveedor

1. Crear archivo `mi-provider.ts` en esta carpeta:

```typescript
import type { IAIProvider, AIProviderConfig } from '../types.js'

export class MiProvider implements IAIProvider {
  readonly name = 'MiProveedor'
  private config: AIProviderConfig

  constructor(config: AIProviderConfig) {
    this.config = config
  }

  isAvailable(): boolean {
    return !!process.env.MI_API_KEY
  }

  async sendPrompt(prompt: string): Promise<string> {
    // Implementar llamada a la API
    // Debe devolver el texto de respuesta
  }
}
```

2. Registrar en `index.ts`:

```typescript
import { MiProvider } from './mi-provider.js'

case 'mi-proveedor':
  return new MiProvider(config)
```

3. Añadir configuración por defecto en `types.ts`:

```typescript
export const PROVIDER_DEFAULTS = {
  // ...
  'mi-proveedor': {
    provider: 'mi-proveedor',
    model: 'mi-modelo',
    temperature: 0.1,
    maxTokens: 2000,
    timeout: 30000,
    maxRetries: 3,
  },
}
```
