// controllers/group/group-contact-controller.ts

import { Request, Response } from 'express'
import { GroupContactRepository } from '../../repositories/group/group-contact-repository'
import { GroupRepository } from '../../repositories/group/group-repository'
import { GroupHistoryService } from '../../services/group/group-history-service'
import {
  CreateGroupContactDTO,
  UpdateGroupContactDTO,
} from '../../models/group/index'

export class GroupContactController {
  /**
   * GET /api/groups/:id/contacts
   * Obtener todos los contactos de un grupo
   */
  static async getContactsByGroup(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const groupId = parseInt(req.params.id)

      if (isNaN(groupId)) {
        return res.status(400).json({
          success: false,
          error: 'ID de grupo inválido',
        })
      }

      const group = await GroupRepository.getById(groupId)

      if (!group) {
        return res.status(404).json({
          success: false,
          error: 'Grupo no encontrado',
        })
      }

      const contacts = await GroupContactRepository.getByGroupId(groupId)

      return res.status(200).json({
        success: true,
        data: contacts,
        count: contacts.length,
      })
    } catch (error: any) {
      console.error('Error en getContactsByGroup:', error)
      return res.status(500).json({
        success: false,
        error: 'Error al obtener contactos',
        message: error.message,
      })
    }
  }

  /**
   * POST /api/groups/:id/contacts
   * Crear nuevo contacto
   */
  static async createContact(req: Request, res: Response): Promise<Response> {
    try {
      const groupId = parseInt(req.params.id)
      const userId = req.user?.id

      if (isNaN(groupId)) {
        return res.status(400).json({
          success: false,
          error: 'ID de grupo inválido',
        })
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado',
        })
      }

      const group = await GroupRepository.getById(groupId)

      if (!group) {
        return res.status(404).json({
          success: false,
          error: 'Grupo no encontrado',
        })
      }

      const contactData: CreateGroupContactDTO = {
        group_id: groupId,
        contact_name: req.body.contact_name,
        contact_email: req.body.contact_email,
        contact_phone: req.body.contact_phone,
        is_primary: req.body.is_primary || false,
      }

      const newContact = await GroupContactRepository.create(contactData)

      await GroupHistoryService.logChange(
        groupId,
        userId,
        'created' as any,
        'group_contacts',
        newContact.id,
        null,
        null,
        JSON.stringify(contactData),
        'Contacto creado'
      )

      return res.status(201).json({
        success: true,
        message: 'Contacto creado correctamente',
        data: newContact,
      })
    } catch (error: any) {
      console.error('Error en createContact:', error)
      return res.status(500).json({
        success: false,
        error: 'Error al crear contacto',
        message: error.message,
      })
    }
  }

  /**
   * PUT /api/groups/:id/contacts/:contactId
   * Actualizar contacto
   */
  static async updateContact(req: Request, res: Response): Promise<Response> {
    try {
      const groupId = parseInt(req.params.id)
      const contactId = parseInt(req.params.contactId)
      const userId = req.user?.id

      if (isNaN(groupId) || isNaN(contactId)) {
        return res.status(400).json({
          success: false,
          error: 'IDs inválidos',
        })
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado',
        })
      }

      const oldContact = await GroupContactRepository.getById(contactId)

      if (!oldContact) {
        return res.status(404).json({
          success: false,
          error: 'Contacto no encontrado',
        })
      }

      if (oldContact.group_id !== groupId) {
        return res.status(400).json({
          success: false,
          error: 'El contacto no pertenece a este grupo',
        })
      }

      const updateData: UpdateGroupContactDTO = req.body

      const updated = await GroupContactRepository.update(contactId, updateData)

      if (!updated) {
        return res.status(500).json({
          success: false,
          error: 'Error al actualizar contacto',
        })
      }

      await GroupHistoryService.logChange(
        groupId,
        userId,
        'updated' as any,
        'group_contacts',
        contactId,
        null,
        JSON.stringify(oldContact),
        JSON.stringify(updateData),
        'Contacto actualizado'
      )

      return res.status(200).json({
        success: true,
        message: 'Contacto actualizado correctamente',
      })
    } catch (error: any) {
      console.error('Error en updateContact:', error)
      return res.status(500).json({
        success: false,
        error: 'Error al actualizar contacto',
        message: error.message,
      })
    }
  }

  /**
   * DELETE /api/groups/:id/contacts/:contactId
   * Eliminar contacto
   */
  static async deleteContact(req: Request, res: Response): Promise<Response> {
    try {
      const groupId = parseInt(req.params.id)
      const contactId = parseInt(req.params.contactId)
      const userId = req.user?.id

      if (isNaN(groupId) || isNaN(contactId)) {
        return res.status(400).json({
          success: false,
          error: 'IDs inválidos',
        })
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado',
        })
      }

      const contact = await GroupContactRepository.getById(contactId)

      if (!contact) {
        return res.status(404).json({
          success: false,
          error: 'Contacto no encontrado',
        })
      }

      if (contact.group_id !== groupId) {
        return res.status(400).json({
          success: false,
          error: 'El contacto no pertenece a este grupo',
        })
      }

      const deleted = await GroupContactRepository.delete(contactId)

      if (!deleted) {
        return res.status(500).json({
          success: false,
          error: 'Error al eliminar contacto',
        })
      }

      await GroupHistoryService.logDeleted(
        groupId,
        userId,
        'group_contacts',
        contactId,
        contact
      )

      return res.status(200).json({
        success: true,
        message: 'Contacto eliminado correctamente',
      })
    } catch (error: any) {
      console.error('Error en deleteContact:', error)
      return res.status(500).json({
        success: false,
        error: 'Error al eliminar contacto',
        message: error.message,
      })
    }
  }

  /**
   * GET /api/groups/:id/contacts/primary
   * Obtener contacto principal de un grupo
   */
  static async getPrimaryContact(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const groupId = parseInt(req.params.id)

      if (isNaN(groupId)) {
        return res.status(400).json({
          success: false,
          error: 'ID de grupo inválido',
        })
      }

      const primaryContact = await GroupContactRepository.getPrimaryContact(
        groupId
      )

      if (!primaryContact) {
        return res.status(404).json({
          success: false,
          error: 'No se encontró contacto principal',
        })
      }

      return res.status(200).json({
        success: true,
        data: primaryContact,
      })
    } catch (error: any) {
      console.error('Error en getPrimaryContact:', error)
      return res.status(500).json({
        success: false,
        error: 'Error al obtener contacto principal',
        message: error.message,
      })
    }
  }
}
