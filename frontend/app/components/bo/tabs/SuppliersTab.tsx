// app/components/bo/tabs/SuppliersTab.tsx

'use client'

import { useState } from 'react'
import {
  FiSearch,
  FiPlus,
  FiEdit2,
  FiChevronRight,
  FiFileText,
  FiCalendar,
  FiDollarSign,
  FiPhone,
  FiMail,
  FiMapPin,
} from 'react-icons/fi'

// Types based on Excel "PROVEED" sheet
type Periodicity = 'monthly' | 'quarterly' | 'annual' | 'on_demand'

interface Supplier {
  id: number
  name: string
  periodicity: Periodicity
  costCenter: string
  department: string
  lastInvoice?: string
  ytdTotal: number
  invoiceCount: number
  notes?: string
  contact?: {
    phone?: string
    email?: string
    address?: string
  }
  isDomiciled: boolean
}

// Mock data based on Excel "PROVEED" sheet
const mockSuppliers: Supplier[] = [
  {
    id: 1,
    name: 'ADYEN',
    periodicity: 'monthly',
    costCenter: 'GASTOS ADMINISTRACIÓN',
    department: 'ADMINISTRACIÓN',
    lastInvoice: '2025-06-01',
    ytdTotal: 1815.0,
    invoiceCount: 6,
    isDomiciled: true,
  },
  {
    id: 2,
    name: 'ACTIVH2O',
    periodicity: 'monthly',
    costCenter: 'MANTENIMIENTO',
    department: 'REPARACIONES Y MATERIALES',
    lastInvoice: '2025-06-05',
    ytdTotal: 2075.7,
    invoiceCount: 6,
    notes: '345.95€/mes',
    isDomiciled: false,
  },
  {
    id: 3,
    name: 'BOOKING',
    periodicity: 'monthly',
    costCenter: 'ALOJAMIENTO',
    department: 'COMISIÓN AGENCIA',
    lastInvoice: '2025-06-10',
    ytdTotal: 12450.0,
    invoiceCount: 6,
    isDomiciled: false,
  },
  {
    id: 4,
    name: 'CORDIS',
    periodicity: 'monthly',
    costCenter: 'MANTENIMIENTO',
    department: 'REPARACIONES Y MATERIALES',
    lastInvoice: '2025-05-28',
    ytdTotal: 805.86,
    invoiceCount: 6,
    notes: 'Domiciliada 134.31€',
    isDomiciled: true,
  },
  {
    id: 5,
    name: 'CARLIN',
    periodicity: 'monthly',
    costCenter: 'GASTOS ADMINISTRACIÓN',
    department: 'ADMINISTRACIÓN',
    lastInvoice: '2025-05-15',
    ytdTotal: 456.0,
    invoiceCount: 4,
    isDomiciled: false,
  },
  {
    id: 6,
    name: 'ECUS',
    periodicity: 'on_demand',
    costCenter: 'ALOJAMIENTO',
    department: 'MATERIALES HABITACIONES',
    lastInvoice: '2025-06-11',
    ytdTotal: 936.54,
    invoiceCount: 3,
    isDomiciled: false,
  },
  {
    id: 7,
    name: 'EMASA',
    periodicity: 'monthly',
    costCenter: 'SUMINISTROS',
    department: 'AGUA',
    lastInvoice: '2025-06-01',
    ytdTotal: 2112.0,
    invoiceCount: 6,
    isDomiciled: true,
  },
  {
    id: 8,
    name: 'EXPEDIA',
    periodicity: 'monthly',
    costCenter: 'ALOJAMIENTO',
    department: 'COMISIÓN AGENCIA',
    lastInvoice: '2025-06-08',
    ytdTotal: 8920.0,
    invoiceCount: 6,
    isDomiciled: false,
  },
  {
    id: 9,
    name: 'FRIT RAVICH',
    periodicity: 'on_demand',
    costCenter: 'RESTAURANTE',
    department: 'ALIMENTACIÓN',
    lastInvoice: '2025-06-10',
    ytdTotal: 1250.0,
    invoiceCount: 8,
    isDomiciled: false,
  },
  {
    id: 10,
    name: 'ILUNION',
    periodicity: 'monthly',
    costCenter: 'ALOJAMIENTO',
    department: 'LAVANDERÍA',
    lastInvoice: '2025-06-05',
    ytdTotal: 6461.4,
    invoiceCount: 6,
    isDomiciled: true,
  },
  {
    id: 11,
    name: 'KONICA',
    periodicity: 'monthly',
    costCenter: 'GASTOS ADMINISTRACIÓN',
    department: 'ADMINISTRACIÓN',
    lastInvoice: '2025-06-01',
    ytdTotal: 1343.1,
    invoiceCount: 6,
    isDomiciled: true,
  },
  {
    id: 12,
    name: 'OTIS',
    periodicity: 'quarterly',
    costCenter: 'MANTENIMIENTO',
    department: 'ASCENSORES',
    lastInvoice: '2025-04-01',
    ytdTotal: 1089.0,
    invoiceCount: 2,
    isDomiciled: false,
  },
  {
    id: 13,
    name: 'RENTOKIL',
    periodicity: 'quarterly',
    costCenter: 'MANTENIMIENTO',
    department: 'CONTROL PLAGAS',
    lastInvoice: '2025-06-08',
    ytdTotal: 566.28,
    invoiceCount: 2,
    isDomiciled: false,
  },
  {
    id: 14,
    name: 'TELEFONICA',
    periodicity: 'monthly',
    costCenter: 'SUMINISTROS',
    department: 'TELEFONÍA',
    lastInvoice: '2025-06-01',
    ytdTotal: 1778.7,
    invoiceCount: 6,
    isDomiciled: true,
  },
  {
    id: 15,
    name: 'VODAFONE',
    periodicity: 'monthly',
    costCenter: 'SUMINISTROS',
    department: 'TELEFONÍA',
    lastInvoice: '2025-06-05',
    ytdTotal: 646.14,
    invoiceCount: 6,
    notes: 'Internet fibra',
    isDomiciled: true,
  },
]

const costCenters = [
  'Todos',
  'GASTOS ADMINISTRACIÓN',
  'MANTENIMIENTO',
  'ALOJAMIENTO',
  'SUMINISTROS',
  'RESTAURANTE',
]

export function SuppliersTab() {
  const [searchTerm, setSearchTerm] = useState('')
  const [costCenterFilter, setCostCenterFilter] = useState('Todos')
  const [periodicityFilter, setPeriodicityFilter] = useState<Periodicity | 'all'>('all')
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)

  const filteredSuppliers = mockSuppliers.filter((supplier) => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCostCenter =
      costCenterFilter === 'Todos' || supplier.costCenter === costCenterFilter
    const matchesPeriodicity =
      periodicityFilter === 'all' || supplier.periodicity === periodicityFilter
    return matchesSearch && matchesCostCenter && matchesPeriodicity
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const getPeriodicityConfig = (periodicity: Periodicity) => {
    const configs: Record<Periodicity, { color: string; label: string }> = {
      monthly: {
        color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
        label: 'Mensual',
      },
      quarterly: {
        color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
        label: 'Trimestral',
      },
      annual: {
        color: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
        label: 'Anual',
      },
      on_demand: {
        color: 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
        label: 'Bajo Pedido',
      },
    }
    return configs[periodicity]
  }

  // Summary stats
  const totalYTD = filteredSuppliers.reduce((sum, s) => sum + s.ytdTotal, 0)
  const domiciledCount = filteredSuppliers.filter((s) => s.isDomiciled).length

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-3">
          <p className="text-[10px] text-gray-600 dark:text-gray-400 font-medium">Proveedores</p>
          <p className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100 mt-0.5">
            {filteredSuppliers.length}
          </p>
        </div>
        <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-3">
          <p className="text-[10px] text-gray-600 dark:text-gray-400 font-medium">Domiciliados</p>
          <p className="text-sm sm:text-base font-bold text-purple-600 dark:text-purple-400 mt-0.5">
            {domiciledCount}
          </p>
        </div>
        <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-3">
          <p className="text-[10px] text-gray-600 dark:text-gray-400 font-medium">Total YTD</p>
          <p className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100 mt-0.5">
            {formatCurrency(totalYTD)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Buscar proveedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 dark:border-gray-700 dark:bg-[#151b23] dark:text-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent"
          />
        </div>

        {/* Cost Center Filter */}
        <select
          value={costCenterFilter}
          onChange={(e) => setCostCenterFilter(e.target.value)}
          className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent bg-white dark:bg-[#151b23] dark:text-gray-200"
        >
          {costCenters.map((cc) => (
            <option key={cc} value={cc}>
              {cc}
            </option>
          ))}
        </select>

        {/* Periodicity Filter */}
        <select
          value={periodicityFilter}
          onChange={(e) => setPeriodicityFilter(e.target.value as Periodicity | 'all')}
          className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent bg-white dark:bg-[#151b23] dark:text-gray-200"
        >
          <option value="all">Todas las periodicidades</option>
          <option value="monthly">Mensual</option>
          <option value="quarterly">Trimestral</option>
          <option value="annual">Anual</option>
          <option value="on_demand">Bajo Pedido</option>
        </select>

        {/* Add Supplier */}
        <button className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-green-600 dark:bg-green-700 text-white text-xs font-medium rounded-md hover:bg-green-700 dark:hover:bg-green-800 transition-colors">
          <FiPlus className="w-3.5 h-3.5" />
          Nuevo Proveedor
        </button>
      </div>

      {/* Main Content - Split View on Large Screens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Suppliers List */}
        <div className="lg:col-span-2 bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-[#0d1117] border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Proveedor
                  </th>
                  <th className="px-3 py-2 text-center text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider hidden sm:table-cell">
                    Periodicidad
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell">
                    Departamento
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Total YTD
                  </th>
                  <th className="px-3 py-2 text-center text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider hidden sm:table-cell">
                    Facturas
                  </th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-8 text-center text-xs text-gray-500 dark:text-gray-400"
                    >
                      No se encontraron proveedores
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((supplier) => {
                    const periodicityConfig = getPeriodicityConfig(supplier.periodicity)
                    const isSelected = selectedSupplier?.id === supplier.id
                    return (
                      <tr
                        key={supplier.id}
                        onClick={() => setSelectedSupplier(supplier)}
                        className={`hover:bg-gray-50 dark:hover:bg-[#0d1117] transition-colors cursor-pointer ${
                          isSelected ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                        }`}
                      >
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                              {supplier.name}
                            </span>
                            {supplier.isDomiciled && (
                              <span className="px-1 py-0.5 text-[8px] font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded">
                                DOM
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center hidden sm:table-cell">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${periodicityConfig.color}`}
                          >
                            {periodicityConfig.label}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400 hidden md:table-cell">
                          {supplier.department}
                        </td>
                        <td className="px-3 py-2 text-xs text-right font-medium text-gray-900 dark:text-gray-100">
                          {formatCurrency(supplier.ytdTotal)}
                        </td>
                        <td className="px-3 py-2 text-xs text-center text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                          {supplier.invoiceCount}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <FiChevronRight className="w-4 h-4 text-gray-400" />
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Supplier Detail Panel */}
        <div className="lg:col-span-1">
          {selectedSupplier ? (
            <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-4 sticky top-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {selectedSupplier.name}
                  </h3>
                  <p className="text-[10px] text-gray-500 dark:text-gray-500 mt-0.5">
                    {selectedSupplier.costCenter}
                  </p>
                </div>
                <button className="inline-flex items-center justify-center w-7 h-7 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors">
                  <FiEdit2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 dark:bg-[#0d1117] rounded p-2">
                    <p className="text-[10px] text-gray-500 dark:text-gray-500">Total YTD</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {formatCurrency(selectedSupplier.ytdTotal)}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-[#0d1117] rounded p-2">
                    <p className="text-[10px] text-gray-500 dark:text-gray-500">Facturas</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {selectedSupplier.invoiceCount}
                    </p>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <FiCalendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>Última factura:</span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {selectedSupplier.lastInvoice
                        ? formatDate(selectedSupplier.lastInvoice)
                        : '-'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <FiDollarSign className="w-3.5 h-3.5 text-gray-400" />
                    <span>Periodicidad:</span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {getPeriodicityConfig(selectedSupplier.periodicity).label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <FiFileText className="w-3.5 h-3.5 text-gray-400" />
                    <span>Departamento:</span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {selectedSupplier.department}
                    </span>
                  </div>
                </div>

                {/* Notes */}
                {selectedSupplier.notes && (
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                    <p className="text-[10px] text-gray-500 dark:text-gray-500 mb-1">
                      Observaciones
                    </p>
                    <p className="text-xs text-gray-700 dark:text-gray-300">
                      {selectedSupplier.notes}
                    </p>
                  </div>
                )}

                {/* Status */}
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-500 dark:text-gray-500">
                      Pago domiciliado
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-medium rounded ${
                        selectedSupplier.isDomiciled
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {selectedSupplier.isDomiciled ? 'Sí' : 'No'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 flex gap-2">
                  <button className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 dark:bg-blue-700 text-white text-xs font-medium rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors">
                    <FiFileText className="w-3.5 h-3.5" />
                    Ver Facturas
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-6 text-center">
              <FiFileText className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Selecciona un proveedor para ver sus detalles
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
