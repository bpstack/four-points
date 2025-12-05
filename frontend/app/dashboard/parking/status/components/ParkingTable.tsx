// app/dashboard/parking/status/components/ParkingTable.tsx
'use client'

import React from 'react'
import { FiEdit2, FiXCircle, FiPlus } from 'react-icons/fi'
import { MdLocalParking } from 'react-icons/md'
import { toast } from 'react-hot-toast'
import type { ParkingSpotDisplay, ParkingBooking } from '@/app/lib/parking/types'
import { getStatusBadge } from '../utils/statusBadges'

interface ParkingTableProps {
  spots: ParkingSpotDisplay[]
  levelFromUrl?: string
  onCheckIn: (booking: ParkingBooking) => void
  onCheckOut: (booking: ParkingBooking) => void
  onCancel: (booking: ParkingBooking) => void
  onCreateBooking: (spot: ParkingSpotDisplay) => void
}

export default function ParkingTable({
  spots,
  levelFromUrl = 'all',
  onCheckIn,
  onCheckOut,
  onCancel,
  onCreateBooking,
}: ParkingTableProps) {
  return (
    <div className="bg-[#f6f8fa] dark:bg-[#0d1117] border-2 border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-lg">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-slate-800/60 dark:to-slate-900/60 border-b-2 border-gray-200 dark:border-gray-800">
            <tr>
              <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Plaza
              </th>
              <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Cliente/Vehículo
              </th>
              <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Entrada
              </th>
              <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Salida
              </th>
              <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {spots.map((spot, index) => {
              const prevSpot = spots[index - 1]
              const isNewLevel = !prevSpot || prevSpot.level_code !== spot.level_code

              return (
                <React.Fragment key={spot.id}>
                  {isNewLevel && levelFromUrl === 'all' && index > 0 && (
                    <tr className="bg-gradient-to-r from-indigo-50 via-blue-50 to-indigo-50 dark:from-indigo-950/30 dark:via-blue-950/30 dark:to-indigo-950/30">
                      <td colSpan={6} className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-indigo-300 dark:via-indigo-700 to-transparent" />
                          <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider"></span>
                          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-indigo-300 dark:via-indigo-700 to-transparent" />
                        </div>
                      </td>
                    </tr>
                  )}

                  <tr className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-all duration-150">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                          {spot.level_code.replace('-', '')} · {spot.spot_number}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize font-medium">
                          {spot.spot_type.replace('_', ' ')}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">{getStatusBadge(spot.status)}</td>
                    <td className="px-5 py-4 max-w-xs">
                      {spot.booking?.vehicle ? (
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {spot.booking.vehicle.owner}
                          </p>
                          <p className="text-xs font-mono text-gray-500 dark:text-gray-400 truncate">
                            {spot.booking.vehicle.model} • {spot.booking.vehicle.plate}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                          Sin datos
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {spot.booking?.schedule ? (
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          {new Date(spot.booking.schedule.expected_checkin).toLocaleDateString(
                            'es-ES',
                            {
                              day: '2-digit',
                              month: '2-digit',
                            }
                          )}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {spot.booking?.schedule ? (
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          {new Date(spot.booking.schedule.expected_checkout).toLocaleDateString(
                            'es-ES',
                            {
                              day: '2-digit',
                              month: '2-digit',
                            }
                          )}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {spot.status === 'checked_in' && spot.booking && (
                          <>
                            <button
                              onClick={() =>
                                toast('Función de modificar (próximamente)', { icon: 'ℹ️' })
                              }
                              className="p-2 text-gray-500 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-lg transition-all duration-200"
                              title="Modificar"
                            >
                              <FiEdit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onCancel(spot.booking!)}
                              className="p-2 text-gray-500 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all duration-200"
                              title="Cancelar"
                            >
                              <FiXCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onCheckOut(spot.booking!)}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 shadow-sm border ${(() => {
                                const checkout = spot.booking?.schedule?.expected_checkout
                                if (!checkout)
                                  return 'text-amber-700 dark:text-amber-300 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 hover:from-amber-200 hover:to-orange-200 dark:hover:from-amber-900/40 dark:hover:to-orange-900/40 border-amber-300 dark:border-amber-800'

                                const checkoutDate = new Date(checkout)
                                const today = new Date()
                                checkoutDate.setHours(0, 0, 0, 0)
                                today.setHours(0, 0, 0, 0)
                                const isToday = checkoutDate.getTime() === today.getTime()

                                return isToday
                                  ? 'text-amber-700 dark:text-amber-300 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 hover:from-amber-200 hover:to-orange-200 dark:hover:from-amber-900/40 dark:hover:to-orange-900/40 border-amber-300 dark:border-amber-800'
                                  : 'text-gray-700 dark:text-gray-300 bg-gradient-to-r from-gray-100 to-slate-100 dark:from-gray-800/30 dark:to-slate-800/30 hover:from-gray-200 hover:to-slate-200 dark:hover:from-gray-800/40 dark:hover:to-slate-800/40 border-gray-300 dark:border-gray-700'
                              })()}`}
                              title="Dar Salida"
                            >
                              Salida
                            </button>
                          </>
                        )}

                        {spot.status === 'reserved' && spot.booking && (
                          <>
                            <button
                              onClick={() =>
                                toast('Función de modificar (próximamente)', { icon: 'ℹ️' })
                              }
                              className="p-2 text-gray-500 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-lg transition-all duration-200"
                              title="Modificar"
                            >
                              <FiEdit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onCancel(spot.booking!)}
                              className="p-2 text-gray-500 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all duration-200"
                              title="Cancelar"
                            >
                              <FiXCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onCheckIn(spot.booking!)}
                              className="px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 hover:from-emerald-200 hover:to-teal-200 dark:hover:from-emerald-900/40 dark:hover:to-teal-900/40 border border-emerald-300 dark:border-emerald-800 rounded-lg transition-all duration-200 shadow-sm"
                              title="Dar Entrada"
                            >
                              Entrada
                            </button>
                          </>
                        )}

                        {spot.status === 'free' && (
                          <button
                            onClick={() => onCreateBooking(spot)}
                            className="px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-gradient-to-r from-indigo-100 to-blue-100 dark:from-indigo-900/30 dark:to-blue-900/30 hover:from-indigo-200 hover:to-blue-200 dark:hover:from-indigo-900/40 dark:hover:to-blue-900/40 border border-indigo-300 dark:border-indigo-800 rounded-lg transition-all duration-200 shadow-sm flex items-center gap-1.5"
                            title="Crear Reserva"
                          >
                            <FiPlus className="w-3.5 h-3.5" />
                            Reservar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {spots.length === 0 && (
        <div className="p-16 text-center">
          <MdLocalParking className="w-20 h-20 text-gray-300 dark:text-slate-700 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No hay plazas para mostrar</p>
        </div>
      )}
    </div>
  )
}

// // app/dashboard/parking/status/components/ParkingTable.tsx

// 'use client'

// import React from 'react'
// import { FiEdit2, FiXCircle, FiPlus, FiCalendar, FiUser, FiTruck } from 'react-icons/fi'
// import { MdLocalParking } from 'react-icons/md'
// import { toast } from 'react-hot-toast'
// import type { ParkingSpotDisplay, ParkingBooking } from '@/app/lib/parking/types'
// import { getStatusBadge } from '../utils/statusBadges'

// interface ParkingTableProps {
//   spots: ParkingSpotDisplay[]
//   levelFromUrl?: string
//   onCheckIn: (booking: ParkingBooking) => void
//   onCheckOut: (booking: ParkingBooking) => void
//   onCancel: (booking: ParkingBooking) => void
//   onCreateBooking: (spot: ParkingSpotDisplay) => void
// }

// export default function ParkingTable({
//   spots,
//   levelFromUrl = 'all',
//   onCheckIn,
//   onCheckOut,
//   onCancel,
//   onCreateBooking,
// }: ParkingTableProps) {
//   return (
//     <>
//       {/* 📱 VISTA MOBILE - Cards */}
//       <div className="lg:hidden space-y-3">
//         {spots.map((spot, index) => {
//           const prevSpot = spots[index - 1]
//           const isNewLevel = !prevSpot || prevSpot.level_code !== spot.level_code

//           return (
//             <React.Fragment key={spot.id}>
//               {/* Separador de nivel */}
//               {isNewLevel && levelFromUrl === 'all' && index > 0 && (
//                 <div className="flex items-center gap-3 py-4">
//                   <div className="flex-1 h-px bg-gradient-to-r from-transparent via-indigo-300 dark:via-indigo-700 to-transparent" />
//                 </div>
//               )}

//               {/* Card de plaza */}
//               <div className="bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm">
//                 {/* Header */}
//                 <div className="flex items-start justify-between mb-3">
//                   <div>
//                     <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
//                       {spot.level_code.replace('-', '')} · {spot.spot_number}
//                     </h3>
//                     <p className="text-xs text-gray-500 dark:text-gray-400 capitalize font-medium mt-0.5">
//                       {spot.spot_type.replace('_', ' ')}
//                     </p>
//                   </div>
//                   {getStatusBadge(spot.status)}
//                 </div>

//                 {/* Info del cliente */}
//                 {spot.booking?.vehicle ? (
//                   <div className="space-y-2 mb-3 pb-3 border-b border-gray-100 dark:border-gray-800">
//                     <div className="flex items-center gap-2 text-sm">
//                       <FiUser className="w-4 h-4 text-gray-400" />
//                       <span className="font-semibold text-gray-900 dark:text-gray-100">
//                         {spot.booking.vehicle.owner}
//                       </span>
//                     </div>
//                     <div className="flex items-center gap-2 text-xs">
//                       <FiTruck className="w-4 h-4 text-gray-400" />
//                       <span className="font-mono text-gray-600 dark:text-gray-400">
//                         {spot.booking.vehicle.model} • {spot.booking.vehicle.plate}
//                       </span>
//                     </div>
//                   </div>
//                 ) : (
//                   <div className="mb-3 pb-3 border-b border-gray-100 dark:border-gray-800">
//                     <span className="text-xs text-gray-400 dark:text-gray-500 italic">
//                       Sin datos de cliente
//                     </span>
//                   </div>
//                 )}

//                 {/* Fechas */}
//                 {spot.booking?.schedule && (
//                   <div className="flex items-center gap-4 mb-3 text-xs">
//                     <div className="flex items-center gap-2">
//                       <FiCalendar className="w-4 h-4 text-gray-400" />
//                       <span className="text-gray-600 dark:text-gray-400">
//                         {new Date(spot.booking.schedule.expected_checkin).toLocaleDateString(
//                           'es-ES',
//                           {
//                             day: '2-digit',
//                             month: '2-digit',
//                           }
//                         )}
//                       </span>
//                     </div>
//                     <span className="text-gray-400">→</span>
//                     <div className="flex items-center gap-2">
//                       <span className="text-gray-600 dark:text-gray-400">
//                         {new Date(spot.booking.schedule.expected_checkout).toLocaleDateString(
//                           'es-ES',
//                           {
//                             day: '2-digit',
//                             month: '2-digit',
//                           }
//                         )}
//                       </span>
//                     </div>
//                   </div>
//                 )}

//                 {/* Acciones */}
//                 <div className="flex items-center gap-2 flex-wrap">
//                   {spot.status === 'checked_in' && spot.booking && (
//                     <>
//                       <button
//                         onClick={() => toast('Función de modificar (próximamente)', { icon: 'ℹ️' })}
//                         className="p-2 text-gray-500 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-lg transition-all duration-200"
//                         title="Modificar"
//                       >
//                         <FiEdit2 className="w-4 h-4" />
//                       </button>
//                       <button
//                         onClick={() => onCancel(spot.booking!)}
//                         className="p-2 text-gray-500 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all duration-200"
//                         title="Cancelar"
//                       >
//                         <FiXCircle className="w-4 h-4" />
//                       </button>
//                       <button
//                         onClick={() => onCheckOut(spot.booking!)}
//                         className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 shadow-sm border ${(() => {
//                           const checkout = spot.booking?.schedule?.expected_checkout
//                           if (!checkout)
//                             return 'text-amber-700 dark:text-amber-300 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 hover:from-amber-200 hover:to-orange-200 dark:hover:from-amber-900/40 dark:hover:to-orange-900/40 border-amber-300 dark:border-amber-800'

//                           const checkoutDate = new Date(checkout)
//                           const today = new Date()
//                           checkoutDate.setHours(0, 0, 0, 0)
//                           today.setHours(0, 0, 0, 0)
//                           const isToday = checkoutDate.getTime() === today.getTime()

//                           return isToday
//                             ? 'text-amber-700 dark:text-amber-300 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 hover:from-amber-200 hover:to-orange-200 dark:hover:from-amber-900/40 dark:hover:to-orange-900/40 border-amber-300 dark:border-amber-800'
//                             : 'text-gray-700 dark:text-gray-300 bg-gradient-to-r from-gray-100 to-slate-100 dark:from-gray-800/30 dark:to-slate-800/30 hover:from-gray-200 hover:to-slate-200 dark:hover:from-gray-800/40 dark:hover:to-slate-800/40 border-gray-300 dark:border-gray-700'
//                         })()}`}
//                       >
//                         Dar Salida
//                       </button>
//                     </>
//                   )}

//                   {spot.status === 'reserved' && spot.booking && (
//                     <>
//                       <button
//                         onClick={() => toast('Función de modificar (próximamente)', { icon: 'ℹ️' })}
//                         className="p-2 text-gray-500 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-lg transition-all duration-200"
//                         title="Modificar"
//                       >
//                         <FiEdit2 className="w-4 h-4" />
//                       </button>
//                       <button
//                         onClick={() => onCancel(spot.booking!)}
//                         className="p-2 text-gray-500 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all duration-200"
//                         title="Cancelar"
//                       >
//                         <FiXCircle className="w-4 h-4" />
//                       </button>
//                       <button
//                         onClick={() => onCheckIn(spot.booking!)}
//                         className="flex-1 px-4 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300 bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 hover:from-emerald-200 hover:to-teal-200 dark:hover:from-emerald-900/40 dark:hover:to-teal-900/40 border border-emerald-300 dark:border-emerald-800 rounded-lg transition-all duration-200 shadow-sm"
//                       >
//                         Dar Entrada
//                       </button>
//                     </>
//                   )}

//                   {spot.status === 'free' && (
//                     <button
//                       onClick={() => onCreateBooking(spot)}
//                       className="w-full px-4 py-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300 bg-gradient-to-r from-indigo-100 to-blue-100 dark:from-indigo-900/30 dark:to-blue-900/30 hover:from-indigo-200 hover:to-blue-200 dark:hover:from-indigo-900/40 dark:hover:to-blue-900/40 border border-indigo-300 dark:border-indigo-800 rounded-lg transition-all duration-200 shadow-sm flex items-center justify-center gap-2"
//                     >
//                       <FiPlus className="w-4 h-4" />
//                       Crear Reserva
//                     </button>
//                   )}
//                 </div>
//               </div>
//             </React.Fragment>
//           )
//         })}

//         {spots.length === 0 && (
//           <div className="p-16 text-center bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-gray-800 rounded-xl">
//             <MdLocalParking className="w-20 h-20 text-gray-300 dark:text-slate-700 mx-auto mb-4" />
//             <p className="text-gray-500 dark:text-gray-400 font-medium">
//               No hay plazas para mostrar
//             </p>
//           </div>
//         )}
//       </div>

//       {/* 💻 VISTA DESKTOP - Tabla */}
//       <div className="hidden lg:block bg-[#f6f8fa] dark:bg-[#0d1117] border-2 border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-lg">
//         <div className="overflow-x-auto">
//           <table className="w-full text-sm">
//             <thead className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-slate-800/60 dark:to-slate-900/60 border-b-2 border-gray-200 dark:border-gray-800">
//               <tr>
//                 <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
//                   Plaza
//                 </th>
//                 <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
//                   Estado
//                 </th>
//                 <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
//                   Cliente/Vehículo
//                 </th>
//                 <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
//                   Entrada
//                 </th>
//                 <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
//                   Salida
//                 </th>
//                 <th className="px-5 py-4 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
//                   Acciones
//                 </th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
//               {spots.map((spot, index) => {
//                 const prevSpot = spots[index - 1]
//                 const isNewLevel = !prevSpot || prevSpot.level_code !== spot.level_code

//                 return (
//                   <React.Fragment key={spot.id}>
//                     {isNewLevel && levelFromUrl === 'all' && index > 0 && (
//                       <tr className="bg-gradient-to-r from-indigo-50 via-blue-50 to-indigo-50 dark:from-indigo-950/30 dark:via-blue-950/30 dark:to-indigo-950/30">
//                         <td colSpan={6} className="px-5 py-4">
//                           <div className="flex items-center gap-3">
//                             <div className="flex-1 h-px bg-gradient-to-r from-transparent via-indigo-300 dark:via-indigo-700 to-transparent" />
//                             <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider"></span>
//                             <div className="flex-1 h-px bg-gradient-to-r from-transparent via-indigo-300 dark:via-indigo-700 to-transparent" />
//                           </div>
//                         </td>
//                       </tr>
//                     )}

//                     <tr className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-all duration-150">
//                       <td className="px-5 py-4 whitespace-nowrap">
//                         <div>
//                           <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
//                             {spot.level_code.replace('-', '')} · {spot.spot_number}
//                           </p>
//                           <p className="text-xs text-gray-500 dark:text-gray-400 capitalize font-medium">
//                             {spot.spot_type.replace('_', ' ')}
//                           </p>
//                         </div>
//                       </td>
//                       <td className="px-5 py-4 whitespace-nowrap">{getStatusBadge(spot.status)}</td>
//                       <td className="px-5 py-4 max-w-xs">
//                         {spot.booking?.vehicle ? (
//                           <div>
//                             <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
//                               {spot.booking.vehicle.owner}
//                             </p>
//                             <p className="text-xs font-mono text-gray-500 dark:text-gray-400 truncate">
//                               {spot.booking.vehicle.model} • {spot.booking.vehicle.plate}
//                             </p>
//                           </div>
//                         ) : (
//                           <span className="text-xs text-gray-400 dark:text-gray-500 italic">
//                             Sin datos
//                           </span>
//                         )}
//                       </td>
//                       <td className="px-5 py-4 whitespace-nowrap">
//                         {spot.booking?.schedule ? (
//                           <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
//                             {new Date(spot.booking.schedule.expected_checkin).toLocaleDateString(
//                               'es-ES',
//                               {
//                                 day: '2-digit',
//                                 month: '2-digit',
//                               }
//                             )}
//                           </span>
//                         ) : (
//                           <span className="text-xs text-gray-400">-</span>
//                         )}
//                       </td>
//                       <td className="px-5 py-4 whitespace-nowrap">
//                         {spot.booking?.schedule ? (
//                           <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
//                             {new Date(spot.booking.schedule.expected_checkout).toLocaleDateString(
//                               'es-ES',
//                               {
//                                 day: '2-digit',
//                                 month: '2-digit',
//                               }
//                             )}
//                           </span>
//                         ) : (
//                           <span className="text-xs text-gray-400">-</span>
//                         )}
//                       </td>
//                       <td className="px-5 py-4 whitespace-nowrap">
//                         <div className="flex items-center gap-2">
//                           {spot.status === 'checked_in' && spot.booking && (
//                             <>
//                               <button
//                                 onClick={() =>
//                                   toast('Función de modificar (próximamente)', { icon: 'ℹ️' })
//                                 }
//                                 className="p-2 text-gray-500 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-lg transition-all duration-200"
//                                 title="Modificar"
//                               >
//                                 <FiEdit2 className="w-4 h-4" />
//                               </button>
//                               <button
//                                 onClick={() => onCancel(spot.booking!)}
//                                 className="p-2 text-gray-500 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all duration-200"
//                                 title="Cancelar"
//                               >
//                                 <FiXCircle className="w-4 h-4" />
//                               </button>
//                               <button
//                                 onClick={() => onCheckOut(spot.booking!)}
//                                 className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 shadow-sm border ${(() => {
//                                   const checkout = spot.booking?.schedule?.expected_checkout
//                                   if (!checkout)
//                                     return 'text-amber-700 dark:text-amber-300 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 hover:from-amber-200 hover:to-orange-200 dark:hover:from-amber-900/40 dark:hover:to-orange-900/40 border-amber-300 dark:border-amber-800'

//                                   const checkoutDate = new Date(checkout)
//                                   const today = new Date()
//                                   checkoutDate.setHours(0, 0, 0, 0)
//                                   today.setHours(0, 0, 0, 0)
//                                   const isToday = checkoutDate.getTime() === today.getTime()

//                                   return isToday
//                                     ? 'text-amber-700 dark:text-amber-300 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 hover:from-amber-200 hover:to-orange-200 dark:hover:from-amber-900/40 dark:hover:to-orange-900/40 border-amber-300 dark:border-amber-800'
//                                     : 'text-gray-700 dark:text-gray-300 bg-gradient-to-r from-gray-100 to-slate-100 dark:from-gray-800/30 dark:to-slate-800/30 hover:from-gray-200 hover:to-slate-200 dark:hover:from-gray-800/40 dark:hover:to-slate-800/40 border-gray-300 dark:border-gray-700'
//                                 })()}`}
//                                 title="Dar Salida"
//                               >
//                                 Salida
//                               </button>
//                             </>
//                           )}

//                           {spot.status === 'reserved' && spot.booking && (
//                             <>
//                               <button
//                                 onClick={() =>
//                                   toast('Función de modificar (próximamente)', { icon: 'ℹ️' })
//                                 }
//                                 className="p-2 text-gray-500 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-lg transition-all duration-200"
//                                 title="Modificar"
//                               >
//                                 <FiEdit2 className="w-4 h-4" />
//                               </button>
//                               <button
//                                 onClick={() => onCancel(spot.booking!)}
//                                 className="p-2 text-gray-500 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all duration-200"
//                                 title="Cancelar"
//                               >
//                                 <FiXCircle className="w-4 h-4" />
//                               </button>
//                               <button
//                                 onClick={() => onCheckIn(spot.booking!)}
//                                 className="px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 hover:from-emerald-200 hover:to-teal-200 dark:hover:from-emerald-900/40 dark:hover:to-teal-900/40 border border-emerald-300 dark:border-emerald-800 rounded-lg transition-all duration-200 shadow-sm"
//                                 title="Dar Entrada"
//                               >
//                                 Entrada
//                               </button>
//                             </>
//                           )}

//                           {spot.status === 'free' && (
//                             <button
//                               onClick={() => onCreateBooking(spot)}
//                               className="px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-gradient-to-r from-indigo-100 to-blue-100 dark:from-indigo-900/30 dark:to-blue-900/30 hover:from-indigo-200 hover:to-blue-200 dark:hover:from-indigo-900/40 dark:hover:to-blue-900/40 border border-indigo-300 dark:border-indigo-800 rounded-lg transition-all duration-200 shadow-sm flex items-center gap-1.5"
//                               title="Crear Reserva"
//                             >
//                               <FiPlus className="w-3.5 h-3.5" />
//                               Reservar
//                             </button>
//                           )}
//                         </div>
//                       </td>
//                     </tr>
//                   </React.Fragment>
//                 )
//               })}
//             </tbody>
//           </table>
//         </div>

//         {spots.length === 0 && (
//           <div className="p-16 text-center">
//             <MdLocalParking className="w-20 h-20 text-gray-300 dark:text-slate-700 mx-auto mb-4" />
//             <p className="text-gray-500 dark:text-gray-400 font-medium">
//               No hay plazas para mostrar
//             </p>
//           </div>
//         )}
//       </div>
//     </>
//   )
// }
