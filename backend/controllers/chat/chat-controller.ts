// controllers/chat/chat-controller.ts
// Controlador para el chat de ayuda con IA

import { Request, Response } from 'express'
import { chatService } from '../../services/chat/chat-service.js'

/**
 * POST /api/chat/message
 * Envía un mensaje al asistente de IA
 */
export const sendMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, history } = req.body

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'El mensaje es requerido',
      })
      return
    }

    // Limitar longitud del mensaje
    if (message.length > 2000) {
      res.status(400).json({
        success: false,
        error: 'El mensaje es demasiado largo (máximo 2000 caracteres)',
      })
      return
    }

    // Limitar historial para no exceder tokens
    const limitedHistory = history?.slice(-10) || []

    const response = await chatService.sendMessage({
      message: message.trim(),
      history: limitedHistory,
    })

    if (response.success) {
      res.json({
        success: true,
        reply: response.reply,
      })
    } else {
      res.status(500).json({
        success: false,
        error: response.error || 'Error al procesar el mensaje',
      })
    }
  } catch (error) {
    console.error('[ChatController] Error en sendMessage:', error)
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
    })
  }
}

/**
 * GET /api/chat/status
 * Obtiene el estado del servicio de chat
 */
export const getStatus = async (_req: Request, res: Response): Promise<void> => {
  try {
    const status = chatService.getStatus()
    res.json({
      success: true,
      ...status,
    })
  } catch (error) {
    console.error('[ChatController] Error en getStatus:', error)
    res.status(500).json({
      success: false,
      error: 'Error al obtener estado del servicio',
    })
  }
}
