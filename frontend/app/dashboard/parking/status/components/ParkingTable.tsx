// app/dashboard/parking/status/components/ParkingTable.tsx
'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { FiEdit2, FiXCircle, FiPlus, FiDollarSign } from 'react-icons/fi'
import { MdLocalParking } from 'react-icons/md'
import type { ParkingSpotDisplay, ParkingBooking } from '@/app/lib/parking/types'
import { StatusBadgeSpot } from '../utils/statusBadges'

interface ParkingTableProps {
  spots: ParkingSpotDisplay[]
  levelFromUrl?: string
  onCheckIn: (booking: ParkingBooking) => void
  onCheckOut: (booking: ParkingBooking) => void
  onCancel: (booking: ParkingBooking) => void
  onCreateBooking: (spot: ParkingSpotDisplay) => void
  onEdit: (booking: ParkingBooking) => void
  onPayment: (booking: ParkingBooking) => void
}

// Helper para determinar si el checkout es hoy
const isCheckoutToday = (checkout: string | undefined): boolean => {
  if (!checkout) return false
  const checkoutDate = new Date(checkout)
  const today = new Date()
  checkoutDate.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  return checkoutDate.getTime() === today.getTime()
}

// Componente de acciones reutilizable
function SpotActions({
  spot,
  onCheckIn,
  onCheckOut,
  onCancel,
  onCreateBooking,
  onEdit,
  onPayment,
  variant = 'default',
  t,
}: {
  spot: ParkingSpotDisplay
  onCheckIn: (booking: ParkingBooking) => void
  onCheckOut: (booking: ParkingBooking) => void
  onCancel: (booking: ParkingBooking) => void
  onCreateBooking: (spot: ParkingSpotDisplay) => void
  onEdit: (booking: ParkingBooking) => void
  onPayment: (booking: ParkingBooking) => void
  variant?: 'default' | 'mobile'
  t: ReturnType<typeof useTranslations<'parking'>>
}) {
  const isMobile = variant === 'mobile'
  const buttonClass = isMobile ? 'flex-1' : ''

  if (spot.status === 'checked_in' && spot.booking) {
    const checkoutIsToday = isCheckoutToday(spot.booking?.schedule?.expected_checkout)
    return (
      <div className={`flex items-center gap-2 ${isMobile ? 'w-full' : ''}`}>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onEdit(spot.booking!)
          }}
          className="p-2 text-fg-subtle hover:text-accent hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
          title={t('parkingTable.modify')}
        >
          <FiEdit2 className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onPayment(spot.booking!)
          }}
          className={`p-2 rounded-md transition-colors ${
            spot.booking.payment.pending_amount > 0
              ? 'text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20'
              : 'text-emerald-500 dark:text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
          }`}
          title={t('parkingTable.registerPayment')}
        >
          <FiDollarSign className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onCancel(spot.booking!)
          }}
          className="p-2 text-fg-subtle hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
          title={t('parkingTable.cancel')}
        >
          <FiXCircle className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onCheckOut(spot.booking!)
          }}
          className={`${buttonClass} px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            checkoutIsToday
              ? 'bg-amber-600 dark:bg-amber-700 text-white hover:bg-amber-700 dark:hover:bg-amber-600'
              : 'bg-surface-hover text-fg hover:bg-surface-hover border border-border'
          }`}
          title={t('parkingTable.checkOut')}
        >
          {t('parkingTable.checkOut')}
        </button>
      </div>
    )
  }

  if (spot.status === 'reserved' && spot.booking) {
    return (
      <div className={`flex items-center gap-2 ${isMobile ? 'w-full' : ''}`}>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onEdit(spot.booking!)
          }}
          className="p-2 text-fg-subtle hover:text-accent hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
          title={t('parkingTable.modify')}
        >
          <FiEdit2 className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onPayment(spot.booking!)
          }}
          className={`p-2 rounded-md transition-colors ${
            spot.booking.payment.pending_amount > 0
              ? 'text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20'
              : 'text-emerald-500 dark:text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
          }`}
          title={t('parkingTable.registerPayment')}
        >
          <FiDollarSign className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onCancel(spot.booking!)
          }}
          className="p-2 text-fg-subtle hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
          title={t('parkingTable.cancel')}
        >
          <FiXCircle className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onCheckIn(spot.booking!)
          }}
          className={`${buttonClass} px-3 py-1.5 text-xs font-medium bg-accent text-accent-fg rounded-md hover:bg-accent-hover dark:hover:bg-accent-hover transition-colors`}
          title={t('parkingTable.checkIn')}
        >
          {t('parkingTable.checkIn')}
        </button>
      </div>
    )
  }

  if (spot.status === 'free') {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation()
          onCreateBooking(spot)
        }}
        className={`${isMobile ? 'w-full' : ''} inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-400 bg-info/10 border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors`}
        title={t('parkingTable.reserve')}
      >
        <FiPlus className="w-3.5 h-3.5" />
        {t('parkingTable.reserve')}
      </button>
    )
  }

  return <span className="text-xs text-fg-subtle">-</span>
}

export default function ParkingTable({
  spots,
  levelFromUrl = 'all',
  onCheckIn,
  onCheckOut,
  onCancel,
  onCreateBooking,
  onEdit,
  onPayment,
}: ParkingTableProps) {
  const t = useTranslations('parking')

  return (
    <>
      {/* Table - Desktop */}
      <div className="hidden md:block bg-surface rounded-md border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-sunken border-b border-border">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-fg uppercase tracking-wider">
                  {t('parkingTable.spot')}
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-fg uppercase tracking-wider">
                  {t('parkingTable.status')}
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-fg uppercase tracking-wider">
                  {t('parkingTable.clientVehicle')}
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-fg uppercase tracking-wider">
                  {t('parkingTable.entry')}
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-fg uppercase tracking-wider">
                  {t('parkingTable.exit')}
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-fg uppercase tracking-wider">
                  {t('parkingTable.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {spots.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-xs text-fg-subtle">
                    {t('parkingTable.noSpotsToShow')}
                  </td>
                </tr>
              ) : (
                spots.map((spot, index) => {
                  const prevSpot = spots[index - 1]
                  const isNewLevel = !prevSpot || prevSpot.level_code !== spot.level_code

                  return (
                    <React.Fragment key={spot.id}>
                      {isNewLevel && levelFromUrl === 'all' && index > 0 && (
                        <tr className="bg-gray-50 dark:bg-surface">
                          <td colSpan={6} className="px-3 py-2">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-px bg-border" />
                            </div>
                          </td>
                        </tr>
                      )}

                      <tr className="hover:bg-surface-hover transition-colors">
                        <td className="px-3 py-2">
                          <div>
                            <p className="text-xs font-semibold text-fg">
                              {spot.level_code.replace('-', '')} · {spot.spot_number}
                            </p>
                            <p className="text-[10px] text-fg-subtle capitalize">
                              {t(`spotTypes.${spot.spot_type}` as Parameters<typeof t>[0]) ||
                                spot.spot_type.replace('_', ' ')}
                            </p>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadgeSpot status={spot.status} />
                        </td>
                        <td className="px-3 py-2 max-w-xs">
                          {spot.booking?.vehicle ? (
                            <div>
                              <p className="text-xs font-medium text-fg truncate">
                                {spot.booking.vehicle.owner}
                              </p>
                              <p className="text-[10px] text-fg-subtle truncate">
                                {spot.booking.vehicle.model} · {spot.booking.vehicle.plate}
                              </p>
                            </div>
                          ) : (
                            <span className="text-[10px] text-fg-subtle">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {spot.booking?.schedule ? (
                            <span className="text-xs text-fg-muted">
                              {new Date(spot.booking.schedule.expected_checkin).toLocaleDateString(
                                'es-ES',
                                {
                                  day: '2-digit',
                                  month: '2-digit',
                                }
                              )}
                            </span>
                          ) : (
                            <span className="text-[10px] text-fg-subtle">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {spot.booking?.schedule ? (
                            <span className="text-xs text-fg-muted">
                              {new Date(spot.booking.schedule.expected_checkout).toLocaleDateString(
                                'es-ES',
                                {
                                  day: '2-digit',
                                  month: '2-digit',
                                }
                              )}
                            </span>
                          ) : (
                            <span className="text-[10px] text-fg-subtle">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <SpotActions
                            spot={spot}
                            onCheckIn={onCheckIn}
                            onCheckOut={onCheckOut}
                            onCancel={onCancel}
                            onCreateBooking={onCreateBooking}
                            onEdit={onEdit}
                            onPayment={onPayment}
                            t={t}
                          />
                        </td>
                      </tr>
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cards - Mobile */}
      <div className="md:hidden flex flex-col gap-4 pb-4">
        {spots.length === 0 ? (
          <div className="bg-surface rounded-xl border-2 border-border p-8 text-center">
            <MdLocalParking className="w-12 h-12 text-fg-subtle mx-auto mb-3" />
            <p className="text-xs text-fg-subtle">{t('parkingTable.noSpotsToShow')}</p>
          </div>
        ) : (
          spots.map((spot, index) => {
            const prevSpot = spots[index - 1]
            const isNewLevel = !prevSpot || prevSpot.level_code !== spot.level_code

            return (
              <React.Fragment key={spot.id}>
                {/* Separador de nivel */}
                {isNewLevel && levelFromUrl === 'all' && index > 0 && (
                  <div className="flex items-center gap-3 py-2 my-1">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[10px] font-semibold text-fg-subtle uppercase tracking-wide px-2">
                      {t('parkingTable.level', { level: spot.level_code.replace('-', '') })}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                )}

                <div className="bg-surface rounded-xl border-2 border-border overflow-hidden shadow-md dark:shadow-black/20">
                  {/* Header compacto */}
                  <div className="flex items-center justify-between px-3 py-2.5 bg-surface-hover border-b-2 border-border">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-fg">
                        {spot.level_code.replace('-', '')} · {spot.spot_number}
                      </span>
                      <StatusBadgeSpot status={spot.status} />
                    </div>
                    <span className="text-[10px] text-fg-subtle capitalize">
                      {t(`spotTypes.${spot.spot_type}` as Parameters<typeof t>[0]) ||
                        spot.spot_type.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Contenido */}
                  <div className="px-3 py-3">
                    {/* Cliente/Vehículo y fechas - Solo si hay booking */}
                    {spot.booking?.vehicle ? (
                      <div className="flex items-center justify-between mb-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-fg truncate">
                            {spot.booking.vehicle.owner}
                          </p>
                          <p className="text-[10px] text-fg-subtle">
                            {spot.booking.vehicle.model} · {spot.booking.vehicle.plate}
                          </p>
                        </div>
                        {/* Fechas */}
                        {spot.booking?.schedule && (
                          <div className="text-right text-[10px] ml-3 flex-shrink-0 bg-surface-hover px-2 py-1 rounded-md border border-border">
                            <span className="text-fg font-medium">
                              {new Date(spot.booking.schedule.expected_checkin).toLocaleDateString(
                                'es-ES',
                                { day: '2-digit', month: '2-digit' }
                              )}
                            </span>
                            <span className="text-fg-subtle mx-1">→</span>
                            <span className="text-fg font-medium">
                              {new Date(spot.booking.schedule.expected_checkout).toLocaleDateString(
                                'es-ES',
                                { day: '2-digit', month: '2-digit' }
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : null}

                    {/* Acciones - layout compacto */}
                    <div className="flex items-center justify-between gap-2">
                      {spot.status === 'checked_in' && spot.booking && (
                        <>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onEdit(spot.booking!)
                              }}
                              className="p-1.5 text-fg-subtle hover:text-accent hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                              title={t('parkingTable.modify')}
                            >
                              <FiEdit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onPayment(spot.booking!)
                              }}
                              className={`p-1.5 rounded transition-colors ${
                                spot.booking.payment.pending_amount > 0
                                  ? 'text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20'
                                  : 'text-emerald-500 dark:text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                              }`}
                              title={t('parkingTable.registerPayment')}
                            >
                              <FiDollarSign className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onCancel(spot.booking!)
                              }}
                              className="p-1.5 text-fg-subtle hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                              title={t('parkingTable.cancel')}
                            >
                              <FiXCircle className="w-4 h-4" />
                            </button>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onCheckOut(spot.booking!)
                            }}
                            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                              isCheckoutToday(spot.booking?.schedule?.expected_checkout)
                                ? 'bg-amber-600 text-white hover:bg-amber-700'
                                : 'bg-surface-hover text-fg hover:bg-border'
                            }`}
                          >
                            {t('parkingTable.checkOut')}
                          </button>
                        </>
                      )}

                      {spot.status === 'reserved' && spot.booking && (
                        <>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onEdit(spot.booking!)
                              }}
                              className="p-1.5 text-fg-subtle hover:text-accent hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                              title={t('parkingTable.modify')}
                            >
                              <FiEdit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onPayment(spot.booking!)
                              }}
                              className={`p-1.5 rounded transition-colors ${
                                spot.booking.payment.pending_amount > 0
                                  ? 'text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20'
                                  : 'text-emerald-500 dark:text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                              }`}
                              title={t('parkingTable.registerPayment')}
                            >
                              <FiDollarSign className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onCancel(spot.booking!)
                              }}
                              className="p-1.5 text-fg-subtle hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                              title={t('parkingTable.cancel')}
                            >
                              <FiXCircle className="w-4 h-4" />
                            </button>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onCheckIn(spot.booking!)
                            }}
                            className="px-3 py-1.5 text-xs font-medium bg-accent text-accent-fg rounded hover:bg-accent-hover transition-colors"
                          >
                            {t('parkingTable.checkIn')}
                          </button>
                        </>
                      )}

                      {spot.status === 'free' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onCreateBooking(spot)
                          }}
                          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                        >
                          <FiPlus className="w-3.5 h-3.5" />
                          {t('parkingTable.reserve')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            )
          })
        )}
      </div>
    </>
  )
}
