// controllers/group/group-contact-controller.ts

import { Request, Response } from 'express'
import { GroupContactRepository } from '../../repositories/group/group-contact-repository'
import { GroupRepository } from '../../repositories/group/group-repository'
import { GroupHistoryService } from '../../services/group/group-history-service'
import { CreateGroupContactDTO, UpdateGroupContactDTO } from '../../models/group/index'
import { ERROR_CODES, SUCCESS_CODES } from '../../config/error-codes.js'
import { logger } from '../../config/logger.js'
import {
  createContactSchema,
  updateContactSchema,
  validationError,
} from '../../validations/group/group-schemas.js'

export class GroupContactController {
  /**
   * GET /api/groups/:id/contacts
   * Obtener todos los contactos de un grupo
   */
  static async getContactsByGroup(req: Request, res: Response): Promise<Response> {
    try {
      const groupId = parseInt(req.params.id)

      if (isNaN(groupId)) {
        return res.status(400).json({
          success: false,
          error: ERROR_CODES.GROUP_INVALID_ID,
          code: ERROR_CODES.GROUP_INVALID_ID,
        })
      }

      const group = await GroupRepository.getById(groupId)

      if (!group) {
        return res.status(404).json({
          success: false,
          error: ERROR_CODES.GROUP_NOT_FOUND,
          code: ERROR_CODES.GROUP_NOT_FOUND,
        })
      }

      const contacts = await GroupContactRepository.getByGroupId(groupId)

      return res.status(200).json({
        success: true,
        data: contacts,
        count: contacts.length,
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en getContactsByGroup')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.GROUP_CONTACT_FETCH_ERROR,
        code: ERROR_CODES.GROUP_CONTACT_FETCH_ERROR,
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
          error: ERROR_CODES.GROUP_INVALID_ID,
          code: ERROR_CODES.GROUP_INVALID_ID,
        })
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        })
      }

      const group = await GroupRepository.getById(groupId)

      if (!group) {
        return res.status(404).json({
          success: false,
          error: ERROR_CODES.GROUP_NOT_FOUND,
          code: ERROR_CODES.GROUP_NOT_FOUND,
        })
      }

      const parsed = createContactSchema.safeParse(req.body)
      if (!parsed.success) {
        return res.status(400).json(validationError(parsed.error))
      }

      const contactData = {
        ...parsed.data,
        group_id: groupId,
        is_primary: parsed.data.is_primary ?? false,
      } as CreateGroupContactDTO

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
        message: SUCCESS_CODES.GROUP_CONTACT_CREATED,
        code: SUCCESS_CODES.GROUP_CONTACT_CREATED,
        data: newContact,
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en createContact')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.GROUP_CONTACT_CREATE_ERROR,
        code: ERROR_CODES.GROUP_CONTACT_CREATE_ERROR,
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
          error: ERROR_CODES.INVALID_ID,
          code: ERROR_CODES.INVALID_ID,
        })
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        })
      }

      const oldContact = await GroupContactRepository.getById(contactId)

      if (!oldContact) {
        return res.status(404).json({
          success: false,
          error: ERROR_CODES.GROUP_CONTACT_NOT_FOUND,
          code: ERROR_CODES.GROUP_CONTACT_NOT_FOUND,
        })
      }

      if (oldContact.group_id !== groupId) {
        return res.status(400).json({
          success: false,
          error: ERROR_CODES.GROUP_CONTACT_NOT_IN_GROUP,
          code: ERROR_CODES.GROUP_CONTACT_NOT_IN_GROUP,
        })
      }

      const parsed = updateContactSchema.safeParse(req.body)
      if (!parsed.success) {
        return res.status(400).json(validationError(parsed.error))
      }
      const updateData = parsed.data as UpdateGroupContactDTO

      const updated = await GroupContactRepository.update(contactId, updateData)

      if (!updated) {
        return res.status(500).json({
          success: false,
          error: ERROR_CODES.GROUP_CONTACT_UPDATE_ERROR,
          code: ERROR_CODES.GROUP_CONTACT_UPDATE_ERROR,
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
        message: SUCCESS_CODES.GROUP_CONTACT_UPDATED,
        code: SUCCESS_CODES.GROUP_CONTACT_UPDATED,
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en updateContact')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.GROUP_CONTACT_UPDATE_ERROR,
        code: ERROR_CODES.GROUP_CONTACT_UPDATE_ERROR,
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
          error: ERROR_CODES.INVALID_ID,
          code: ERROR_CODES.INVALID_ID,
        })
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        })
      }

      const contact = await GroupContactRepository.getById(contactId)

      if (!contact) {
        return res.status(404).json({
          success: false,
          error: ERROR_CODES.GROUP_CONTACT_NOT_FOUND,
          code: ERROR_CODES.GROUP_CONTACT_NOT_FOUND,
        })
      }

      if (contact.group_id !== groupId) {
        return res.status(400).json({
          success: false,
          error: ERROR_CODES.GROUP_CONTACT_NOT_IN_GROUP,
          code: ERROR_CODES.GROUP_CONTACT_NOT_IN_GROUP,
        })
      }

      const deleted = await GroupContactRepository.delete(contactId)

      if (!deleted) {
        return res.status(500).json({
          success: false,
          error: ERROR_CODES.GROUP_CONTACT_DELETE_ERROR,
          code: ERROR_CODES.GROUP_CONTACT_DELETE_ERROR,
        })
      }

      await GroupHistoryService.logDeleted(groupId, userId, 'group_contacts', contactId, contact)

      return res.status(200).json({
        success: true,
        message: SUCCESS_CODES.GROUP_CONTACT_DELETED,
        code: SUCCESS_CODES.GROUP_CONTACT_DELETED,
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en deleteContact')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.GROUP_CONTACT_DELETE_ERROR,
        code: ERROR_CODES.GROUP_CONTACT_DELETE_ERROR,
      })
    }
  }

  /**
   * GET /api/groups/:id/contacts/primary
   * Obtener contacto principal de un grupo
   */
  static async getPrimaryContact(req: Request, res: Response): Promise<Response> {
    try {
      const groupId = parseInt(req.params.id)

      if (isNaN(groupId)) {
        return res.status(400).json({
          success: false,
          error: ERROR_CODES.GROUP_INVALID_ID,
          code: ERROR_CODES.GROUP_INVALID_ID,
        })
      }

      const primaryContact = await GroupContactRepository.getPrimaryContact(groupId)

      if (!primaryContact) {
        return res.status(404).json({
          success: false,
          error: ERROR_CODES.GROUP_CONTACT_PRIMARY_NOT_FOUND,
          code: ERROR_CODES.GROUP_CONTACT_PRIMARY_NOT_FOUND,
        })
      }

      return res.status(200).json({
        success: true,
        data: primaryContact,
      })
    } catch (error: any) {
      logger.error({ err: error }, 'Error en getPrimaryContact')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.GROUP_CONTACT_FETCH_PRIMARY_ERROR,
        code: ERROR_CODES.GROUP_CONTACT_FETCH_PRIMARY_ERROR,
      })
    }
  }
}
