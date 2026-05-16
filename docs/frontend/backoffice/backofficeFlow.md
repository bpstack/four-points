# Analisis Modulo Backoffice - Flujo de Facturas

## Flujo de Estados de Facturas

```
pending -> validated -> paid
              |
              v
          (revert via "Reabrir Mes")
```

## Procedimiento para que las facturas aparezcan en "Pagadas"

### Paso 1: Validar todas las facturas del mes
Desde el tab "Pendientes":
- Factura con PDF: Click en el check -> Se abre el editor PDF -> Agregar sello/firma -> Guardar
- Factura sin PDF: Click en el check -> Confirmar validacion (sin sello)
- Estado cambia de `pending` a `validated`

### Paso 2: Cerrar el mes (Batch Payment)
Desde el tab "Pendientes":
1. Click en boton morado **"Cerrar Mes"**
2. Se muestra preview del mes anterior con:
   - Cantidad de facturas validadas
   - Importe total
3. Click en **"Marcar X como Pagadas"**
4. Todas las facturas `validated` del mes pasan a `paid`
5. Aparecen automaticamente en el tab **"Pagadas"**

### Endpoint usado:
- Preview: `GET /api/backoffice/invoices/batch-pay/preview?year=X&month=X`
- Ejecutar: `POST /api/backoffice/invoices/batch-pay` con body `{ year, month }`

---

## Posibles Situaciones Problematicas

### 1. **Facturas que no se marcan como pagadas**
**Causa:** Solo se procesan facturas con estado `validated`
**Solucion:** Verificar que todas las facturas del mes estan validadas antes de cerrar

### 2. **El boton "Cerrar Mes" muestra 0 facturas**
**Causa:** El batch payment busca facturas del **mes anterior** por defecto
**Ejemplo:** Si estamos en Diciembre 2025, buscara facturas de Noviembre 2025
**Solucion:** Si necesitas cerrar un mes especifico, el sistema usa automaticamente el mes anterior

### 3. **MOCK DATA activo en PaidInvoicesTab**
**ATENCION - PROBLEMA CRITICO:**
En `PaidInvoicesTab.tsx` linea 55:
```typescript
const USE_MOCK_DATA = true // SET TO FALSE FOR PRODUCTION
```
**Esto hace que el tab "Pagadas" muestre datos FALSOS, no tus facturas reales.**
**Solucion:** Cambiar a `false` antes de produccion

### 4. **Facturas pagadas que necesitan revertirse**
**Solucion:** 
1. Ir al tab "Pagadas"
2. Click en boton naranja **"Reabrir Mes"**
3. Seleccionar el mes a revertir
4. Las facturas vuelven a estado `validated`

### 5. **Error de autenticacion al cerrar mes**
**Causa:** Token JWT expirado
**Solucion:** Recargar la pagina para refrescar el token

### 6. **Facturas aparecen en "Pendientes" despues de validar**
**Causa:** El tab "Pendientes" muestra facturas con status `pending` Y `validated`
**Comportamiento esperado:** Las facturas validadas siguen apareciendo en Pendientes hasta que se ejecute "Cerrar Mes"

### 7. **No aparece PDF validado despues de agregar sello**
**Proceso correcto:**
1. Se sube el PDF validado a Cloudinary
2. Se guarda `validated_pdf_url` en la BD
3. Se llama a `validateInvoice` para cambiar status
**Verificar:** Que Cloudinary este configurado correctamente

### 8. **El filtro de mes en "Pagadas" no muestra facturas**
**Causa:** El filtro usa `invoice_date` (fecha de factura), no `paid_date`
**Solucion:** Asegurar que las facturas tienen la fecha correcta

---

## Resumen del Flujo Correcto

1. **Crear facturas** -> status: `pending`
2. **Subir PDF original** (opcional pero recomendado)
3. **Validar cada factura** -> status: `validated`
   - Con PDF: Editor para agregar sello/firma
   - Sin PDF: Confirmacion directa
4. **Fin de mes**: Click "Cerrar Mes" -> status: `paid`
5. Las facturas aparecen en tab "Pagadas"

---

## Acciones Disponibles por Estado

| Estado | Acciones |
|--------|----------|
| `pending` | Validar, Editar, Subir PDF, Eliminar |
| `validated` | Revertir validacion, Editar, Ver PDF |
| `paid` | Ver PDF, Exportar CSV, Exportar ZIP |

---

## Importante: Cambio para Produccion

Antes de ir a produccion, en `frontend/app/components/bo/tabs/PaidInvoicesTab.tsx`:

```typescript
// Linea 55: CAMBIAR DE
const USE_MOCK_DATA = true

// A
const USE_MOCK_DATA = false
```
