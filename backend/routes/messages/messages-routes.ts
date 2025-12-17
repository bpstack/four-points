// routes/messages/messages-routes.ts

import { Router } from 'express'
import { authenticateToken as verifyToken } from '../../middlewares/authenticateToken.js'
import { isAdmin } from '../../middlewares/roleCheck.js'
import { ConversationController } from '../../controllers/messages/conversation-controller.js'
import { MessageController } from '../../controllers/messages/message-controller.js'

const router = Router()

// ===============================================
// RUTAS DE MENSAJERIA
// Base: /api/messages
// ===============================================

// --- Usuarios (buscar para iniciar chat) ---
router.get('/users', verifyToken, ConversationController.searchUsers)

// --- Contador de no leidos ---
router.get('/unread-count', verifyToken, MessageController.getUnreadCount)

// --- Busqueda de mensajes ---
router.get('/search', verifyToken, MessageController.searchMessages)

// --- Conversaciones (Admin: ver todas) ---
router.get('/conversations/all', verifyToken, isAdmin, ConversationController.getAllConversations)

// --- Conversaciones ---
router.get('/conversations', verifyToken, ConversationController.getMyConversations)
router.post('/conversations', verifyToken, ConversationController.createConversation)
router.get('/conversations/:id', verifyToken, ConversationController.getConversation)
router.patch('/conversations/:id', verifyToken, ConversationController.updateConversation)
router.delete('/conversations/:id', verifyToken, ConversationController.leaveConversation)

// --- Eliminar conversacion completa ---
router.delete('/conversations/:id/delete', verifyToken, ConversationController.deleteConversation)

// --- Marcar conversacion como leida ---
router.post('/conversations/:id/read', verifyToken, ConversationController.markAsRead)

// --- Participantes de grupo ---
router.post('/conversations/:id/participants', verifyToken, ConversationController.addParticipants)
router.delete(
  '/conversations/:id/participants/:userId',
  verifyToken,
  ConversationController.removeParticipant
)

// --- Mensajes de conversacion ---
router.get('/conversations/:id/messages', verifyToken, MessageController.getMessages)
router.post('/conversations/:id/messages', verifyToken, MessageController.sendMessage)

// --- Operaciones sobre mensajes individuales ---
router.patch('/:messageId', verifyToken, MessageController.editMessage)
router.delete('/:messageId', verifyToken, MessageController.deleteMessage)

export default router
