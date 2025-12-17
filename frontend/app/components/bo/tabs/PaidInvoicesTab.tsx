// app/components/bo/tabs/PaidInvoicesTab.tsx

'use client'

import { useState } from 'react'
import {
  FiSearch,
  FiDownload,
  FiFileText,
  FiCalendar,
  FiCreditCard,
  FiCheck,
  FiFilter,
} from 'react-icons/fi'

// Types
type PaymentMethod = 'transfer' | 'direct_debit' | 'card' | 'cash'

interface PaidInvoice {
  id: number
  supplier: string
  invoiceNumber: string
  invoiceDate: string
  paidDate: string
  amountWithoutVat: number
  amountWithVat: number
  paymentMethod: PaymentMethod
  category: string
  department: string
  validatedBy: string
  reference?: string
}

// Mock data
const mockPaidInvoices: PaidInvoice[] = [
  {
    id: 101,
    supplier: 'ADYEN',
    invoiceNumber: 'ADY-2025-05',
    invoiceDate: '2025-05-01',
    paidDate: '2025-05-15',
    amountWithoutVat: 250.0,
    amountWithVat: 302.5,
    paymentMethod: 'direct_debit',
    category: 'GASTOS ADMINISTRACIÓN',
    department: 'ADMINISTRACIÓN',
    validatedBy: 'Ana',
    reference: 'DD-2025-0512',
  },
  {
    id: 102,
    supplier: 'CORDIS',
    invoiceNumber: 'F-2025-0789',
    invoiceDate: '2025-04-28',
    paidDate: '2025-05-10',
    amountWithoutVat: 111.0,
    amountWithVat: 134.31,
    paymentMethod: 'direct_debit',
    category: 'MANTENIMIENTO',
    department: 'REPARACIONES Y MATERIALES',
    validatedBy: 'Ana',
  },
  {
    id: 103,
    supplier: 'OTIS',
    invoiceNumber: 'OT-2025-1234',
    invoiceDate: '2025-05-05',
    paidDate: '2025-05-20',
    amountWithoutVat: 450.0,
    amountWithVat: 544.5,
    paymentMethod: 'transfer',
    category: 'MANTENIMIENTO',
    department: 'ASCENSORES',
    validatedBy: 'Ana',
    reference: 'TR-2025-0520',
  },
  {
    id: 104,
    supplier: 'ILUNION',
    invoiceNumber: 'IL-2025-567',
    invoiceDate: '2025-05-01',
    paidDate: '2025-05-15',
    amountWithoutVat: 890.0,
    amountWithVat: 1076.9,
    paymentMethod: 'direct_debit',
    category: 'ALOJAMIENTO',
    department: 'LAVANDERÍA',
    validatedBy: 'Ana',
  },
  {
    id: 105,
    supplier: 'KONICA',
    invoiceNumber: 'KM-2025-890',
    invoiceDate: '2025-05-10',
    paidDate: '2025-05-25',
    amountWithoutVat: 185.0,
    amountWithVat: 223.85,
    paymentMethod: 'direct_debit',
    category: 'GASTOS ADMINISTRACIÓN',
    department: 'ADMINISTRACIÓN',
    validatedBy: 'Ana',
  },
  {
    id: 106,
    supplier: 'EMASA',
    invoiceNumber: 'EMA-2025-06',
    invoiceDate: '2025-06-01',
    paidDate: '2025-06-05',
    amountWithoutVat: 320.0,
    amountWithVat: 352.0,
    paymentMethod: 'direct_debit',
    category: 'SUMINISTROS',
    department: 'AGUA',
    validatedBy: 'Ana',
  },
  {
    id: 107,
    supplier: 'SECURITAS DIRECT',
    invoiceNumber: 'SD-2025-456',
    invoiceDate: '2025-05-15',
    paidDate: '2025-05-30',
    amountWithoutVat: 125.0,
    amountWithVat: 151.25,
    paymentMethod: 'direct_debit',
    category: 'MANTENIMIENTO',
    department: 'SEGURIDAD',
    validatedBy: 'Ana',
  },
  {
    id: 108,
    supplier: 'VULCANO FERRETERIA',
    invoiceNumber: 'VF-2025-234',
    invoiceDate: '2025-05-20',
    paidDate: '2025-06-01',
    amountWithoutVat: 78.5,
    amountWithVat: 94.99,
    paymentMethod: 'card',
    category: 'MANTENIMIENTO',
    department: 'REPARACIONES Y MATERIALES',
    validatedBy: 'Sara',
  },
]

const months = [
  { value: 'all', label: 'Todos los meses' },
  { value: '2025-06', label: 'Junio 2025' },
  { value: '2025-05', label: 'Mayo 2025' },
  { value: '2025-04', label: 'Abril 2025' },
  { value: '2025-03', label: 'Marzo 2025' },
]

export function PaidInvoicesTab() {
  const [searchTerm, setSearchTerm] = useState('')
  const [monthFilter, setMonthFilter] = useState('all')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<PaymentMethod | 'all'>('all')

  const filteredInvoices = mockPaidInvoices.filter((invoice) => {
    const matchesSearch =
      invoice.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesMonth =
      monthFilter === 'all' || invoice.paidDate.startsWith(monthFilter)
    const matchesPayment =
      paymentMethodFilter === 'all' || invoice.paymentMethod === paymentMethodFilter
    return matchesSearch && matchesMonth && matchesPayment
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

  const getPaymentMethodConfig = (method: PaymentMethod) => {
    const configs: Record<PaymentMethod, { color: string; label: string; icon: React.ElementType }> =
      {
        transfer: {
          color:
            'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
          label: 'Transferencia',
          icon: FiCreditCard,
        },
        direct_debit: {
          color:
            'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
          label: 'Domiciliada',
          icon: FiCheck,
        },
        card: {
          color:
            'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
          label: 'Tarjeta',
          icon: FiCreditCard,
        },
        cash: {
          color:
            'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
          label: 'Efectivo',
          icon: FiCreditCard,
        },
      }
    return configs[method]
  }

  // Summary stats
  const totalPaid = filteredInvoices.reduce((sum, i) => sum + i.amountWithVat, 0)
  const byDirectDebit = filteredInvoices
    .filter((i) => i.paymentMethod === 'direct_debit')
    .reduce((sum, i) => sum + i.amountWithVat, 0)
  const byTransfer = filteredInvoices
    .filter((i) => i.paymentMethod === 'transfer')
    .reduce((sum, i) => sum + i.amountWithVat, 0)

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-3">
          <p className="text-[10px] text-gray-600 dark:text-gray-400 font-medium">Total Pagado</p>
          <p className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100 mt-0.5">
            {formatCurrency(totalPaid)}
          </p>
        </div>
        <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-3">
          <p className="text-[10px] text-gray-600 dark:text-gray-400 font-medium">Domiciliadas</p>
          <p className="text-sm sm:text-base font-bold text-purple-600 dark:text-purple-400 mt-0.5">
            {formatCurrency(byDirectDebit)}
          </p>
        </div>
        <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-3">
          <p className="text-[10px] text-gray-600 dark:text-gray-400 font-medium">Transferencias</p>
          <p className="text-sm sm:text-base font-bold text-blue-600 dark:text-blue-400 mt-0.5">
            {formatCurrency(byTransfer)}
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
            placeholder="Buscar por proveedor o nº factura..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 dark:border-gray-700 dark:bg-[#151b23] dark:text-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent"
          />
        </div>

        {/* Month Filter */}
        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent bg-white dark:bg-[#151b23] dark:text-gray-200"
        >
          {months.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        {/* Payment Method Filter */}
        <select
          value={paymentMethodFilter}
          onChange={(e) => setPaymentMethodFilter(e.target.value as PaymentMethod | 'all')}
          className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent bg-white dark:bg-[#151b23] dark:text-gray-200"
        >
          <option value="all">Todos los métodos</option>
          <option value="direct_debit">Domiciliada</option>
          <option value="transfer">Transferencia</option>
          <option value="card">Tarjeta</option>
          <option value="cash">Efectivo</option>
        </select>

        {/* Export */}
        <button className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
          <FiDownload className="w-3.5 h-3.5" />
          Exportar
        </button>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-[#0d1117] border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Proveedor
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Nº Factura
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Fecha Factura
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Fecha Pago
                </th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Importe
                </th>
                <th className="px-3 py-2 text-center text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Método
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-3 py-2 text-center text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Validado
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
                    colSpan={9}
                    className="px-3 py-8 text-center text-xs text-gray-500 dark:text-gray-400"
                  >
                    No se encontraron facturas pagadas
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => {
                  const paymentConfig = getPaymentMethodConfig(invoice.paymentMethod)
                  return (
                    <tr
                      key={invoice.id}
                      className="hover:bg-gray-50 dark:hover:bg-[#0d1117] transition-colors"
                    >
                      <td className="px-3 py-2 text-xs font-medium text-gray-900 dark:text-gray-100">
                        {invoice.supplier}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400 font-mono">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
                        {formatDate(invoice.invoiceDate)}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
                        {formatDate(invoice.paidDate)}
                      </td>
                      <td className="px-3 py-2 text-xs text-right font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(invoice.amountWithVat)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${paymentConfig.color}`}
                        >
                          {paymentConfig.label}
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
                      <td className="px-3 py-2 text-xs text-center text-gray-600 dark:text-gray-400">
                        {invoice.validatedBy}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          title="Ver PDF"
                          className="inline-flex items-center justify-center w-7 h-7 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                        >
                          <FiFileText className="w-3.5 h-3.5" />
                        </button>
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
      <div className="md:hidden space-y-2">
        {filteredInvoices.length === 0 ? (
          <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-6 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              No se encontraron facturas pagadas
            </p>
          </div>
        ) : (
          filteredInvoices.map((invoice) => {
            const paymentConfig = getPaymentMethodConfig(invoice.paymentMethod)
            return (
              <div
                key={invoice.id}
                className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800 p-3 hover:shadow-md dark:hover:shadow-gray-900/50 transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-xs text-gray-900 dark:text-gray-100">
                      {invoice.supplier}
                    </h3>
                    <p className="text-[10px] text-gray-500 dark:text-gray-500 font-mono">
                      {invoice.invoiceNumber}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${paymentConfig.color}`}
                  >
                    {paymentConfig.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] mb-2">
                  <div>
                    <span className="text-gray-500 dark:text-gray-500">Pagado:</span>
                    <span className="ml-1 text-gray-900 dark:text-gray-100">
                      {formatDate(invoice.paidDate)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                      {formatCurrency(invoice.amountWithVat)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                  <span className="text-[10px] text-gray-500 dark:text-gray-500">
                    Validado por: {invoice.validatedBy}
                  </span>
                  <button className="inline-flex items-center justify-center w-6 h-6 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors">
                    <FiFileText className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
