// app/components/bo/tabs/SuppliersTabLazy.tsx
/**
 * Client Component - Suppliers Tab (React Query + lazy fetch)
 *
 * - Hidrata categorías desde el server (prop) para filtros rápidos.
 * - Carga proveedores bajo demanda con React Query.
 * - Reemplaza router.refresh() por invalidación de query.
 */

'use client'

import { useState, useMemo } from 'react'
import {
  FiSearch,
  FiPlus,
  FiEdit2,
  FiChevronRight,
  FiChevronLeft,
  FiFileText,
  FiCalendar,
  FiDollarSign,
  FiTrash2,
  FiX,
} from 'react-icons/fi'
import type { SupplierWithStats, Category } from '@/app/lib/backoffice/types'
import {
  formatCurrency,
  PERIODICITY_LABELS,
  PAYMENT_METHOD_LABELS,
} from '@/app/lib/backoffice/types'
import { SupplierFormModal, ConfirmDialog, SupplierInvoicesModal } from '@/app/components/bo/modals'
import { backofficeApi } from '@/app/lib/backoffice/backofficeApi'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

interface SuppliersTabLazyProps {
  initialSuppliers: SupplierWithStats[]
  categories: Category[]
  pagination: { page: number; total: number; totalPages: number; limit?: number }
  onPageChange?: (page: number) => void
}

const suppliersKey = (page: number) => ['backoffice', 'suppliers', page] as const
const suppliersListKey = () => ['backoffice', 'suppliers'] as const

export function SuppliersTabLazy({
  initialSuppliers,
  categories,
  pagination,
  onPageChange,
}: SuppliersTabLazyProps) {
  const queryClient = useQueryClient()

  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<number | 'all'>('all')
  const [periodicityFilter, setPeriodicityFilter] = useState<string>('all')
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierWithStats | null>(null)

  // Modal states
  const [supplierModalOpen, setSupplierModalOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<SupplierWithStats | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingSupplier, setDeletingSupplier] = useState<SupplierWithStats | null>(null)
  const [invoicesModalOpen, setInvoicesModalOpen] = useState(false)

  // React Query fetch
  const { data } = useQuery({
    queryKey: suppliersKey(pagination.page),
    queryFn: async () => {
      const response = await backofficeApi.getSuppliers({
        page: pagination.page,
        limit: pagination.limit ?? 100,
      })
      return response
    },
    initialData: {
      suppliers: initialSuppliers,
      pagination: {
        page: pagination.page,
        total: pagination.total,
        totalPages: pagination.totalPages,
        limit: pagination.limit ?? 100,
      },
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: false,
  })

  const suppliers = data?.suppliers ?? initialSuppliers
  const serverPagination = data?.pagination ?? pagination

  const invalidateSuppliers = () => {
    queryClient.invalidateQueries({ queryKey: suppliersListKey() })
  }

  // Client-side filtering
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => {
      const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory =
        categoryFilter === 'all' || supplier.default_category_id === categoryFilter
      const matchesPeriodicity =
        periodicityFilter === 'all' || supplier.periodicity === periodicityFilter
      return matchesSearch && matchesCategory && matchesPeriodicity
    })
  }, [suppliers, searchTerm, categoryFilter, periodicityFilter])

  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  // Modal handlers
  const handleOpenNewSupplier = () => {
    setEditingSupplier(null)
    setSupplierModalOpen(true)
  }

  const handleOpenEditSupplier = (supplier: SupplierWithStats) => {
    setEditingSupplier(supplier)
    setSupplierModalOpen(true)
  }

  const handleOpenDeleteDialog = (supplier: SupplierWithStats) => {
    setDeletingSupplier(supplier)
    setDeleteDialogOpen(true)
  }

  const handleDeleteSupplier = async () => {
    if (!deletingSupplier) return

    try {
      await backofficeApi.deleteSupplier(deletingSupplier.id)
      toast.success('Proveedor eliminado correctamente')
      setDeleteDialogOpen(false)
      setDeletingSupplier(null)
      setSelectedSupplier(null)
      invalidateSuppliers()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al eliminar el proveedor'
      toast.error(message)
    }
  }

  // Summary stats
  const domiciledCount = filteredSuppliers.filter((s) => s.payment_method === 'direct_debit').length
  const transferCount = filteredSuppliers.filter((s) => s.payment_method === 'transfer').length

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
          <p className="text-[10px] text-gray-600 dark:text-gray-400 font-medium">Transferencias</p>
          <p className="text-sm sm:text-base font-bold text-blue-600 dark:text-blue-400 mt-0.5">
            {transferCount}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        {/* Search */}
        <div className="relative w-full sm:w-48">
          <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Buscar proveedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 dark:border-gray-700 dark:bg-[#151b23] dark:text-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent"
          />
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) =>
            setCategoryFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
          }
          className="flex-1 min-w-[180px] px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent bg-white dark:bg-[#151b23] dark:text-gray-200"
        >
          <option value="all">Todas las categorías</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.cost_center} - {cat.department}
            </option>
          ))}
        </select>

        {/* Periodicity Filter */}
        <select
          value={periodicityFilter}
          onChange={(e) => setPeriodicityFilter(e.target.value)}
          className="w-full sm:w-52 px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent bg-white dark:bg-[#151b23] dark:text-gray-200"
        >
          <option value="all">Todas las periodicidades</option>
          <option value="monthly">Mensual</option>
          <option value="bimonthly">Bimestral</option>
          <option value="quarterly">Trimestral</option>
          <option value="annual">Anual</option>
          <option value="on_demand">Bajo demanda</option>
        </select>

        {/* Add Supplier */}
        <button
          onClick={handleOpenNewSupplier}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-green-600 dark:bg-green-700 text-white text-xs font-medium rounded-md hover:bg-green-700 dark:hover:bg-green-800 transition-colors"
        >
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
                            {supplier.payment_method === 'direct_debit' && (
                              <span className="px-1 py-0.5 text-[8px] font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded">
                                DOM
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center hidden sm:table-cell">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                            {PERIODICITY_LABELS[supplier.periodicity]}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400 hidden md:table-cell">
                          {supplier.department || '-'}
                        </td>
                        <td className="px-3 py-2 text-xs text-right font-medium text-gray-900 dark:text-gray-100">
                          {formatCurrency(supplier.ytd_total || 0)}
                        </td>
                        <td className="px-3 py-2 text-xs text-center text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                          {supplier.total_invoices || 0}
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

          {/* Pagination */}
          {serverPagination.total > 0 && (
            <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Mostrando {filteredSuppliers.length} de {serverPagination.total} proveedores
                {serverPagination.totalPages > 1 &&
                  ` (Página ${serverPagination.page} de ${serverPagination.totalPages})`}
              </span>
              {serverPagination.totalPages > 1 && onPageChange && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onPageChange(serverPagination.page - 1)}
                    disabled={serverPagination.page <= 1}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <FiChevronLeft className="w-3.5 h-3.5" />
                    Anterior
                  </button>
                  <button
                    onClick={() => onPageChange(serverPagination.page + 1)}
                    disabled={serverPagination.page >= serverPagination.totalPages}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Siguiente
                    <FiChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
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
                    {selectedSupplier.cost_center || 'Sin categoría'}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditSupplier(selectedSupplier)}
                    className="inline-flex items-center justify-center w-7 h-7 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                    title="Editar"
                  >
                    <FiEdit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleOpenDeleteDialog(selectedSupplier)}
                    className="inline-flex items-center justify-center w-7 h-7 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                    title="Eliminar"
                  >
                    <FiTrash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setSelectedSupplier(null)}
                    className="inline-flex items-center justify-center w-7 h-7 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                    title="Cerrar"
                  >
                    <FiX className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 dark:bg-[#0d1117] rounded p-2">
                    <p className="text-[10px] text-gray-500 dark:text-gray-500">Total YTD</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {formatCurrency(selectedSupplier.ytd_total || 0)}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-[#0d1117] rounded p-2">
                    <p className="text-[10px] text-gray-500 dark:text-gray-500">Facturas</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {selectedSupplier.total_invoices || 0}
                    </p>
                  </div>
                </div>

                {/* Stats detail */}
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                    <span>Pendientes:</span>
                    <span className="font-medium">{selectedSupplier.pending_invoices || 0}</span>
                  </div>
                  <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <span>Pagadas:</span>
                    <span className="font-medium">{selectedSupplier.paid_invoices || 0}</span>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <FiCalendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>Última factura:</span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {formatDate(selectedSupplier.last_invoice_date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <FiDollarSign className="w-3.5 h-3.5 text-gray-400" />
                    <span>Periodicidad:</span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {PERIODICITY_LABELS[selectedSupplier.periodicity]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <FiFileText className="w-3.5 h-3.5 text-gray-400" />
                    <span>Forma de pago:</span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {PAYMENT_METHOD_LABELS[selectedSupplier.payment_method]}
                    </span>
                  </div>
                </div>

                {/* CIF */}
                {selectedSupplier.cif && (
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                    <p className="text-[10px] text-gray-500 dark:text-gray-500 mb-1">CIF</p>
                    <p className="text-xs text-gray-700 dark:text-gray-300 font-mono">
                      {selectedSupplier.cif}
                    </p>
                  </div>
                )}

                {/* Bank Account */}
                {selectedSupplier.bank_account && (
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                    <p className="text-[10px] text-gray-500 dark:text-gray-500 mb-1">
                      Cuenta Bancaria
                    </p>
                    <p className="text-xs text-gray-700 dark:text-gray-300 font-mono break-all">
                      {selectedSupplier.bank_account}
                    </p>
                  </div>
                )}

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

                {/* Contact info */}
                {(selectedSupplier.email || selectedSupplier.phone) && (
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-1">
                    <p className="text-[10px] text-gray-500 dark:text-gray-500 mb-1">Contacto</p>
                    {selectedSupplier.email && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {selectedSupplier.email}
                      </p>
                    )}
                    {selectedSupplier.phone && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {selectedSupplier.phone}
                      </p>
                    )}
                  </div>
                )}

                {/* Address */}
                {selectedSupplier.address && (
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                    <p className="text-[10px] text-gray-500 dark:text-gray-500 mb-1">Dirección</p>
                    <p className="text-xs text-gray-700 dark:text-gray-300">
                      {selectedSupplier.address}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-3 flex gap-2">
                  <button
                    onClick={() => setInvoicesModalOpen(true)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 dark:bg-blue-700 text-white text-xs font-medium rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors"
                  >
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

      {/* Supplier Form Modal */}
      {supplierModalOpen && (
        <SupplierFormModal
          isOpen={supplierModalOpen}
          onClose={() => {
            setSupplierModalOpen(false)
            setEditingSupplier(null)
          }}
          onSuccess={invalidateSuppliers}
          supplier={editingSupplier}
          categories={categories}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && deletingSupplier && (
        <ConfirmDialog
          isOpen={deleteDialogOpen}
          title="Eliminar proveedor"
          message={`¿Seguro que quieres eliminar a ${deletingSupplier.name}?`}
          confirmText="Eliminar"
          variant="danger"
          onClose={() => {
            setDeleteDialogOpen(false)
            setDeletingSupplier(null)
          }}
          onConfirm={handleDeleteSupplier}
        />
      )}

      {/* Supplier Invoices Modal */}
      {invoicesModalOpen && selectedSupplier && (
        <SupplierInvoicesModal
          isOpen={invoicesModalOpen}
          onClose={() => setInvoicesModalOpen(false)}
          supplier={selectedSupplier}
        />
      )}
    </div>
  )
}
