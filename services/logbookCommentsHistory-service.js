// Posibles mejoras y buenas prácticas

// Separar lógica de historial de comentarios en un servicio

// Ahora registras el historial directamente desde el controlador con commentHistoryRepo.createCommentAction.

// Podrías crear un archivo services/logbookCommentsHistory-service.js que tenga funciones como logCommentAction({ ... }), updateCommentHistory(...), deleteCommentHistory(...).

// Ventaja: el controlador queda más limpio y solo coordina flujos, mientras que la lógica de “historial de comentarios” se centraliza en un service.

// Mantener logbookHistoryService.logAction separado

// Esto es correcto: cualquier acción que afecte al logbook en general (p. ej. creación de un comentario) puede registrar un mensaje en el historial del logbook.

// No necesitas mezclarlo con el historial de comentarios; que sean servicios independientes está bien.

// Opcional: funciones helper para validaciones

// Por ejemplo, verificar que un comentario pertenece al logbook, o que el usuario puede modificarlo. Esto ayuda a no repetir lógica en cada controlador.
