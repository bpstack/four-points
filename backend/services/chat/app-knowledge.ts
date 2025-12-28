// services/chat/app-knowledge.ts
// Base de conocimiento de la aplicación para el asistente de IA

export const APP_KNOWLEDGE = `
# Four Points PMS - Documentación Completa

## Descripción General
Four Points PMS es un sistema de gestión hotelera (Property Management System) completo, diseñado para hoteles pequeños y medianos. La aplicación permite gestionar todas las operaciones diarias del hotel desde una única plataforma web.

**Stack tecnológico:**
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript
- **Base de datos:** MySQL (Aiven en producción, local en desarrollo)
- **Autenticación:** JWT con refresh tokens y cookies HttpOnly
- **IA:** Claude (Anthropic), Gemini (Google), Ollama (local)

---

## MÓDULOS Y FUNCIONALIDADES

### 1. DASHBOARD (Página Principal)
**Ruta:** /dashboard

El dashboard muestra:
- Actividad reciente de todos los módulos
- Estadísticas rápidas del hotel
- Accesos directos a secciones frecuentes

---

### 2. LOGBOOK (Bitácora)
**Ruta:** /dashboard/logbooks

Sistema de comunicación interna entre turnos.

**Funcionalidades:**
- Crear/editar entradas con título y descripción
- Marcar como leída/no leída
- Comentarios en entradas
- Resolver/Reabrir incidencias
- Filtrar por departamento
- Historial de cambios

**Departamentos:** Recepción, Housekeeping, Mantenimiento, Restaurante, Administración, General

**Cómo usar:**
1. Ir a Logbook → Nueva entrada
2. Seleccionar departamento
3. Escribir título y descripción
4. Guardar

---

### 3. PARKING (Estacionamiento)
**Ruta:** /dashboard/parking

**Funcionalidades:**
- Reservas de plazas
- Check-in/Check-out de vehículos
- Tarifas configurables
- Facturación automática
- Estadísticas de ocupación

---

### 4. MAINTENANCE (Mantenimiento)
**Ruta:** /dashboard/maintenance

Sistema de tickets para problemas técnicos.

**Estados:** Pendiente → En progreso → Resuelto → Cerrado
**Prioridades:** Baja, Media, Alta, Urgente

---

### 5. GROUPS (Grupos)
**Ruta:** /dashboard/groups

Gestión de reservas grupales.

**Estados:** Tentativo → Confirmado → En casa → Check-out → Cancelado

**Funcionalidades:**
- Contactos del grupo
- Rooming list (asignación de habitaciones)
- Pagos y balance
- Historial de comunicaciones

---

### 6. BLACKLIST (Lista Negra)
**Ruta:** /dashboard/blacklist

Registro de personas no gratas con fotos e historial.

---

### 7. CASHIER (Caja)
**Rutas:**
- /dashboard/cashier/hotel - Caja diaria
- /dashboard/cashier/reports - Reportes
- /dashboard/cashier/logs - Histórico

**Funcionalidades:**
- Abrir/cerrar caja
- Registrar movimientos
- Arqueo y cuadre
- Reportes por período

---

### 8. SCHEDULING (Horarios) - MÓDULO TÉCNICO DETALLADO
**Ruta:** /dashboard/scheduling (solo admin)

Sistema de generación automática de horarios del personal.

---

## ARQUITECTURA TÉCNICA DEL SCHEDULING

### Estructura de Archivos
\`\`\`
backend/services/scheduling/
├── schedule-generator-v2.ts    # Generador principal
├── phases/                      # Fases de generación
│   ├── initialize-matrix.phase.ts
│   ├── apply-constraints.phase.ts
│   ├── apply-employee-rules.phase.ts
│   ├── assign-night-blocks.phase.ts
│   ├── enforce-post-night-rest.phase.ts
│   ├── assign-rotating-shifts.phase.ts
│   ├── assign-weekly-offs.phase.ts
│   ├── validate-fix-coverage.phase.ts
│   ├── assign-pi-support.phase.ts
│   ├── repair-small-blocks.phase.ts
│   ├── final-validation.phase.ts
│   └── ai-optimization.phase.ts
├── constraints/                 # Validadores de reglas
├── scoring/                     # Sistema de puntuación
└── ai/                          # Integración con IA
    ├── providers/               # Claude, Gemini, Ollama
    ├── ai-client.ts
    ├── ai-context-builder.ts
    ├── ai-prompt-builder.ts
    └── ai-proposal-validator.ts
\`\`\`

### Flujo de Generación de Horarios

El generador funciona en 3 pasos:

**PASO 1: Loop de 50 intentos**
\`\`\`
Para cada intento (máximo 50):
  1. Crear contexto limpio
  2. Ejecutar fases 10 → 90 en orden
  3. Contar errores
  4. Si hay 0 errores → terminar
  5. Si es el mejor resultado → guardarlo
\`\`\`

**PASO 2: Optimización con IA (opcional)**
\`\`\`
Si hay errores Y la IA está activada:
  1. Construir contexto para la IA
  2. Enviar a Claude/Gemini
  3. Validar cada cambio propuesto (11 validaciones)
  4. Aplicar solo cambios válidos
\`\`\`

**PASO 3: Re-validación final**
\`\`\`
  1. Ejecutar FinalValidationPhase
  2. Ejecutar constraints
  3. Contar errores finales
\`\`\`

### Orden de Fases

| Orden | Fase | Función |
|-------|------|---------|
| 10 | InitializeMatrix | Crear matriz vacía |
| 20 | ApplyConstraints | Aplicar vacaciones, bajas, festivos |
| 30 | ApplyEmployeeRules | Reglas individuales por empleado |
| 40 | AssignNightBlocks | Asignar bloques de noches consecutivas |
| 45 | EnforcePostNightRest | Forzar descanso 48h post-noche |
| 50 | AssignRotatingShifts | Asignar turnos M/T |
| 60 | AssignWeeklyOffs | Garantizar 2 días libres/semana |
| 70 | ValidateFixCoverage | Corregir cobertura mínima/máxima |
| 80 | AssignPISupport | Asignar refuerzos PI |
| 85 | RepairSmallBlocks | Eliminar bloques <3 días |
| 90 | FinalValidation | Generar lista de errores |
| 95 | AIOptimization | Optimización con IA |

### Códigos de Turno

| Código | Nombre | Modificable |
|--------|--------|-------------|
| M | Mañana (7:00-15:00) | Sí |
| T | Tarde (15:00-23:00) | Sí |
| N | Noche (23:00-7:00) | Sí |
| L | Libre | Sí |
| P | Presencia | Sí |
| PI | Presencia Intervención | Sí |
| V | Vacaciones | **No** |
| B | Festivo | **No** |
| IT | Incapacidad Temporal | **No** |
| E | Enfermedad | **No** |
| FO | Formación | **No** |

### Reglas del Algoritmo

**Reglas de noches:**
- Deben ser consecutivas (bloques de 4-6 noches)
- Solo 1 persona por noche
- Descanso obligatorio de 48h después del último turno de noche

**Reglas generales:**
- Máximo 6 días consecutivos de trabajo
- Mínimo 3 días en cada bloque de trabajo
- 2 días libres consecutivos por semana (descanso semanal)
- 8-12 días libres al mes

**Cobertura mínima:**
- Mañanas: mínimo 1 persona (configurable)
- Tardes: mínimo 1 persona (configurable)
- Noches: exactamente 1 persona

### Sistema de IA

La IA es un **optimizador de último recurso**. NO genera horarios desde cero, solo propone cambios puntuales sobre un horario ya generado.

**Proveedores soportados:**
- Claude (Anthropic) - Producción
- Gemini (Google) - Producción
- Ollama (Local) - Solo testing/desarrollo

**Configuración:**
- \`AI_ENABLED=true\` en .env activa la IA globalmente
- \`ai_provider\` en tabla \`scheduling_config\` define el proveedor

**11 Validaciones de cambios de IA:**
1. Empleado existe
2. Día existe
3. Turno actual coincide
4. Turno no es protegido (V, B, IT, E, FO)
5. Turno destino es válido
6. Cobertura se mantiene
7. Max 6 días consecutivos
8. Bloques mínimos de 3 días
9. Descanso semanal (2 días)
10. Noches consecutivas
11. Descanso 48h post-noche

### Sistema de Scoring

El scoring evalúa qué empleado es mejor para cada asignación:

**Factores:**
- **Fatigue Score:** Penaliza empleados con muchos días consecutivos
- **Balance Score:** Favorece distribución equitativa
- **Preference Score:** Respeta preferencias del empleado
- **Coverage Score:** Prioriza cubrir cobertura crítica
- **Block Score:** Evita bloques de trabajo pequeños

Cada factor tiene un peso configurable en \`scheduling_config\`.

---

## SISTEMA DE AUTENTICACIÓN

**Flujo:**
1. Login → Backend genera access_token (15 min) + refresh_token (7 días)
2. Tokens se guardan en cookies HttpOnly
3. En cada request, el frontend envía cookies automáticamente
4. Si access_token expira → auto-refresh con refresh_token
5. Si refresh_token expira → redirect a login

**Roles:**
- admin: Acceso completo
- demo-admin: Solo lectura (para demos)
- user: Acceso operativo

---

## CONFIGURACIÓN DE IA PARA CHAT

Este chat de ayuda usa el mismo proveedor de IA configurado para Scheduling:

1. Ve a /dashboard/scheduling/config
2. Pestaña "General"
3. Selecciona el proveedor (Claude, Gemini, Groq, etc.)
4. Asegúrate de que AI_ENABLED=true en el servidor

**Proveedores recomendados para chat:**
- **Groq**: Gratuito, muy rápido, alto límite de tokens (4096), respuestas precisas en español
- **Claude**: Alta calidad, requiere API key de pago
- **Gemini**: Buena calidad, requiere API key de Google

---

## SOLUCIÓN DE PROBLEMAS

### Horarios con muchos errores
- Verifica que hay suficientes empleados disponibles
- Revisa reglas individuales conflictivas
- Intenta regenerar (el algoritmo tiene componente aleatorio)
- Si persiste, la IA intentará optimizar

### La IA no funciona
1. Verifica AI_ENABLED=true en .env del backend
2. Verifica que hay una API key configurada según el proveedor:
   - Groq: GROQ_API_KEY (recomendado, gratuito)
   - Claude: CLAUDE_API_KEY
   - Gemini: GEMINI_API_KEY
3. Verifica que ai_provider no es 'none' en la configuración

### Errores de cobertura
- El sistema necesita mínimo X personas para cada turno
- Si hay muchas vacaciones/bajas, puede ser imposible cumplir
- Considera añadir empleados o ajustar los mínimos

---

## TIPS PARA DESARROLLADORES

### Añadir nueva fase al generador:
1. Crear archivo en \`phases/\` extendiendo BasePhase
2. Definir \`order\` (usar múltiplos de 5 para espacio)
3. Registrar en \`createDefaultPhaseRegistry()\`

### Añadir nuevo proveedor de IA:
1. Crear clase en \`ai/providers/\` implementando IAIProvider
2. Añadir al switch en \`createProvider()\`
3. Añadir configuración en \`PROVIDER_DEFAULTS\`

### Añadir validación de cambios de IA:
1. Crear función \`checkMiRegla()\` en \`ai-proposal-validator.ts\`
2. Llamarla en \`validateSingleChange()\`
`

export const FREQUENT_QUESTIONS = [
  {
    category: 'General',
    questions: [
      '¿Qué módulos tiene la aplicación?',
      '¿Cómo cambio el tema a oscuro?',
      '¿Qué roles de usuario existen?',
    ],
  },
  {
    category: 'Logbook',
    questions: [
      '¿Cómo creo una entrada en el logbook?',
      '¿Cómo filtro por departamento?',
      '¿Cómo marco una entrada como resuelta?',
    ],
  },
  {
    category: 'Parking',
    questions: [
      '¿Cómo registro un vehículo?',
      '¿Cómo hago check-out?',
      '¿Dónde veo las estadísticas?',
    ],
  },
  {
    category: 'Groups',
    questions: [
      '¿Cómo creo un grupo nuevo?',
      '¿Qué estados tiene un grupo?',
      '¿Cómo registro un pago?',
    ],
  },
  {
    category: 'Scheduling (Técnico)',
    questions: [
      '¿Cómo funciona el generador de horarios?',
      '¿Qué fases tiene el algoritmo?',
      '¿Cómo funciona la IA en los horarios?',
      '¿Qué validaciones hace la IA?',
      '¿Cómo funciona el sistema de scoring?',
      '¿Qué reglas tiene el algoritmo de noches?',
    ],
  },
  {
    category: 'Configuración IA',
    questions: [
      '¿Cómo activo la IA?',
      '¿Qué proveedores de IA soporta?',
      '¿Por qué la IA rechaza cambios?',
    ],
  },
  {
    category: 'Desarrollo',
    questions: [
      '¿Cómo añado una nueva fase al generador?',
      '¿Cómo funciona la autenticación?',
      '¿Cómo añado un nuevo proveedor de IA?',
    ],
  },
]
