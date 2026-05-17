// controllers/group/group-status-controller.ts

import { Request, Response } from 'express'
import { GroupStatusRepository } from '../../repositories/group/group-status-repository'
import { GroupHistoryService } from '../../services/group/group-history-service'
import {
  UpdateBookingRequest,
  UpdateContractRequest,
  UpdateRoomingRequest,
  UpdateBalanceRequest,
} from '../../models/group/index'
import { ERROR_CODES, SUCCESS_CODES } from '../../config/error-codes.js'
import { logger } from '../../config/logger.js'

export class GroupStatusController {
  /**
   * Obtener estado completo de un grupo
   * GET /api/groups/:id/status
   */
  static async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const groupId = parseInt(req.params.id)

      const status = await GroupStatusRepository.getByGroupId(groupId)

      if (!status) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.GROUP_STATUS_NOT_FOUND,
          code: ERROR_CODES.GROUP_STATUS_NOT_FOUND,
        })
        return
      }

      res.json(status)
    } catch (error) {
      logger.error({ err: error }, 'Error al obtener estado')
      res.status(500).json({
        success: false,
        error: ERROR_CODES.GROUP_STATUS_FETCH_ERROR,
        code: ERROR_CODES.GROUP_STATUS_FETCH_ERROR,
      })
    }
  }

  /**
   * Actualizar booking/confirmación
   * PUT /api/groups/:id/status/booking
   */
  static async updateBooking(req: Request, res: Response): Promise<void> {
    try {
      const groupId = parseInt(req.params.id)
      const userId = req.user?.id
      const { confirmed, date }: UpdateBookingRequest = req.body

      if (!userId) {
        res.status(401).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        })
        return
      }

      if (confirmed === undefined) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.GROUP_STATUS_CONFIRMED_REQUIRED,
          code: ERROR_CODES.GROUP_STATUS_CONFIRMED_REQUIRED,
        })
        return
      }

      // Obtener estado anterior
      const oldStatus = await GroupStatusRepository.getByGroupId(groupId)

      // Actualizar booking
      const updated = await GroupStatusRepository.updateBooking(groupId, {
        confirmed,
        date,
      })

      if (!updated) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.GROUP_NOT_FOUND,
          code: ERROR_CODES.GROUP_NOT_FOUND,
        })
        return
      }

      // Registrar en historial
      await GroupHistoryService.logStatusChanged(
        groupId,
        userId,
        'booking_confirmed',
        oldStatus?.booking_confirmed,
        confirmed
      )

      res.json({
        success: true,
        message: SUCCESS_CODES.GROUP_BOOKING_UPDATED,
        code: SUCCESS_CODES.GROUP_BOOKING_UPDATED,
      })
    } catch (error) {
      logger.error({ err: error }, 'Error al actualizar booking')
      res.status(500).json({
        success: false,
        error: ERROR_CODES.GROUP_STATUS_UPDATE_BOOKING_ERROR,
        code: ERROR_CODES.GROUP_STATUS_UPDATE_BOOKING_ERROR,
      })
    }
  }

  /**
   * Actualizar contrato
   * PUT /api/groups/:id/status/contract
   */
  static async updateContract(req: Request, res: Response): Promise<void> {
    try {
      const groupId = parseInt(req.params.id)
      const userId = req.user?.id
      const { signed, date }: UpdateContractRequest = req.body

      if (!userId) {
        res.status(401).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        })
        return
      }

      if (signed === undefined) {
        res.status(400).json({
          success: false,
          error: ERROR_CODES.GROUP_STATUS_SIGNED_REQUIRED,
          code: ERROR_CODES.GROUP_STATUS_SIGNED_REQUIRED,
        })
        return
      }

      // Obtener estado anterior
      const oldStatus = await GroupStatusRepository.getByGroupId(groupId)

      // Actualizar contrato
      const updated = await GroupStatusRepository.updateContract(groupId, {
        signed,
        date,
      })

      if (!updated) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.GROUP_NOT_FOUND,
          code: ERROR_CODES.GROUP_NOT_FOUND,
        })
        return
      }

      // Registrar en historial
      await GroupHistoryService.logStatusChanged(
        groupId,
        userId,
        'contract_signed',
        oldStatus?.contract_signed,
        signed
      )

      res.json({
        success: true,
        message: SUCCESS_CODES.GROUP_CONTRACT_UPDATED,
        code: SUCCESS_CODES.GROUP_CONTRACT_UPDATED,
      })
    } catch (error) {
      logger.error({ err: error }, 'Error al actualizar contrato')
      res.status(500).json({
        success: false,
        error: ERROR_CODES.GROUP_STATUS_UPDATE_CONTRACT_ERROR,
        code: ERROR_CODES.GROUP_STATUS_UPDATE_CONTRACT_ERROR,
      })
    }
  }

  /**
   * Actualizar rooming list
   * PUT /api/groups/:id/status/rooming
   */
  static async updateRooming(req: Request, res: Response): Promise<void> {
    try {
      const groupId = parseInt(req.params.id)
      const userId = req.user?.id
      const roomingData: UpdateRoomingRequest = req.body

      if (!userId) {
        res.status(401).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        })
        return
      }

      // Obtener estado anterior
      const oldStatus = await GroupStatusRepository.getByGroupId(groupId)

      // Actualizar rooming
      const updated = await GroupStatusRepository.updateRooming(groupId, roomingData)

      if (!updated) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.GROUP_NOT_FOUND,
          code: ERROR_CODES.GROUP_NOT_FOUND,
        })
        return
      }

      // Registrar en historial si cambió el status
      if (roomingData.rooming_status && roomingData.rooming_status !== oldStatus?.rooming_status) {
        await GroupHistoryService.logStatusChanged(
          groupId,
          userId,
          'rooming_status',
          oldStatus?.rooming_status,
          roomingData.rooming_status
        )
      }

      res.json({
        success: true,
        message: SUCCESS_CODES.GROUP_ROOMING_UPDATED,
        code: SUCCESS_CODES.GROUP_ROOMING_UPDATED,
      })
    } catch (error) {
      logger.error({ err: error }, 'Error al actualizar rooming')
      res.status(500).json({
        success: false,
        error: ERROR_CODES.GROUP_STATUS_UPDATE_ROOMING_ERROR,
        code: ERROR_CODES.GROUP_STATUS_UPDATE_ROOMING_ERROR,
      })
    }
  }

  /**
   * Actualizar balance
   * PUT /api/groups/:id/status/balance
   */
  static async updateBalance(req: Request, res: Response): Promise<void> {
    try {
      const groupId = parseInt(req.params.id)
      const userId = req.user?.id
      const balanceData: UpdateBalanceRequest = req.body

      if (!userId) {
        res.status(401).json({
          success: false,
          error: ERROR_CODES.UNAUTHORIZED,
          code: ERROR_CODES.UNAUTHORIZED,
        })
        return
      }

      // Obtener estado anterior
      const oldStatus = await GroupStatusRepository.getByGroupId(groupId)

      // Actualizar balance
      const updated = await GroupStatusRepository.updateBalance(groupId, balanceData)

      if (!updated) {
        res.status(404).json({
          success: false,
          error: ERROR_CODES.GROUP_NOT_FOUND,
          code: ERROR_CODES.GROUP_NOT_FOUND,
        })
        return
      }

      // Registrar en historial si cambió el status
      if (balanceData.balance_status && balanceData.balance_status !== oldStatus?.balance_status) {
        await GroupHistoryService.logStatusChanged(
          groupId,
          userId,
          'balance_status',
          oldStatus?.balance_status,
          balanceData.balance_status
        )
      }

      res.json({
        success: true,
        message: SUCCESS_CODES.GROUP_BALANCE_UPDATED,
        code: SUCCESS_CODES.GROUP_BALANCE_UPDATED,
      })
    } catch (error) {
      logger.error({ err: error }, 'Error al actualizar balance')
      res.status(500).json({
        success: false,
        error: ERROR_CODES.GROUP_STATUS_UPDATE_BALANCE_ERROR,
        code: ERROR_CODES.GROUP_STATUS_UPDATE_BALANCE_ERROR,
      })
    }
  }
}
