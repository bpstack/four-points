// modules/groups/controllers/group-controller.ts

import { Request, Response } from 'express'
import { GroupRepository } from '../../repositories/group/group-repository'
import { GroupContactRepository } from '../../repositories/group/group-contact-repository'
import { GroupRoomRepository } from '../../repositories/group/group-room-repository'
import { GroupPaymentRepository } from '../../repositories/group/group-payment-repository'
import { PaymentCalculatorService } from '../../services/group/payment-calculator-service'
import { GroupHistoryService } from '../../services/group/group-history-service'
import { CreateGroupDTO, UpdateGroupDTO, GroupFilters } from '../../models/group/index'

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
        error: 'Error al obtener grupos',
        message: error.message,
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
        error: 'Error al obtener grupo',
        message: error.message,
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
          error: 'Usuario no autenticado',
        })
      }

      const groupData: CreateGroupDTO = {
        ...req.body,
        created_by: userId,
      }

      if (!groupData.name || !groupData.arrival_date || !groupData.departure_date) {
        return res.status(400).json({
          success: false,
          error: 'Faltan campos obligatorios: name, arrival_date, departure_date',
        })
      }

      const newGroup = await GroupRepository.create(groupData)

      await GroupHistoryService.logGroupCreated(newGroup.id, userId, groupData)

      return res.status(201).json({
        success: true,
        message: 'Grupo creado correctamente',
        data: newGroup,
      })
    } catch (error: any) {
      console.error('Error en createGroup:', error)
      return res.status(500).json({
        success: false,
        error: 'Error al crear grupo',
        message: error.message,
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
          error: 'ID de grupo inválido',
        })
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado',
        })
      }

      const oldGroup = await GroupRepository.getById(groupId)

      if (!oldGroup) {
        return res.status(404).json({
          success: false,
          error: 'Grupo no encontrado',
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
        message: 'Grupo actualizado correctamente',
        data: updatedGroup,
      })
    } catch (error: any) {
      console.error('Error en updateGroup:', error)
      return res.status(500).json({
        success: false,
        error: 'Error al actualizar grupo',
        message: error.message,
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

      const deleted = await GroupRepository.delete(groupId)

      if (!deleted) {
        return res.status(500).json({
          success: false,
          error: 'Error al eliminar grupo',
        })
      }

      return res.status(200).json({
        success: true,
        message: 'Grupo eliminado correctamente',
      })
    } catch (error: any) {
      console.error('Error en deleteGroup:', error)
      return res.status(500).json({
        success: false,
        error: 'Error al eliminar grupo',
        message: error.message,
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
        error: 'Error al obtener resumen del dashboard',
        message: error.message,
      })
    }
  }

  /**
   * GET /api/groups/dashboard/timeline
   * Obtener timeline de grupos por año
   */
  static async getDashboardTimeline(req: Request, res: Response): Promise<Response> {
    try {
      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear()

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
        error: 'Error al obtener timeline',
        message: error.message,
      })
    }
  }
}
