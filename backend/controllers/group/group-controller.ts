// modules/groups/controllers/group-controller.ts

import { Request, Response } from 'express'
import { GroupRepository } from '../../repositories/group/group-repository'
import { GroupContactRepository } from '../../repositories/group/group-contact-repository'
import { GroupRoomRepository } from '../../repositories/group/group-room-repository'
import { GroupPaymentRepository } from '../../repositories/group/group-payment-repository'
import { PaymentCalculatorService } from '../../services/group/payment-calculator-service'
import { GroupHistoryService } from '../../services/group/group-history-service'
import { CreateGroupDTO, UpdateGroupDTO, GroupFilters } from '../../models/group/index'
import { ERROR_CODES, SUCCESS_CODES } from '../../config/error-codes.js'
import { getNowMadrid } from '../../config/date-utils.js'
import { logger } from '../../config/logger.js'
import {
  groupListQuerySchema,
  createGroupSchema,
  updateGroupSchema,
  timelineQuerySchema,
  validationError,
} from '../../validations/group/group-schemas.js'

export class GroupController {
  /**
   * GET /api/groups
   * Listar todos los grupos con filtros opcionales
   */
  static async getAllGroups(req: Request, res: Response): Promise<Response> {
    try {
      const parsed = groupListQuerySchema.safeParse(req.query)
      if (!parsed.success) {
        return res.status(400).json(validationError(parsed.error))
      }

      const groups = await GroupRepository.getAll(parsed.data as GroupFilters)

      return res.status(200).json({
        success: true,
        data: groups,
        count: groups.length,
      })
    } catch (error) {
      logger.error({ err: error }, 'Error en getAllGroups')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.GROUP_FETCH_ERROR,
        code: ERROR_CODES.GROUP_FETCH_ERROR,
      })
    }
  }

  /**
   * GET /api/groups/:id
   * Obtener detalle completo de un grupo
   */
  static async getGroupById(req: Request, res: Response): Promise<Response> {
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
      const rooms = await GroupRoomRepository.getByGroupId(groupId)
      const payments = await GroupPaymentRepository.getByGroupId(groupId)
      const roomsSummary = await GroupRoomRepository.getTotalRoomsByGroup(groupId)
      const balance = await PaymentCalculatorService.calculateBalance(groupId)

      return res.status(200).json({
        success: true,
        data: {
          ...group,
          contacts,
          rooms,
          payments,
          roomsSummary,
          balance,
        },
      })
    } catch (error) {
      logger.error({ err: error }, 'Error en getGroupById')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.GROUP_FETCH_ONE_ERROR,
        code: ERROR_CODES.GROUP_FETCH_ONE_ERROR,
      })
    }
  }

  /**
   * POST /api/groups
   * Crear nuevo grupo
   */
  static async createGroup(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        })
      }

      const parsed = createGroupSchema.safeParse(req.body)
      if (!parsed.success) {
        return res.status(400).json(validationError(parsed.error))
      }

      const groupData = { ...parsed.data, created_by: userId } as CreateGroupDTO

      const newGroup = await GroupRepository.create(groupData)

      await GroupHistoryService.logGroupCreated(newGroup.id, userId, groupData)

      return res.status(201).json({
        success: true,
        message: SUCCESS_CODES.GROUP_CREATED,
        code: SUCCESS_CODES.GROUP_CREATED,
        data: newGroup,
      })
    } catch (error) {
      logger.error({ err: error }, 'Error en createGroup')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.GROUP_CREATE_ERROR,
        code: ERROR_CODES.GROUP_CREATE_ERROR,
      })
    }
  }

  /**
   * PUT /api/groups/:id
   * Actualizar grupo
   */
  static async updateGroup(req: Request, res: Response): Promise<Response> {
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

      const parsed = updateGroupSchema.safeParse(req.body)
      if (!parsed.success) {
        return res.status(400).json(validationError(parsed.error))
      }

      const oldGroup = await GroupRepository.getById(groupId)

      if (!oldGroup) {
        return res.status(404).json({
          success: false,
          error: ERROR_CODES.GROUP_NOT_FOUND,
          code: ERROR_CODES.GROUP_NOT_FOUND,
        })
      }

      const updateData = { ...parsed.data, updated_by: userId } as UpdateGroupDTO

      const updatedGroup = await GroupRepository.update(groupId, updateData)

      if (
        updateData.total_amount !== undefined &&
        updateData.total_amount !== oldGroup.total_amount
      ) {
        await PaymentCalculatorService.recalculatePayments(groupId, updateData.total_amount)
      }

      await GroupHistoryService.logGroupUpdated(
        groupId,
        userId,
        oldGroup,
        updatedGroup || updateData
      )

      return res.status(200).json({
        success: true,
        message: SUCCESS_CODES.GROUP_UPDATED,
        code: SUCCESS_CODES.GROUP_UPDATED,
        data: updatedGroup,
      })
    } catch (error) {
      logger.error({ err: error }, 'Error en updateGroup')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.GROUP_UPDATE_ERROR,
        code: ERROR_CODES.GROUP_UPDATE_ERROR,
      })
    }
  }

  /**
   * DELETE /api/groups/:id
   * Eliminar grupo
   */
  static async deleteGroup(req: Request, res: Response): Promise<Response> {
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

      const deleted = await GroupRepository.delete(groupId)

      if (!deleted) {
        return res.status(500).json({
          success: false,
          error: ERROR_CODES.GROUP_DELETE_ERROR,
          code: ERROR_CODES.GROUP_DELETE_ERROR,
        })
      }

      return res.status(200).json({
        success: true,
        message: SUCCESS_CODES.GROUP_DELETED,
        code: SUCCESS_CODES.GROUP_DELETED,
      })
    } catch (error) {
      logger.error({ err: error }, 'Error en deleteGroup')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.GROUP_DELETE_ERROR,
        code: ERROR_CODES.GROUP_DELETE_ERROR,
      })
    }
  }

  /**
   * GET /api/groups/dashboard/overview
   * Obtener resumen general para dashboard
   */
  static async getDashboardOverview(_req: Request, res: Response): Promise<Response> {
    try {
      const overview = await GroupRepository.getDashboardOverview()
      const paymentsSummary = await GroupPaymentRepository.getPaymentsSummary()

      return res.status(200).json({
        success: true,
        data: {
          groups: overview,
          payments: paymentsSummary,
        },
      })
    } catch (error) {
      logger.error({ err: error }, 'Error en getDashboardOverview')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.GROUP_FETCH_DASHBOARD_ERROR,
        code: ERROR_CODES.GROUP_FETCH_DASHBOARD_ERROR,
      })
    }
  }

  /**
   * GET /api/groups/dashboard/timeline
   * Obtener timeline de grupos por año
   */
  static async getDashboardTimeline(req: Request, res: Response): Promise<Response> {
    try {
      const parsed = timelineQuerySchema.safeParse(req.query)
      if (!parsed.success) {
        return res.status(400).json(validationError(parsed.error))
      }
      const year = parsed.data.year ?? getNowMadrid().year()

      const timeline = await GroupRepository.getTimeline(year)

      return res.status(200).json({
        success: true,
        data: timeline,
        year,
      })
    } catch (error) {
      logger.error({ err: error }, 'Error en getDashboardTimeline')
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.GROUP_FETCH_TIMELINE_ERROR,
        code: ERROR_CODES.GROUP_FETCH_TIMELINE_ERROR,
      })
    }
  }
}
