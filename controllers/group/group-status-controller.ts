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
        res.status(404).json({ error: 'Estado no encontrado' })
        return
      }

      res.json(status)
    } catch (error) {
      console.error('Error al obtener estado:', error)
      res.status(500).json({ error: 'Error al obtener el estado del grupo' })
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
        res.status(401).json({ error: 'Usuario no autenticado' })
        return
      }

      if (confirmed === undefined) {
        res.status(400).json({ error: 'El campo "confirmed" es requerido' })
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
        res.status(404).json({ error: 'Grupo no encontrado' })
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
        message: 'Booking actualizado correctamente',
      })
    } catch (error) {
      console.error('Error al actualizar booking:', error)
      res.status(500).json({ error: 'Error al actualizar el booking' })
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
        res.status(401).json({ error: 'Usuario no autenticado' })
        return
      }

      if (signed === undefined) {
        res.status(400).json({ error: 'El campo "signed" es requerido' })
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
        res.status(404).json({ error: 'Grupo no encontrado' })
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
        message: 'Contrato actualizado correctamente',
      })
    } catch (error) {
      console.error('Error al actualizar contrato:', error)
      res.status(500).json({ error: 'Error al actualizar el contrato' })
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
        res.status(401).json({ error: 'Usuario no autenticado' })
        return
      }

      // Obtener estado anterior
      const oldStatus = await GroupStatusRepository.getByGroupId(groupId)

      // Actualizar rooming
      const updated = await GroupStatusRepository.updateRooming(
        groupId,
        roomingData
      )

      if (!updated) {
        res.status(404).json({ error: 'Grupo no encontrado' })
        return
      }

      // Registrar en historial si cambió el status
      if (
        roomingData.rooming_status &&
        roomingData.rooming_status !== oldStatus?.rooming_status
      ) {
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
        message: 'Rooming list actualizada correctamente',
      })
    } catch (error) {
      console.error('Error al actualizar rooming:', error)
      res.status(500).json({ error: 'Error al actualizar la rooming list' })
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
        res.status(401).json({ error: 'Usuario no autenticado' })
        return
      }

      // Obtener estado anterior
      const oldStatus = await GroupStatusRepository.getByGroupId(groupId)

      // Actualizar balance
      const updated = await GroupStatusRepository.updateBalance(
        groupId,
        balanceData
      )

      if (!updated) {
        res.status(404).json({ error: 'Grupo no encontrado' })
        return
      }

      // Registrar en historial si cambió el status
      if (
        balanceData.balance_status &&
        balanceData.balance_status !== oldStatus?.balance_status
      ) {
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
        message: 'Balance actualizado correctamente',
      })
    } catch (error) {
      console.error('Error al actualizar balance:', error)
      res.status(500).json({ error: 'Error al actualizar el balance' })
    }
  }
}
