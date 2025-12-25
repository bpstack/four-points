# IA - Guía Rápida

## Activar/Desactivar la IA

### Desde el Frontend (recomendado)

1. Ir a: `http://localhost:3000/dashboard/scheduling/config?tab=general`
2. En "Proveedor IA", seleccionar:
   - **Claude** - Usa Claude de Anthropic
   - **Gemini** - Usa Gemini de Google
   - **Ollama** - Usa modelo local (solo desarrollo)
   - **Desactivado** - Sin IA
3. Guardar cambios

El cambio se guarda en la base de datos (`scheduling_config`, key `ai_provider`).

### Desde .env (emergencia)

Si necesitas desactivar la IA rápidamente:

```env
# backend/.env
AI_ENABLED=false
```

Requiere reiniciar el servidor.

---

## Verificar que Funciona

### En los logs del servidor

Cuando generas un horario, verás:

```
[Schedule] AI config: provider="claude", env_enabled=true
[Schedule] Running AI optimization on best result...
```

Si está desactivada:

```
[Schedule] AI config: provider="none", env_enabled=true
[Schedule] AI disabled via DB (ai_provider=none)
```

### En la base de datos

```sql
SELECT * FROM scheduling_config WHERE key_name = 'ai_provider';
-- Resultado: value = 'claude' | 'gemini' | 'none'
```

---

## Lógica de Activación

```
¿AI_ENABLED = false en .env?
   SÍ → IA desactivada (kill-switch)
   NO → Continuar

¿ai_provider = 'none' en DB?
   SÍ → IA desactivada
   NO → IA activada con el proveedor configurado
```

---

## Proveedores Disponibles

| Proveedor | Estado | API Key | Uso recomendado |
|-----------|--------|---------|-----------------|
| Claude | Funcional | `CLAUDE_API_KEY` | Producción |
| Gemini | Funcional | `GEMINI_API_KEY` | Producción |
| Ollama | Funcional | No requiere | Solo testing |

**Nota sobre Ollama**: Ollama está diseñado solo para **testing**. Los modelos locales (como `llama2:latest`) no tienen la capacidad suficiente para optimizar horarios de forma efectiva. Para uso real, usa Claude o Gemini.

- Bloqueado en producción (`NODE_ENV=production`)
- Responde rápido (~4s) pero con baja calidad
- Útil para verificar que la integración funciona

Para más detalles sobre configuración de proveedores, ver `providers/providers.md`.

---

## Variables de Entorno

```env
# Activar IA (kill-switch global)
AI_ENABLED=true

# API Key según proveedor (no requerido para Ollama)
CLAUDE_API_KEY=sk-ant-...
GEMINI_API_KEY=...

# Override de modelo (opcional)
CLAUDE_MODEL=claude-sonnet-4-20250514
GEMINI_MODEL=gemini-2.0-flash

# Configuración Ollama (opcional - solo testing)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2:latest
```

---

## Troubleshooting

### No aparecen logs de IA

1. Verificar `AI_ENABLED=true` en `.env`
2. Verificar proveedor en DB: `SELECT value FROM scheduling_config WHERE key_name = 'ai_provider'`
3. Reiniciar servidor si cambiaste `.env`

### La IA no hace cambios

La IA puede rechazar cambios si rompen restricciones. Revisar logs:

```
[AI] Rejected 2 changes:
[AI]    ✗ emp123 día 15: Would leave only 0 morning staff
```

### Error de API key

Verificar en `.env`:
```env
CLAUDE_API_KEY=sk-ant-...   # Para Claude
GEMINI_API_KEY=...          # Para Gemini
# Ollama no requiere API key
```

### Ollama no responde

1. Verificar que Ollama está corriendo: `ollama list`
2. Verificar que el modelo existe: `ollama pull llama2:latest`
3. Verificar el puerto (por defecto 11434): `curl http://localhost:11434/api/tags`
4. En Windows, asegurar que no hay conflicto con WSL (wslrelay.exe puede interceptar el puerto)

### Timeout con Ollama

Ollama usa un timeout de 3 minutos. El modelo `llama2:latest` responde en ~4 segundos, pero la calidad de respuesta es baja. Para resultados útiles, usa Claude o Gemini.

---

## Archivos Relacionados

| Archivo | Función |
|---------|---------|
| `backend/.env` | Variables AI_ENABLED y API keys |
| `ai/ai-client.ts` | Cliente que coordina la IA |
| `ai/providers/` | Implementaciones de proveedores |
| `phases/ai-optimization.phase.ts` | Fase 95 del generador |
