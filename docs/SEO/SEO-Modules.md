# SEO - Módulos Four-Points PMS

Este documento define la estrategia SEO de cada página del sitio HotelCode (`hotelcode.stackbp.es`),
con keywords realistas, intención de búsqueda clasificada y estructura de contenido optimizada
para posicionamiento en Google España (mercado hotelero B2B).

## Identidad de marca y URLs

| Entidad | URL | Rol |
|---------|-----|-----|
| **HotelCode** | `hotelcode.stackbp.es` | El producto. Marca principal. Sitio de marketing y ventas |
| **Four-Points** | `four-points.stackbp.es` | El hotel demo. Instancia real donde el software está desplegado |

**Encuadre estratégico:**
> *HotelCode es el software. Four-Points es el hotel que lo usa como referencia.*

Four-Points no es un segundo producto ni compite con HotelCode en branded search.
Es la prueba social de que el software funciona: un hotel ficticio (o de referencia) donde
el visitante puede explorar el PMS en funcionamiento real.

**Implicaciones SEO:**
- Todo el esfuerzo de posicionamiento va a `hotelcode.stackbp.es`
- `four-points.stackbp.es` no necesita SEO propio — no es un sitio de captación
- En HotelCode, el CTA "Probar demo" debe ir acompañado de contexto:
  _"Accede a la demo en Hotel Four-Points — entorno real, datos de prueba"_
- Si Google indexa `four-points.stackbp.es`, añadir un `<meta name="robots" content="noindex">`
  para evitar que compita con la landing principal o genere confusión de marca

**Cómo comunicarlo en la landing:**
```
"Prueba la demo en vivo en Hotel Four-Points →"
"Ver HotelCode funcionando en un hotel real →"
```

---

## Jerarquía de páginas y keywords

```
/                      → Módulo 0 — Landing hub — keywords genéricas de producto
/modulos               → Overview — keywords medias (qué hace un PMS, funciones hotel)
/modulos/[slug]        → Módulos 1–12 — keywords específicas de cada función
/precios               → keywords de precio/coste software hotelero
/blog/[slug]           → keywords informacionales de cada dominio funcional
```

> **Regla:** Las keywords genéricas y competitivas (software hotelero, PMS, programa para hoteles)
> van **solo** en la página `/`. Cada módulo se posiciona en su función específica.
> Esto evita canibalización interna y competir de frente contra Cloudbeds, Mews u Opera.

---

## Módulo 0: Página Principal — Landing Hub (/)

> Única página donde van las keywords genéricas de producto.
> URL: `hotelcode.stackbp.es/`

**Nombre SEO:** Software de Gestión Hotelera Modular para Hoteles Independientes

**Funcionalidad (mejorada):** Hub de producto que presenta de forma atractiva todos los módulos del software: propuesta de valor, dolores del hotel que resuelve, resumen de funcionalidades, precios y acceso a la demo.

**Problema que resuelve (enfocado a negocio):** Los hoteles independientes no pueden permitirse un PMS caro y rígido. Necesitan un software que cubra su operativa real, sin pagar por módulos que no usan y sin meses de formación.

### SEO

**Intención:** Comercial (evaluación de software, comparación de PMS)

**Keywords principales (genéricas):**
- software de gestión hotelera
- PMS para hoteles
- programa para hoteles
- sistema de gestión hotel
- software hotelero modular

**Keywords de marca (branded):**
- HotelCode
- HotelCode software hotelero
- demo HotelCode
- cómo funciona HotelCode
- HotelCode precio

> Las branded keywords capturan búsquedas de usuarios que ya conocen el producto
> (word of mouth, redes sociales, referencias). Mejoran CTR y confianza en SERP.
> Deben aparecer en title tag, meta description y en al menos un H2 de la home.

**Long-tail de dolor:**
- software PMS para hoteles pequeños sin pagar de más
- programa para gestionar un hotel sin formación complicada
- alternativa sencilla a Opera PMS para hoteles independientes
- software hotelero que reemplaza excel y whatsapp en el día a día
- PMS para hotel boutique sin contrato largo ni coste por módulo que no uso

**Tipo de página:** Landing principal + Demo interactiva

**Estructura SEO:**
```
H1: Software de Gestión Hotelera Modular para Hoteles Independientes
H2: ¿Por qué los hoteles siguen usando Excel, papel y WhatsApp?
H2: Un módulo para cada problema real de tu hotel
H2: Precios claros, sin módulos que no necesitas
H2: Cómo funciona HotelCode — demo en vivo sin registro
H3: Prueba la demo sin pagar ni registrarte
```

**Meta description sugerida:**
> HotelCode es el software de gestión hotelera modular para hoteles independientes. Reemplaza Excel,
> papel y WhatsApp en la operativa diaria. Prueba la demo gratis.

**Contenido de apoyo (blog):**
- "Qué es un PMS hotelero y para qué sirve" → enlaza a home
- "Cómo elegir software de gestión para un hotel independiente"
- "Excel vs software hotelero: cuándo dar el salto"
- "Cómo funciona HotelCode: módulos, demo y precios" → captura branded search

**Enlazado interno:**
- `/modulos` (ver todos los módulos)
- `/precios`
- `/modulos/dashboard` (Panel de Control)
- `/modulos/turnos` (Gestión de Turnos)

---

## Módulo 1: Panel de Control — /modulos/dashboard

> Página de módulo específico. NO usa keywords genéricas de producto.
> URL: `hotelcode.stackbp.es/modulos/dashboard`

**Nombre SEO:** Panel de Control Hotelero en Tiempo Real

**Funcionalidad (mejorada):** Panel central que unifica todos los indicadores clave del hotel: ocupación, caja, parking, incidencias activas y feed de actividad de todos los departamentos. Todo en una sola pantalla, actualizado en tiempo real.

**Problema que resuelve (enfocado a negocio):** El director o jefe de recepción consulta tres o cuatro herramientas distintas para saber qué está pasando ahora mismo en el hotel. Cuando llegan los datos, la situación ya cambió.

### SEO

**Intención:** Comercial

**Keywords principales:**
- panel de control hotelero
- dashboard hotel tiempo real
- KPIs hotel en una sola pantalla
- visión global operaciones hotel
- centro de mandos hotel

**Long-tail de dolor:**
- cómo ver todo lo que pasa en el hotel en una sola pantalla
- director de hotel que no sabe qué está pasando ahora mismo solución
- ocupación parking caja e incidencias hotel en un dashboard
- información dispersa entre sistemas del hotel cómo unificarla
- alertas críticas hotel sin tener que ir módulo por módulo

**Tipo de página:** Landing de módulo

**Estructura SEO:**
```
H1: Panel de Control Hotelero: Toda la Operativa en una Sola Pantalla
H2: KPIs en tiempo real sin consultar varios sistemas
H2: Alertas críticas que llegan solas, no hay que ir a buscarlas
H2: Acciones rápidas desde el panel sin cambiar de pantalla
H3: Ocupación, caja, parking e incidencias de un vistazo
H3: Feed de actividad unificado de todos los departamentos
```

**Contenido de apoyo (blog):**
- "Qué KPIs debe ver un director de hotel cada mañana"
- "Cómo centralizar la información operativa de un hotel"

**Enlazado interno:**
- `/modulos/caja` (Control de Caja)
- `/modulos/parking` (Gestión de Parking)
- `/modulos/mantenimiento` (Mantenimiento)
- `/modulos/turnos` (Gestión de Turnos)

---

## Módulo 2: Libro de Consigna — /modulos/consigna

> El producto usa el término "Libro de Consigna". En el sector se usan varios nombres para el
> mismo concepto — todos son oportunidades de keyword:
> - **Libro de Consigna** (término elegido por el producto)
> - **Libro de Incidencias** (muy frecuente en recepción)
> - **Libro de Partes** (el más extendido en cocina y sala)
> - **Cuaderno de Seguimiento / Libro de Turnos** (operaciones y F&B)
> - **Logbook** (término en inglés, usado en grupos hoteleros internacionales)
>
> Estrategia: posicionar con todos ellos en blog/contenido; usar "Libro de Consigna" como
> nombre de marca del módulo en la página del producto.
>
> URL: `hotelcode.stackbp.es/modulos/consigna`

**Nombre SEO:** Libro de Consigna Digital para Hoteles

**Funcionalidad (mejorada):** Registro digital de anotaciones, incidencias y tareas entre turnos con prioridad, comentarios y seguimiento de qué ha leído cada empleado y qué sigue pendiente de resolver.

**Problema que resuelve (enfocado a negocio):** El cuaderno de consigna físico se pierde, se mancha y nadie lo lee. Las incidencias del turno de noche no llegan al turno de mañana. Los huéspedes lo notan.

### SEO

**Intención:** Comercial + Informacional

**Keywords principales:**
- libro de consigna hotel digital
- libro de incidencias hotel
- parte de turno hotel sin papel
- traspaso de turno hotel digital
- logbook hotelero digital

**Términos alternativos (misma intención, distintos sectores):**
- libro de partes hotel (cocina/sala)
- cuaderno de seguimiento hotel
- libro de turnos recepción
- diario de incidencias hotel

**Long-tail de dolor:**
- cómo no perder información entre turnos en un hotel
- digitalizar el libro de incidencias de recepción de hotel
- recepcionista que no lee los partes del turno anterior solución
- software para que el turno de mañana sepa qué pasó por la noche
- traspaso de turno hotel que queda registrado con quién lo leyó

**Tipo de página:** Landing + Blog de apoyo

**Estructura SEO:**
```
H1: Libro de Novedades Digital para Hoteles
H2: Por qué se pierde información entre turnos (y cómo evitarlo)
H2: Registro centralizado de incidencias y tareas pendientes
H2: Control de lectura: quién ha visto qué y cuándo
H3: Avisos urgentes para el turno entrante
H3: Historial completo de anotaciones sin límite
```

**Contenido de apoyo (blog):**
- "Cómo hacer el traspaso de turno en un hotel sin perder información"
- "Qué debe incluir el libro de novedades de recepción"
- "Problemas comunes en la comunicación entre turnos de hotel"

**Enlazado interno:**
- Panel de control
- Mantenimiento (incidencias relacionadas)
- Comunicación interna
- Alertas y recordatorios

---

## Módulo 3: Gestión de Aparcamiento (Parking)

**Nombre SEO:** Sistema de Control de Aparcamiento para Hoteles

**Funcionalidad (mejorada):** Control completo de plazas físicas: registro de vehículos, reservas con ciclo completo (reserva → llegada → salida), estadísticas de ocupación y analítica de rendimiento.

**Problema que resuelve (enfocado a negocio):** Sin un sistema, las plazas se asignan de memoria o en papel. Resultado: dobles reservas, plazas libres sin aprovechar y cero datos para tomar decisiones sobre el aparcamiento.

### SEO

**Intención:** Comercial

**Keywords principales:**
- control aparcamiento hotel
- gestión plazas parking hotelero
- reservas aparcamiento hotel
- sistema parking hotel
- ocupación aparcamiento hotel en tiempo real

**Long-tail de dolor:**
- cómo gestionar el aparcamiento de un hotel sin excel
- controlar las plazas de parking de un hotel sin errores
- dobles reservas en parking hotel cómo evitarlas
- cuántas plazas parking hotel libres
- registro de entrada y salida de vehículos hotel digital

**Tipo de página:** Landing + Blog

**Estructura SEO:**
```
H1: Control de Aparcamiento para Hoteles sin Papel ni Excel
H2: Reservas y plazas en tiempo real sin dobles asignaciones
H2: Entrada, estancia y salida del vehículo en un solo registro
H2: Datos de ocupación para rentabilizar el parking del hotel
H2: Facturación integrada con el sistema del hotel
H3: Plazas por tipo: estándar, adaptada, bicicletas
H3: Origen de la reserva: directa, Booking, Expedia, Airbnb
```

**Contenido de apoyo (blog):**
- "Cómo rentabilizar el aparcamiento de tu hotel"
- "Errores comunes en la gestión del parking hotelero"

**Enlazado interno:**
- Administración y proveedores (facturación)
- Panel de control
- Gestión de grupos (parking para grupos)

---

## Módulo 4: Planificación de Turnos (Scheduling)

**Nombre SEO:** Cuadrante de Turnos Digital para Hoteles

**Funcionalidad (mejorada):** Cuadrante mensual interactivo con validación automática en tiempo real: detecta incumplimientos de descansos mínimos, vacaciones solapadas, bajas registradas y falta de cobertura por turno. Exportación a PDF.

**Problema que resuelve (enfocado a negocio):** El cuadrante en Excel no detecta errores de convenio, provoca conflictos con el personal y se desactualiza en cuanto hay una baja. Este módulo valida las restricciones mientras el responsable rellena el cuadrante.

### SEO

**Intención:** Comercial

**Keywords principales:**
- cuadrante de turnos hotel digital
- planificación turnos personal hotelero
- hacer cuadrante turnos recepción hotel
- gestión turnos hotel sin excel
- cuadro de turnos mensual hotel

**Long-tail de dolor:**
- cómo hacer el cuadrante de turnos de un hotel sin errores de convenio
- detectar automáticamente incumplimientos de descanso en turnos de hotel
- cuadrante de turnos hotel que avisa cuando falta personal
- gestionar vacaciones y bajas en el cuadrante de un hotel
- exportar cuadrante turnos hotel a PDF para el tablón

**Tipo de página:** Landing + Recurso educativo

**Estructura SEO:**
```
H1: Cuadrante de Turnos Digital para Hoteles
H2: Rellena el cuadrante y que el sistema detecte los errores
H2: Control automático de descansos mínimos entre turnos
H2: Vacaciones, bajas y días libres sin solapamientos
H2: Cobertura mínima garantizada por turno
H3: Exporta el cuadrante a PDF en un clic
H3: Celdas bloqueadas por contrato, baja o restricción aprobada
```

**Contenido de apoyo (blog):**
- "Cómo hacer el cuadrante de turnos de un hotel paso a paso"
- "Errores de convenio más comunes en los turnos de hostelería"
- "Cómo gestionar las vacaciones del personal de un hotel"

**Enlazado interno:**
- Panel de control
- Mantenimiento (disponibilidad de técnicos)
- Comunicación interna

---

## Módulo 5: Mantenimiento

**Nombre SEO:** Control de Averías e Incidencias para Hoteles

**Funcionalidad (mejorada):** Partes de mantenimiento con ciclo completo (notificado → asignado → en curso → en espera → resuelto), registro fotográfico, asignación a técnicos propios o empresas externas y auditoría de cada cambio.

**Problema que resuelve (enfocado a negocio):** Las averías se notifican por teléfono o de palabra y nadie sabe en qué estado están. Las incidencias se pierden, los técnicos no saben qué tienen asignado y dirección no tiene datos para decidir.

### SEO

**Intención:** Comercial

**Keywords principales:**
- control averías hotel
- gestión mantenimiento hotelero sin papel
- partes de mantenimiento hotel digital
- seguimiento incidencias hotel
- asignación técnicos mantenimiento hotel

**Long-tail de dolor:**
- cómo saber en qué estado está una avería del hotel
- habitación con avería que nadie sabe si está resuelta hotel
- gestionar el mantenimiento de un hotel sin perder partes
- avería hotel que lleva días sin resolver cómo controlarlo
- seguimiento incidencias entre recepción y mantenimiento hotel

**Tipo de página:** Landing + Blog

**Estructura SEO:**
```
H1: Control de Averías e Incidencias para Hoteles sin Papel
H2: Del aviso al cierre: ninguna incidencia se pierde por el camino
H2: Asignación a técnicos internos o empresas externas
H2: Fotos adjuntas como evidencia de cada avería
H2: Historial completo de quién hizo qué y cuándo
H3: Prioridad: baja, media, alta y urgente
H3: Estado: notificado, asignado, en curso, en espera, resuelto
```

**Contenido de apoyo (blog):**
- "Cómo gestionar el mantenimiento de un hotel de forma eficiente"
- "Incidencias de mantenimiento en hoteles: los errores más frecuentes"
- "Cómo evitar que una avería en habitación afecte a la experiencia del huésped"

**Enlazado interno:**
- Panel de control
- Libro de novedades (incidencias anotadas en turno)
- Administración y proveedores (empresas externas)

---

## Módulo 6: Control de Caja (Cashier)

**Nombre SEO:** Arqueo de Caja Digital para Hoteles

**Funcionalidad (mejorada):** Ciclo diario de caja en cuatro turnos (noche, mañana, tarde y cierre): conteo de billetes y monedas por denominación, registro de cobros con tarjeta y otros métodos, gestión de vales e informes mensuales consolidados.

**Problema que resuelve (enfocado a negocio):** Los descuadres de caja se detectan tarde, los cierres se hacen en papel o en hojas de cálculo que nadie guarda bien y la dirección no tiene datos reales del movimiento de efectivo del hotel.

### SEO

**Intención:** Comercial

**Keywords principales:**
- arqueo de caja hotel digital
- cierre de caja recepción hotel
- control efectivo hotel sin papel
- cuadre caja hotel por turnos
- gestión caja hotelera

**Long-tail de dolor:**
- cómo detectar descuadres de caja en recepción de hotel
- cerrar la caja del hotel sin errores al final del turno
- control del efectivo en recepción de hotel por turno
- historial de movimientos de caja hotel para auditoría
- cómo saber si hay discrepancias en la caja del hotel

**Tipo de página:** Landing + Blog

**Estructura SEO:**
```
H1: Arqueo de Caja Digital para Hoteles
H2: Cómo evitar descuadres al cerrar la caja de recepción
H2: Cuatro turnos de caja: noche, mañana, tarde y cierre
H2: Conteo de billetes y monedas por denominación
H2: Vales, tarjetas y otros métodos de pago registrados
H2: Informes mensuales de movimientos para dirección
H3: Alertas automáticas de descuadre en el momento del cierre
H3: Auditoría de movimientos por turno y por empleado
```

**Contenido de apoyo (blog):**
- "Cómo hacer el arqueo de caja en un hotel paso a paso"
- "Errores frecuentes en el cierre de caja de recepción"

**Enlazado interno:**
- Panel de control
- Administración y proveedores
- Informes

---

## Módulo 7: Administración y Proveedores (Backoffice)

**Nombre SEO:** Gestión de Facturas y Proveedores para Hoteles

**Funcionalidad (mejorada):** Ciclo completo de facturas de proveedores (pendiente → validada → pagada / rechazada), editor de documentos con sello y firma digital, pago automático en fecha fija y exportación a Excel y PDF.

**Problema que resuelve (enfocado a negocio):** Las facturas de proveedores se acumulan en papel o en el correo, los pagos se retrasan o se olvidan y dirección no tiene visibilidad del gasto real. Este módulo centraliza todo el ciclo administrativo.

### SEO

**Intención:** Comercial

**Keywords principales:**
- gestión facturas proveedores hotel
- control pagos proveedores hotelero
- plataforma administrativa hotel
- validación facturas hotel
- facturas pendientes departamento administración hotel

**Long-tail de dolor:**
- cómo no perder facturas de proveedores del hotel
- controlar los pagos a proveedores de un hotel sin excel
- factura de proveedor que lleva semanas sin pagar hotel
- cuánto gasta el hotel en proveedores este año sin tener que calcularlo
- gestionar las facturas del hotel desde un solo sitio

**Tipo de página:** Landing

**Estructura SEO:**
```
H1: Gestión de Facturas y Proveedores para Hoteles
H2: Ninguna factura pendiente se pierde ni se retrasa
H2: Ciclo completo: recibida, validada, pagada o rechazada
H2: Directorio de proveedores con historial de gasto
H2: Documentos con sello y firma digital incluidos
H2: Pago automático a proveedores en fecha fija
H3: Estado de cada factura en tiempo real
H3: Gasto acumulado por proveedor en el año en curso
```

**Contenido de apoyo (blog):**
- "Cómo organizar las facturas de proveedores de un hotel"
- "Errores frecuentes en la gestión administrativa de hoteles"

**Enlazado interno:**
- Control de caja
- Panel de control
- Informes

---

## Módulo 8: Comunicación Interna (Mensajería)

**Nombre SEO:** Herramienta de Comunicación Interna para Hoteles

**Funcionalidad (mejorada):** Mensajería directa y en grupo entre empleados del hotel, búsqueda en el historial de conversaciones, seguimiento de mensajes no leídos y avisos urgentes con notificación inmediata.

**Problema que resuelve (enfocado a negocio):** El personal usa WhatsApp personal para comunicarse en el trabajo. Esto mezcla lo profesional con lo privado, no deja registro formal y la dirección no puede garantizar que los mensajes importantes lleguen.

### SEO

**Intención:** Informacional + Comercial

**Keywords principales:**
- comunicación interna hotel sin whatsapp
- mensajería empleados hotel
- chat entre departamentos hotel
- avisos urgentes personal hotelero
- canal comunicación equipo hotel

**Long-tail de dolor:**
- cómo comunicar avisos urgentes al personal del hotel sin whatsapp
- alternativa profesional a whatsapp para equipos de hotel
- historial de mensajes entre turnos de hotel para revisar
- el personal del hotel no lee los avisos qué hacer
- comunicar recepción con pisos y mantenimiento sin teléfono

**Tipo de página:** Recurso educativo / Blog

**Estructura SEO:**
```
H1: Comunicación Interna para Hoteles sin WhatsApp
H2: Por qué el WhatsApp personal no funciona en un hotel
H2: Mensajes directos y grupos por departamento
H2: Avisos urgentes con notificación garantizada
H2: Historial de conversaciones con búsqueda
H3: Chats individuales y grupos hasta 10 participantes
H3: Mensajes guardados 90 días
```

**Contenido de apoyo (blog):**
- "Por qué los hoteles no deberían usar WhatsApp para comunicarse internamente"
- "Cómo mejorar la comunicación entre departamentos de un hotel"

**Enlazado interno:**
- Libro de novedades
- Alertas y recordatorios
- Panel de control

---

## Módulo 9: Gestión de Grupos

**Nombre SEO:** Sistema de Seguimiento de Grupos para Hoteles

**Funcionalidad (mejorada):** Seguimiento completo del ciclo de vida de un grupo: contactos, asignación de habitaciones, pagos, estados (presupuesto → contrato → rooming list → balance), panel de indicadores clave y alertas automáticas de vencimientos.

**Problema que resuelve (enfocado a negocio):** Los grupos se gestionan con correos, hojas de cálculo y llamadas telefónicas. Resultado: pagos olvidados, rooming lists desactualizadas y ninguna vista global de todos los grupos activos a la vez.

### SEO

**Intención:** Comercial

**Keywords principales:**
- gestión grupos hotel
- seguimiento reservas grupales hotel
- rooming list hotel digital
- cobros grupos hotel sin olvidar
- control contratos grupos hoteleros

**Long-tail de dolor:**
- cómo no olvidar un pago pendiente de un grupo en el hotel
- gestionar varios grupos de hotel a la vez sin liar
- rooming list de grupo de hotel que se actualiza solo
- grupo de hotel que no ha pagado el depósito cómo controlarlo
- seguimiento de grupos hoteleros sin excel ni correos

**Tipo de página:** Landing

**Estructura SEO:**
```
H1: Seguimiento de Grupos Hoteleros sin Excel ni Correos
H2: Del presupuesto a la salida sin perder el hilo
H2: Contratos, rooming list y balance en un solo lugar
H2: Alertas automáticas cuando vence un pago o llega el grupo
H2: Panel de todos los grupos activos de un vistazo
H3: Histórico de llegadas y salidas
H3: Registro de auditoría de cada cambio
```

**Contenido de apoyo (blog):**
- "Cómo gestionar la llegada de un grupo en un hotel paso a paso"
- "Errores frecuentes en la gestión de grupos hoteleros"
- "Qué es un rooming list y cómo gestionarlo en un hotel"

**Enlazado interno:**
- Gestión de aparcamiento (parking para grupos)
- Alertas y recordatorios
- Administración y proveedores
- Panel de control

---

## Módulo 10: Alertas y Recordatorios (Notificaciones)

**Nombre SEO:** Alertas Automáticas de Vencimientos para Hoteles

**Funcionalidad (mejorada):** Generación automática de recordatorios vinculados a grupos (cobros pendientes, llegadas próximas, contratos sin firmar, balance sin regularizar, rooming list incompleto) con indicador de no leídos en la aplicación.

**Problema que resuelve (enfocado a negocio):** El responsable de grupos tiene que recordar manualmente qué vence, qué grupo llega mañana o qué contrato sigue sin firmar. Un solo despiste puede costar una reclamación o un ingreso perdido.

### SEO

**Intención:** Informacional + Comercial

**Keywords principales:**
- alertas vencimientos hotel automáticas
- recordatorios pagos grupos hotel
- avisos automáticos gestión hotelera
- notificaciones grupos pendientes hotel
- sistema alertas hotel

**Long-tail de dolor:**
- cómo no olvidar que mañana llega un grupo al hotel
- aviso automático cuando un grupo no ha pagado el depósito
- recordatorio contratos pendientes de firmar en hotel
- que el hotel me avise solo cuando vence un plazo de pago de grupo
- sistema de alertas para director de hotel sin configuración complicada

**Tipo de página:** Recurso / Blog

**Estructura SEO:**
```
H1: Alertas Automáticas para No Olvidar Nada en la Gestión del Hotel
H2: Cobros pendientes de grupos que llegan solos al responsable
H2: Aviso de llegada con antelación suficiente para prepararlo
H2: Contratos y rooming lists sin cerrar: recordatorio automático
H3: Prioridades: informativo, medio, alto y urgente
H3: Gestión de bandeja: leído, pendiente y archivado
```

**Contenido de apoyo (blog):**
- "Cómo no olvidar los cobros de grupos en un hotel"
- "Checklist de gestión de grupos hoteleros antes de la llegada"

**Enlazado interno:**
- Gestión de grupos
- Panel de control
- Comunicación interna

---

## Módulo 11: Cuadre de Pisos (Conciliación Recepción-Housekeeping)

**Nombre SEO:** Cuadre Diario de Habitaciones entre Recepción y Pisos

**Funcionalidad (mejorada):** Formulario digital diario de cuadre entre recepción y el departamento de pisos con flujo de validación (borrador → confirmado → cerrado) y resumen mensual agregado con todas las discrepancias documentadas.

**Problema que resuelve (enfocado a negocio):** Las diferencias entre el estado de las habitaciones en recepción y en pisos se descubren tarde, sin documentación y sin ningún responsable claro. Este módulo formaliza el cuadre diario y deja constancia de cada discrepancia con su motivo.

### SEO

**Intención:** Comercial

**Keywords principales:**
- cuadre habitaciones recepción y pisos hotel
- parte diario pisos hotel digital
- control estado habitaciones hotel
- discrepancias recepción housekeeping hotel
- conciliación habitaciones hotel

**Long-tail de dolor:**
- recepción y pisos no cuadran habitaciones hotel cómo gestionarlo
- parte de pisos hotel sin papel ni excel
- cómo documentar las diferencias entre recepción y housekeeping
- cierre diario pisos hotel que quede registrado con responsable
- resumen mensual discrepancias habitaciones hotel para dirección

**Tipo de página:** Landing

**Estructura SEO:**
```
H1: Cuadre Diario de Habitaciones entre Recepción y Pisos
H2: Por qué recepción y pisos nunca cuadran (y cómo solucionarlo)
H2: Parte digital diario con validación por ambos departamentos
H2: Cada discrepancia documentada con motivo y responsable
H2: Resumen mensual para dirección sin recopilar nada a mano
H3: Cinco motivos de diferencia desde recepción
H3: Siete motivos de diferencia desde el departamento de pisos
```

**Contenido de apoyo (blog):**
- "Cómo hacer el cuadre de habitaciones en un hotel"
- "Por qué recepción y pisos no cuadran: causas más comunes"

**Enlazado interno:**
- Panel de control
- Informes
- Libro de novedades

---

## Módulo 12: Registro de Huéspedes Problemáticos (Lista Negra)

> **Oportunidad SEO:** Problema real, poco explotado en Google, alto valor para el sector.
> Captura tráfico informacional (gestores que buscan soluciones) y lo convierte en comercial.

**Nombre SEO:** Cómo Controlar Huéspedes Problemáticos en un Hotel

**Funcionalidad (mejorada):** Registro interno de huéspedes con historial de incidentes, nivel de gravedad, imágenes y pruebas adjuntas, auditoría de altas y bajas. Permite recuperar registros eliminados.

**Problema que resuelve (enfocado a negocio):** Un huésped que causó problemas graves vuelve al hotel al mes siguiente y nadie del equipo lo sabe porque no existe ningún registro formal. Este módulo crea una memoria institucional documentada y accesible para el personal autorizado.

### SEO

**Intención:** Informacional → Comercial (el usuario busca cómo gestionar el problema; la landing ofrece la solución)

**Keywords principales:**
- huéspedes problemáticos hotel cómo gestionarlos
- lista negra clientes hotel
- registro incidentes huéspedes hotel
- vetar cliente en hotel
- historial comportamiento huéspedes hotel

**Long-tail de dolor:**
- cómo vetar a un huésped problemático en un hotel
- qué hacer cuando un cliente causa problemas graves en un hotel
- cómo saber si un huésped ha dado problemas antes en tu hotel
- documentar un incidente grave con un cliente de hotel con evidencias
- base de datos huéspedes conflictivos hotel equipo comparte

**Tipo de página:** Recurso / Blog (artículo) con CTA hacia la landing del módulo

**Estructura SEO:**
```
H1: Cómo Controlar a los Huéspedes Problemáticos en un Hotel
H2: Por qué los hoteles no documentan los incidentes con clientes
H2: Qué información debe registrar un hotel sobre un huésped conflictivo
H2: Cómo funciona el sistema de registro (lista negra de huéspedes)
H2: Niveles de gravedad y tipos de incidencia más frecuentes
H3: Evidencias: registro fotográfico y documentación adjunta
H3: Auditoría de altas, modificaciones y bajas del registro
```

**Contenido de apoyo (blog):**
- "Cómo vetar a un huésped en un hotel: lo que dice la ley y cómo documentarlo"
- "Los tipos de incidentes con clientes más frecuentes en hoteles"
- "Por qué tu hotel necesita un registro de huéspedes problemáticos"

**Enlazado interno:**
- `/modulos/dashboard` (Panel de control)
- `/modulos/consigna` (Libro de Consigna — incidencias relacionadas)
- Informes

---

## Resumen de Estrategia SEO

### Mapa de páginas y keywords

| Página | URL | Tipo de keyword |
|--------|-----|-----------------|
| Landing hub | `/` | Genéricas (PMS, software hotelero) |
| Panel de Control | `/modulos/dashboard` | Dashboard, KPIs, visión global hotel |
| Libro de Consigna | `/modulos/consigna` | Traspaso turno, consigna digital, logbook |
| Gestión de Parking | `/modulos/parking` | Control aparcamiento, plazas hotel |
| Gestión de Turnos | `/modulos/turnos` | Cuadrante turnos, planificación personal |
| Mantenimiento | `/modulos/mantenimiento` | Averías, partes mantenimiento |
| Control de Caja | `/modulos/caja` | Arqueo caja, cierre turno |
| Backoffice | `/modulos/backoffice` | Facturas proveedores, administración |
| Comunicación Interna | `/modulos/mensajeria` | Chat interno, sin WhatsApp |
| Gestión de Grupos | `/modulos/grupos` | Grupos hotel, rooming list |
| Alertas | `/modulos/notificaciones` | Recordatorios automáticos |
| Cuadre de Pisos | `/modulos/pisos` | Cuadre recepción-housekeeping |
| Lista Negra | `/modulos/blacklist` | Huéspedes problemáticos |

### Por Intención de Búsqueda

| Intención | Páginas |
|-----------|---------|
| Comercial | Home (/), Dashboard, Parking, Turnos, Mantenimiento, Caja, Backoffice, Grupos, Cuadre de pisos |
| Informacional → Comercial | Libro de Consigna, Alertas y recordatorios, Lista Negra |
| Informacional | Comunicación interna |

### Por Tipo de Página

| Tipo | Páginas |
|------|---------|
| Landing principal + Demo | Home (`/`) — única con keywords genéricas de PMS |
| Landing de módulo | Dashboard, Parking, Turnos, Caja, Backoffice, Grupos, Cuadre de pisos |
| Landing de módulo + Blog | Libro de Consigna, Parking, Mantenimiento |
| Recurso / Blog con CTA | Comunicación interna, Alertas, Lista Negra |

### Vocabulario rotado (evitar repetir "software de X para hoteles")

| En lugar de... | Alternar con... |
|----------------|-----------------|
| software | sistema, herramienta, aplicación, plataforma, solución |
| para hoteles | hotelero/a, en hostelería, del hotel, para recepción |

### Keywords de marca (branded) — solo en `/`

| Keyword | Tipo | Dónde |
|---------|------|-------|
| HotelCode | Navegacional | Title tag, H1 alternativo, footer |
| demo HotelCode | Navegacional/Comercial | H2 en home, CTA botón demo |
| cómo funciona HotelCode | Informacional/Comercial | H2 en home, artículo de blog |
| HotelCode precio | Comercial | Meta description home + /precios |
| HotelCode software hotelero | Comercial | Meta description, intro párrafo |

> Las branded keywords no compiten con nadie — solo HotelCode aparece cuando alguien
> busca "HotelCode". Son fáciles de posicionar y mejoran el CTR en SERP.

### Keywords genéricas reservadas para `/` (NO usar en módulos)

- software de gestión hotelera
- PMS para hoteles
- programa para hoteles
- Property Management System
- software hotelero todo en uno

---

*Documento de estrategia SEO para HotelCode (`hotelcode.stackbp.es`) — mercado hotelero España*
