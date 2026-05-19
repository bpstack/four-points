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
import { useTranslations } from 'next-intl'
import { formatDateDisplayShort } from '@/app/lib/helpers/date'
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
  FiPower,
  FiRotateCcw,
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
import { SelectDropdown } from '@/app/ui/components/SelectDropdown'

interface SuppliersTabLazyProps {
  initialSuppliers: SupplierWithStats[]
  categories: Category[]
  pagination: { page: number; total: number; totalPages: number; limit?: number }
  onPageChange?: (page: number) => void
}

const suppliersKey = (page: number, isActive: boolean) =>
  ['backoffice', 'suppliers', isActive ? 'active' : 'inactive', page] as const
const suppliersListKey = () => ['backoffice', 'suppliers'] as const

export function SuppliersTabLazy({
  initialSuppliers,
  categories,
  pagination,
  onPageChange,
}: SuppliersTabLazyProps) {
  const t = useTranslations('backoffice')
  const queryClient = useQueryClient()

  const [activeStatusTab, setActiveStatusTab] = useState<'active' | 'inactive'>('active')
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<number | 'all'>('all')
  const [periodicityFilter, setPeriodicityFilter] = useState<string>('all')
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierWithStats | null>(null)

  // Modal states
  const [supplierModalOpen, setSupplierModalOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<SupplierWithStats | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingSupplier, setDeletingSupplier] = useState<SupplierWithStats | null>(null)
  const [inactivateDialogOpen, setInactivateDialogOpen] = useState(false)
  const [inactivatingSupplier, setInactivatingSupplier] = useState<SupplierWithStats | null>(null)
  const [invoicesModalOpen, setInvoicesModalOpen] = useState(false)

  const isActiveTab = activeStatusTab === 'active'

  // React Query fetch — separate cache per tab (active vs inactive)
  const { data } = useQuery({
    queryKey: suppliersKey(pagination.page, isActiveTab),
    queryFn: async () => {
      const response = await backofficeApi.getSuppliers({
        page: pagination.page,
        limit: pagination.limit ?? 100,
        is_active: isActiveTab,
      })
      return response
    },
    initialData: isActiveTab
      ? {
          suppliers: initialSuppliers,
          pagination: {
            page: pagination.page,
            total: pagination.total,
            totalPages: pagination.totalPages,
            limit: pagination.limit ?? 100,
          },
        }
      : undefined,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: false,
  })

  const suppliers = data?.suppliers ?? (isActiveTab ? initialSuppliers : [])
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

  const formatDate = (date: string | null) => (date ? formatDateDisplayShort(date) : '-')

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
      toast.success(t('toast.supplierDeleted'))
      setDeleteDialogOpen(false)
      setDeletingSupplier(null)
      setSelectedSupplier(null)
      invalidateSuppliers()
    } catch (error) {
      const message = error instanceof Error ? error.message : t('toast.supplierDeleteError')
      toast.error(message)
    }
  }

  const handleOpenInactivateDialog = (supplier: SupplierWithStats) => {
    setInactivatingSupplier(supplier)
    setInactivateDialogOpen(true)
  }

  const handleInactivateSupplier = async () => {
    if (!inactivatingSupplier) return

    try {
      await backofficeApi.inactivateSupplier(inactivatingSupplier.id)
      toast.success(t('toast.supplierInactivated'))
      setInactivateDialogOpen(false)
      setInactivatingSupplier(null)
      setSelectedSupplier(null)
      invalidateSuppliers()
    } catch (error) {
      const message = error instanceof Error ? error.message : t('toast.supplierInactivateError')
      toast.error(message)
    }
  }

  const handleActivateSupplier = async (supplier: SupplierWithStats) => {
    try {
      await backofficeApi.activateSupplier(supplier.id)
      toast.success(t('toast.supplierActivated'))
      setSelectedSupplier(null)
      invalidateSuppliers()
    } catch (error) {
      const message = error instanceof Error ? error.message : t('toast.supplierActivateError')
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
        <div className="bg-surface rounded-md border border-border p-3">
          <p className="text-[10px] text-fg-muted font-medium">
            {t('suppliers.summary.suppliers')}
          </p>
          <p className="text-sm sm:text-base font-bold text-fg mt-0.5">
            {filteredSuppliers.length}
          </p>
        </div>
        <div className="bg-surface rounded-md border border-border p-3">
          <p className="text-[10px] text-fg-muted font-medium">
            {t('suppliers.summary.directDebits')}
          </p>
          <p className="text-sm sm:text-base font-bold text-purple-600 dark:text-purple-400 mt-0.5">
            {domiciledCount}
          </p>
        </div>
        <div className="bg-surface rounded-md border border-border p-3">
          <p className="text-[10px] text-fg-muted font-medium">{t('paid.summary.transfers')}</p>
          <p className="text-sm sm:text-base font-bold text-blue-600 dark:text-blue-400 mt-0.5">
            {transferCount}
          </p>
        </div>
      </div>

      {/* Status Sub-tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        <button
          onClick={() => {
            setActiveStatusTab('active')
            setSelectedSupplier(null)
          }}
          className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeStatusTab === 'active'
              ? 'border-accent text-accent'
              : 'border-transparent text-fg-muted hover:text-fg'
          }`}
        >
          {t('suppliers.tabs.active')}
        </button>
        <button
          onClick={() => {
            setActiveStatusTab('inactive')
            setSelectedSupplier(null)
          }}
          className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeStatusTab === 'inactive'
              ? 'border-accent text-accent'
              : 'border-transparent text-fg-muted hover:text-fg'
          }`}
        >
          {t('suppliers.tabs.inactive')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        {/* Search */}
        <div className="relative w-full sm:w-48">
          <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fg-subtle" />
          <input
            type="text"
            placeholder={t('filters.searchSupplier')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-border bg-surface text-fg rounded-md focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-transparent"
          />
        </div>

        {/* Category Filter */}
        <SelectDropdown<string>
          value={String(categoryFilter)}
          onChange={(v) => setCategoryFilter(v === 'all' ? 'all' : Number(v))}
          options={[
            { value: 'all', label: t('filters.allCategories') },
            ...categories.map((cat) => ({
              value: String(cat.id),
              label: `${cat.cost_center} - ${cat.department}`,
            })),
          ]}
          className="flex-1 min-w-[180px]"
        />

        {/* Periodicity Filter */}
        <SelectDropdown<string>
          value={periodicityFilter}
          onChange={setPeriodicityFilter}
          options={[
            { value: 'all', label: t('filters.allPeriodicities') },
            { value: 'monthly', label: t('periodicity.monthly') },
            { value: 'bimonthly', label: t('periodicity.bimonthly') },
            { value: 'quarterly', label: t('periodicity.quarterly') },
            { value: 'annual', label: t('periodicity.annual') },
            { value: 'on_demand', label: t('periodicity.onDemand') },
          ]}
          className="w-full sm:w-52"
        />

        {/* Add Supplier */}
        <button
          onClick={handleOpenNewSupplier}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-accent text-accent-fg text-xs font-medium rounded-md hover:bg-accent-hover transition-colors"
        >
          <FiPlus className="w-3.5 h-3.5" />
          {t('actions.newSupplier')}
        </button>
      </div>

      {/* Main Content - Split View on Large Screens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Suppliers List */}
        <div className="lg:col-span-2 bg-surface rounded-md border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-sunken border-b border-border">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-fg uppercase tracking-wider">
                    {t('table.supplier')}
                  </th>
                  <th className="px-3 py-2 text-center text-[10px] font-semibold text-fg uppercase tracking-wider hidden sm:table-cell">
                    {t('table.periodicity')}
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-fg uppercase tracking-wider hidden md:table-cell">
                    {t('table.department')}
                  </th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-fg uppercase tracking-wider">
                    {t('table.totalYtd')}
                  </th>
                  <th className="px-3 py-2 text-center text-[10px] font-semibold text-fg uppercase tracking-wider hidden sm:table-cell">
                    {t('table.invoices')}
                  </th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-xs text-fg-subtle">
                      {t('empty.noSuppliers')}
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((supplier) => {
                    const isSelected = selectedSupplier?.id === supplier.id
                    return (
                      <tr
                        key={supplier.id}
                        onClick={() => setSelectedSupplier(supplier)}
                        className={`hover:bg-surface-hover transition-colors cursor-pointer ${
                          isSelected ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                        }`}
                      >
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-fg">{supplier.name}</span>
                            {supplier.payment_method === 'direct_debit' && (
                              <span className="px-1 py-0.5 text-[8px] font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded">
                                {t('suppliers.dom')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center hidden sm:table-cell">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                            {PERIODICITY_LABELS[supplier.periodicity]}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-fg-muted hidden md:table-cell">
                          {supplier.department || '-'}
                        </td>
                        <td className="px-3 py-2 text-xs text-right font-medium text-fg">
                          {formatCurrency(supplier.ytd_total || 0)}
                        </td>
                        <td className="px-3 py-2 text-xs text-center text-fg-muted hidden sm:table-cell">
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
            <div className="px-3 py-2 border-t border-border flex items-center justify-between">
              <span className="text-xs text-fg-subtle">
                {t('pagination.showingSuppliers', {
                  count: filteredSuppliers.length,
                  total: serverPagination.total,
                })}
                {serverPagination.totalPages > 1 &&
                  ` (${t('pagination.page', { current: serverPagination.page, total: serverPagination.totalPages })})`}
              </span>
              {serverPagination.totalPages > 1 && onPageChange && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onPageChange(serverPagination.page - 1)}
                    disabled={serverPagination.page <= 1}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-fg-muted bg-surface-hover rounded hover:bg-surface-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <FiChevronLeft className="w-3.5 h-3.5" />
                    {t('actions.previous')}
                  </button>
                  <button
                    onClick={() => onPageChange(serverPagination.page + 1)}
                    disabled={serverPagination.page >= serverPagination.totalPages}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-fg-muted bg-surface-hover rounded hover:bg-surface-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {t('actions.next')}
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
            <div className="bg-surface rounded-md border border-border p-4 sticky top-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-fg">{selectedSupplier.name}</h3>
                  <p className="text-[10px] text-fg-subtle mt-0.5">
                    {selectedSupplier.cost_center || t('suppliers.detail.noCategory')}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditSupplier(selectedSupplier)}
                    className="inline-flex items-center justify-center w-7 h-7 text-fg-muted hover:text-accent hover:bg-surface-hover rounded transition-colors"
                    title={t('actions.edit')}
                  >
                    <FiEdit2 className="w-3.5 h-3.5" />
                  </button>
                  {selectedSupplier.is_active ? (
                    <button
                      onClick={() => handleOpenInactivateDialog(selectedSupplier)}
                      className="inline-flex items-center justify-center w-7 h-7 text-fg-muted hover:text-warning hover:bg-surface-hover rounded transition-colors"
                      title={t('actions.inactivate')}
                    >
                      <FiPower className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleActivateSupplier(selectedSupplier)}
                      className="inline-flex items-center justify-center w-7 h-7 text-fg-muted hover:text-success hover:bg-surface-hover rounded transition-colors"
                      title={t('actions.activate')}
                    >
                      <FiRotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleOpenDeleteDialog(selectedSupplier)}
                    disabled={(selectedSupplier.total_invoices || 0) > 0}
                    className="inline-flex items-center justify-center w-7 h-7 text-fg-muted hover:text-red-600 dark:hover:text-red-400 hover:bg-surface-hover rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-fg-muted disabled:hover:bg-transparent"
                    title={
                      (selectedSupplier.total_invoices || 0) > 0
                        ? t('actions.deleteBlockedHasInvoices')
                        : t('actions.delete')
                    }
                  >
                    <FiTrash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setSelectedSupplier(null)}
                    className="inline-flex items-center justify-center w-7 h-7 text-fg-muted hover:text-gray-800 dark:hover:text-gray-200 hover:bg-surface-hover rounded transition-colors"
                    title={t('actions.close')}
                  >
                    <FiX className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 dark:bg-surface rounded p-2">
                    <p className="text-[10px] text-fg-subtle">{t('suppliers.detail.totalYtd')}</p>
                    <p className="text-sm font-bold text-fg">
                      {formatCurrency(selectedSupplier.ytd_total || 0)}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-surface rounded p-2">
                    <p className="text-[10px] text-fg-subtle">{t('suppliers.detail.invoices')}</p>
                    <p className="text-sm font-bold text-fg">
                      {selectedSupplier.total_invoices || 0}
                    </p>
                  </div>
                </div>

                {/* Stats detail */}
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                    <span>{t('suppliers.detail.pending')}</span>
                    <span className="font-medium">{selectedSupplier.pending_invoices || 0}</span>
                  </div>
                  <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <span>{t('suppliers.detail.paid')}</span>
                    <span className="font-medium">{selectedSupplier.paid_invoices || 0}</span>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-fg-muted">
                    <FiCalendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>{t('suppliers.detail.lastInvoice')}</span>
                    <span className="text-fg">
                      {formatDate(selectedSupplier.last_invoice_date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-fg-muted">
                    <FiDollarSign className="w-3.5 h-3.5 text-gray-400" />
                    <span>{t('suppliers.detail.periodicity')}</span>
                    <span className="text-fg">
                      {PERIODICITY_LABELS[selectedSupplier.periodicity]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-fg-muted">
                    <FiFileText className="w-3.5 h-3.5 text-gray-400" />
                    <span>{t('suppliers.detail.paymentMethod')}</span>
                    <span className="text-fg">
                      {PAYMENT_METHOD_LABELS[selectedSupplier.payment_method]}
                    </span>
                  </div>
                </div>

                {/* CIF */}
                {selectedSupplier.cif && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-[10px] text-fg-subtle mb-1">{t('suppliers.detail.cif')}</p>
                    <p className="text-xs text-fg font-mono">{selectedSupplier.cif}</p>
                  </div>
                )}

                {/* Bank Account */}
                {selectedSupplier.bank_account && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-[10px] text-fg-subtle mb-1">
                      {t('suppliers.detail.bankAccount')}
                    </p>
                    <p className="text-xs text-fg font-mono break-all">
                      {selectedSupplier.bank_account}
                    </p>
                  </div>
                )}

                {/* Notes */}
                {selectedSupplier.notes && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-[10px] text-fg-subtle mb-1">{t('suppliers.detail.notes')}</p>
                    <p className="text-xs text-fg">{selectedSupplier.notes}</p>
                  </div>
                )}

                {/* Contact info */}
                {(selectedSupplier.email || selectedSupplier.phone) && (
                  <div className="pt-2 border-t border-border space-y-1">
                    <p className="text-[10px] text-fg-subtle mb-1">
                      {t('suppliers.detail.contact')}
                    </p>
                    {selectedSupplier.email && (
                      <p className="text-xs text-fg-muted">{selectedSupplier.email}</p>
                    )}
                    {selectedSupplier.phone && (
                      <p className="text-xs text-fg-muted">{selectedSupplier.phone}</p>
                    )}
                  </div>
                )}

                {/* Address */}
                {selectedSupplier.address && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-[10px] text-fg-subtle mb-1">
                      {t('suppliers.detail.address')}
                    </p>
                    <p className="text-xs text-fg">{selectedSupplier.address}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-3 flex gap-2">
                  <button
                    onClick={() => setInvoicesModalOpen(true)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 dark:bg-accent text-accent-fg text-xs font-medium rounded-md hover:bg-accent-hover transition-colors"
                  >
                    <FiFileText className="w-3.5 h-3.5" />
                    {t('actions.viewInvoices')}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-surface rounded-md border border-border p-6 text-center">
              <FiFileText className="w-8 h-8 text-fg-subtle mx-auto mb-2" />
              <p className="text-xs text-fg-subtle">{t('empty.selectSupplier')}</p>
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

      {/* Hard-delete Confirmation Dialog (only when no invoices) */}
      {deleteDialogOpen && deletingSupplier && (
        <ConfirmDialog
          isOpen={deleteDialogOpen}
          title={t('modals.deleteSupplier.title')}
          message={t('modals.deleteSupplier.messageEmpty', { name: deletingSupplier.name })}
          confirmText={t('modals.deleteSupplier.confirmButton')}
          variant="danger"
          onClose={() => {
            setDeleteDialogOpen(false)
            setDeletingSupplier(null)
          }}
          onConfirm={handleDeleteSupplier}
        />
      )}

      {/* Inactivate Confirmation Dialog */}
      {inactivateDialogOpen && inactivatingSupplier && (
        <ConfirmDialog
          isOpen={inactivateDialogOpen}
          title={t('modals.inactivateSupplier.title')}
          message={t('modals.inactivateSupplier.message', { name: inactivatingSupplier.name })}
          confirmText={t('modals.inactivateSupplier.confirmButton')}
          variant="warning"
          onClose={() => {
            setInactivateDialogOpen(false)
            setInactivatingSupplier(null)
          }}
          onConfirm={handleInactivateSupplier}
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
