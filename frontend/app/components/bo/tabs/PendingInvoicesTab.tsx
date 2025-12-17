// app/components/bo/tabs/PendingInvoicesTab.tsx

'use client'

import { useState } from 'react'
import {
  FiSearch,
  FiPlus,
  FiCheck,
  FiEdit2,
  FiUpload,
  FiDownload,
  FiAlertCircle,
  FiFilter,
  FiCalendar,
  FiFileText,
} from 'react-icons/fi'

// Types based on Excel structure
type ValidationStatus = 'pending' | 'validated' | 'rejected'

interface Invoice {
  id: number
  sendDate: string
  supplier: string
  invoiceNumber: string
  invoiceDate: string
  amountWithoutVat: number
  amountWithVat: number
  validation: ValidationStatus
  category: string
  department: string
  notes: string
  validatedBy?: string
  pdfUrl?: string
}

// Mock data based on Excel "TOTAL PAGAR" sheet
const mockPendingInvoices: Invoice[] = [
  {
    id: 1,
    sendDate: '2025-05-05',
    supplier: 'ACTIVH2O',
    invoiceNumber: '25-118',
    invoiceDate: '2025-06-05',
    amountWithoutVat: 285.91,
    amountWithVat: 345.95,
    validation: 'pending',
    category: 'MANTENIMIENTO',
    department: 'REPARACIONES Y MATERIALES',
    notes: 'sara',
  },
  {
    id: 2,
    sendDate: '2025-05-10',
    supplier: 'BOOKASSIST',
    invoiceNumber: 'INV0019622',
    invoiceDate: '2025-06-01',
    amountWithoutVat: 290.0,
    amountWithVat: 350.9,
    validation: 'pending',
    category: 'GASTOS ADMINISTRACIÓN',
    department: 'ADMINISTRACIÓN',
    notes: 'sara',
  },
  {
    id: 3,
    sendDate: '2025-05-12',
    supplier: 'ECUS',
    invoiceNumber: '11/2509776',
    invoiceDate: '2025-06-11',
    amountWithoutVat: 258.0,
    amountWithVat: 312.18,
    validation: 'validated',
    category: 'ALOJAMIENTO',
    department: 'MATERIALES HABITACIONES',
    notes: 'sara',
    validatedBy: 'Ana',
  },
  {
    id: 4,
    sendDate: '2025-05-14',
    supplier: 'NORVEX',
    invoiceNumber: '2520551294',
    invoiceDate: '2025-06-04',
    amountWithoutVat: 953.52,
    amountWithVat: 1153.76,
    validation: 'pending',
    category: 'MANTENIMIENTO',
    department: 'REPARACIONES Y MATERIALES',
    notes: 'sara',
  },
  {
    id: 5,
    sendDate: '2025-05-15',
    supplier: 'CORDIS',
    invoiceNumber: 'F-2025-0845',
    invoiceDate: '2025-05-28',
    amountWithoutVat: 111.0,
    amountWithVat: 134.31,
    validation: 'validated',
    category: 'MANTENIMIENTO',
    department: 'REPARACIONES Y MATERIALES',
    notes: 'Domiciliada',
    validatedBy: 'Ana',
  },
  {
    id: 6,
    sendDate: '2025-05-18',
    supplier: 'DIMARSOL',
    invoiceNumber: 'DM-2025-1234',
    invoiceDate: '2025-06-15',
    amountWithoutVat: 425.0,
    amountWithVat: 514.25,
    validation: 'pending',
    category: 'ALOJAMIENTO',
    department: 'AMENITIES',
    notes: '',
  },
  {
    id: 7,
    sendDate: '2025-05-20',
    supplier: 'FRIT RAVICH',
    invoiceNumber: 'FR-98765',
    invoiceDate: '2025-06-10',
    amountWithoutVat: 187.5,
    amountWithVat: 226.88,
    validation: 'rejected',
    category: 'RESTAURANTE',
    department: 'ALIMENTACIÓN',
    notes: 'Precio incorrecto',
  },
  {
    id: 8,
    sendDate: '2025-05-22',
    supplier: 'TELEFONICA',
    invoiceNumber: 'TEL-2025-06',
    invoiceDate: '2025-06-01',
    amountWithoutVat: 245.0,
    amountWithVat: 296.45,
    validation: 'pending',
    category: 'SUMINISTROS',
    department: 'TELEFONÍA',
    notes: 'Mensual',
  },
  {
    id: 9,
    sendDate: '2025-05-25',
    supplier: 'RENTOKIL',
    invoiceNumber: 'RK-2025-456',
    invoiceDate: '2025-06-08',
    amountWithoutVat: 156.0,
    amountWithVat: 188.76,
    validation: 'pending',
    category: 'MANTENIMIENTO',
    department: 'CONTROL PLAGAS',
    notes: '',
  },
  {
    id: 10,
    sendDate: '2025-05-28',
    supplier: 'VODAFONE',
    invoiceNumber: 'VDF-2025-06',
    invoiceDate: '2025-06-05',
    amountWithoutVat: 89.0,
    amountWithVat: 107.69,
    validation: 'validated',
    category: 'SUMINISTROS',
    department: 'TELEFONÍA',
    notes: 'Internet fibra',
    validatedBy: 'Ana',
  },
]

const categories = [
  'Todas',
  'MANTENIMIENTO',
  'GASTOS ADMINISTRACIÓN',
  'ALOJAMIENTO',
  'SUMINISTROS',
  'RESTAURANTE',
]

export function PendingInvoicesTab() {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('Todas')
  const [validationFilter, setValidationFilter] = useState<ValidationStatus | 'all'>('all')
  const [selectedInvoices, setSelectedInvoices] = useState<number[]>([])

  const filteredInvoices = mockPendingInvoices.filter((invoice) => {
    const matchesSearch =
      invoice.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'Todas' || invoice.category === categoryFilter
    const matchesValidation = validationFilter === 'all' || invoice.validation === validationFilter
    return matchesSearch && matchesCategory && matchesValidation
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

  const getValidationConfig = (status: ValidationStatus) => {
    const configs: Record<ValidationStatus, { color: string; label: string }> = {
      pending: {
        color:
          'bg-yellow-50 text-yellow-700 border border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
        label: 'Pendiente',
      },
      validated: {
        color:
          'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
        label: 'Validada',
      },
      rejected: {
        color:
          'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
        label: 'Rechazada',
      },
    }
    return configs[status]
  }

  const toggleSelectInvoice = (id: number) => {
    setSelectedInvoices((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedInvoices.length === filteredInvoices.length) {
      setSelectedInvoices([])
    } else {
      setSelectedInvoices(filteredInvoices.map((i) => i.id))
    }
  }

  const totalSelected = filteredInvoices
    .filter((i) => selectedInvoices.includes(i.id))
    .reduce((sum, i) => sum + i.amountWithVat, 0)

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por proveedor o nº factura..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 dark:border-gray-700 dark:bg-[#151b23] dark:text-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent"
          />
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent bg-white dark:bg-[#151b23] dark:text-gray-200"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        {/* Validation Filter */}
        <select
          value={validationFilter}
          onChange={(e) => setValidationFilter(e.target.value as ValidationStatus | 'all')}
          className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent bg-white dark:bg-[#151b23] dark:text-gray-200"
        >
          <option value="all">Todas las validaciones</option>
          <option value="pending">Pendiente</option>
          <option value="validated">Validada</option>
          <option value="rejected">Rechazada</option>
        </select>

        {/* Actions */}
        <div className="flex gap-2">
          <button className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 dark:bg-blue-700 text-white text-xs font-medium rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors">
            <FiUpload className="w-3.5 h-3.5" />
            Subir PDF
          </button>
          <button className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-green-600 dark:bg-green-700 text-white text-xs font-medium rounded-md hover:bg-green-700 dark:hover:bg-green-800 transition-colors">
            <FiPlus className="w-3.5 h-3.5" />
            Nueva Factura
          </button>
        </div>
      </div>

      {/* Selected Actions */}
      {selectedInvoices.length > 0 && (
        <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md px-3 py-2">
          <span className="text-xs text-blue-700 dark:text-blue-400">
            {selectedInvoices.length} seleccionada(s) · Total: {formatCurrency(totalSelected)}
          </span>
          <div className="flex gap-2">
            <button className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors">
              <FiCheck className="w-3 h-3" />
              Validar
            </button>
            <button className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors">
              <FiDownload className="w-3 h-3" />
              Exportar
            </button>
          </div>
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-[#0d1117] border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-3 py-2 text-left">
                  <input
                    type="checkbox"
                    checked={selectedInvoices.length === filteredInvoices.length && filteredInvoices.length > 0}
                    onChange={toggleSelectAll}
                    className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Fecha Envío
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Proveedor
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Nº Factura
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Fecha Factura
                </th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Sin IVA
                </th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Con IVA
                </th>
                <th className="px-3 py-2 text-center text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Validación
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-3 py-8 text-center text-xs text-gray-500 dark:text-gray-400"
                  >
                    No se encontraron facturas
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => {
                  const validationConfig = getValidationConfig(invoice.validation)
                  const isSelected = selectedInvoices.includes(invoice.id)
                  return (
                    <tr
                      key={invoice.id}
                      className={`hover:bg-gray-50 dark:hover:bg-[#0d1117] transition-colors ${
                        isSelected ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                      }`}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectInvoice(invoice.id)}
                          className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
                        {formatDate(invoice.sendDate)}
                      </td>
                      <td className="px-3 py-2 text-xs font-medium text-gray-900 dark:text-gray-100">
                        {invoice.supplier}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400 font-mono">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
                        {formatDate(invoice.invoiceDate)}
                      </td>
                      <td className="px-3 py-2 text-xs text-right text-gray-600 dark:text-gray-400">
                        {formatCurrency(invoice.amountWithoutVat)}
                      </td>
                      <td className="px-3 py-2 text-xs text-right font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(invoice.amountWithVat)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${validationConfig.color}`}
                        >
                          {validationConfig.label}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-xs text-gray-900 dark:text-gray-100">
                          {invoice.category}
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-500">
                          {invoice.department}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {invoice.validation === 'pending' && (
                            <button
                              title="Validar"
                              className="inline-flex items-center justify-center w-7 h-7 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                            >
                              <FiCheck className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            title="Editar"
                            className="inline-flex items-center justify-center w-7 h-7 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                          >
                            <FiEdit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Ver PDF"
                            className="inline-flex items-center justify-center w-7 h-7 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                          >
                            <FiFileText className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-2">
        {filteredInvoices.length === 0 ? (
          <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-6 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">No se encontraron facturas</p>
          </div>
        ) : (
          filteredInvoices.map((invoice) => {
            const validationConfig = getValidationConfig(invoice.validation)
            const isSelected = selectedInvoices.includes(invoice.id)
            return (
              <div
                key={invoice.id}
                className={`bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-3 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow ${
                  isSelected ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectInvoice(invoice.id)}
                      className="mt-0.5 w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <h3 className="font-semibold text-xs text-gray-900 dark:text-gray-100">
                        {invoice.supplier}
                      </h3>
                      <p className="text-[10px] text-gray-500 dark:text-gray-500 font-mono">
                        {invoice.invoiceNumber}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${validationConfig.color}`}
                  >
                    {validationConfig.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] mb-2">
                  <div>
                    <span className="text-gray-500 dark:text-gray-500">Fecha factura:</span>
                    <span className="ml-1 text-gray-900 dark:text-gray-100">
                      {formatDate(invoice.invoiceDate)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-500 dark:text-gray-500">Con IVA:</span>
                    <span className="ml-1 font-semibold text-gray-900 dark:text-gray-100">
                      {formatCurrency(invoice.amountWithVat)}
                    </span>
                  </div>
                </div>

                <div className="text-[10px] text-gray-600 dark:text-gray-400 mb-2">
                  {invoice.category} / {invoice.department}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                  <span className="text-[10px] text-gray-500 dark:text-gray-500">
                    Enviada: {formatDate(invoice.sendDate)}
                  </span>
                  <div className="flex items-center gap-1">
                    {invoice.validation === 'pending' && (
                      <button className="inline-flex items-center justify-center w-6 h-6 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors">
                        <FiCheck className="w-3 h-3" />
                      </button>
                    )}
                    <button className="inline-flex items-center justify-center w-6 h-6 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors">
                      <FiEdit2 className="w-3 h-3" />
                    </button>
                    <button className="inline-flex items-center justify-center w-6 h-6 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors">
                      <FiFileText className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
