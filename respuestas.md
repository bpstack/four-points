Buena pregunta. Mi recomendación: primero los hooks/componentes reutilizables.
Por qué este orden:

Ya tienes los patrones identificados - No estás adivinando qué abstraer, ya sabes exactamente qué se repite (useCalendarDropdown, formatDateDisplay, etc.)
Evitas trabajo doble - Si migras ContactPanel, RoomPanel y PaymentPanel primero, vas a copiar ese código duplicado. Luego tendrías que volver a tocarlos para usar los hooks.
Migración más limpia - Cuando migres los 3 paneles de /groups/panels/, ya tendrás las piezas listas y el código nuevo nace bien desde el principio.

Orden que yo seguiría:
1. useCalendarDropdown (elimina ~56 líneas)
2. CalendarDateInput (elimina ~280 líneas) 
3. SlidePanelFooterWithDelete (elimina ~140 líneas)
   
   → Validar con UN panel existente que ya use SlidePanel
   
4. Migrar ContactPanel.tsx
5. Migrar RoomPanel.tsx  
6. Migrar PaymentPanel.tsx
Tip práctico: Después de crear cada hook/componente, refactoriza UN panel existente que ya funcione para validar que el hook está bien diseñado. Así no descubres problemas cuando ya has migrado todo.

3. ConfirmDialog y Modal.tsx, donde estan los componentes estos ? en cualquier caso los dejamos asipor ahora 
4. todo lo duplicado lo intentamos unificar simplificar