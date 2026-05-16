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

export class GroupController {
  /**
   * GET /api/groups
   * Listar todos los grupos con filtros opcionales
   */
  static async getAllGroups(req: Request, res: Response): Promise<Response> {
    try {
      const filters: GroupFilters = {
        status: req.query.status as any,
        arrival_from: req.query.arrival_from as string,
        arrival_to: req.query.arrival_to as string,
        departure_from: req.query.departure_from as string,
        departure_to: req.query.departure_to as string,
        agency: req.query.agency as string,
        sort: req.query.sort as string,
        order: req.query.order as 'ASC' | 'DESC',
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      }

      const groups = await GroupRepository.getAll(filters)

      return res.status(200).json({
        success: true,
        data: groups,
        count: groups.length,
      })
    } catch (error: any) {
      console.error('Error en getAllGroups:', error)
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
    } catch (error: any) {
      console.error('Error en getGroupById:', error)
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

      const groupData: CreateGroupDTO = {
        ...req.body,
        created_by: userId,
      }

      if (!groupData.name || !groupData.arrival_date || !groupData.departure_date) {
        return res.status(400).json({
          success: false,
          error: ERROR_CODES.GROUP_MISSING_REQUIRED_FIELDS,
          code: ERROR_CODES.GROUP_MISSING_REQUIRED_FIELDS,
        })
      }

      const newGroup = await GroupRepository.create(groupData)

      await GroupHistoryService.logGroupCreated(newGroup.id, userId, groupData)

      return res.status(201).json({
        success: true,
        message: SUCCESS_CODES.GROUP_CREATED,
        code: SUCCESS_CODES.GROUP_CREATED,
        data: newGroup,
      })
    } catch (error: any) {
      console.error('Error en createGroup:', error)
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

      const oldGroup = await GroupRepository.getById(groupId)

      if (!oldGroup) {
        return res.status(404).json({
          success: false,
          error: ERROR_CODES.GROUP_NOT_FOUND,
          code: ERROR_CODES.GROUP_NOT_FOUND,
        })
      }

      const updateData: UpdateGroupDTO = {
        ...req.body,
        updated_by: userId,
      }

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
    } catch (error: any) {
      console.error('Error en updateGroup:', error)
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
    } catch (error: any) {
      console.error('Error en deleteGroup:', error)
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
    } catch (error: any) {
      console.error('Error en getDashboardOverview:', error)
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
      const year = req.query.year ? parseInt(req.query.year as string) : getNowMadrid().year()

      const timeline = await GroupRepository.getTimeline(year)

      return res.status(200).json({
        success: true,
        data: timeline,
        year,
      })
    } catch (error: any) {
      console.error('Error en getDashboardTimeline:', error)
      return res.status(500).json({
        success: false,
        error: ERROR_CODES.GROUP_FETCH_TIMELINE_ERROR,
        code: ERROR_CODES.GROUP_FETCH_TIMELINE_ERROR,
      })
    }
  }
}
