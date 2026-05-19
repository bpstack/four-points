// app/components/bo/tabs/SuppliersTab.tsx
/**
 * Client Component - Suppliers Tab
 *
 * Interactive list with master-detail view.
 * Receives initial data from server.
 */

'use client'

import { useState } from 'react'
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
} from 'react-icons/fi'
import type { SupplierWithStats, Category } from '@/app/lib/backoffice/types'
import { formatCurrency } from '@/app/lib/backoffice/types'
import { SupplierFormModal, ConfirmDialog, SupplierInvoicesModal } from '@/app/components/bo/modals'
import { backofficeApi } from '@/app/lib/backoffice/backofficeApi'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { SelectDropdown } from '@/app/ui/components/SelectDropdown'

interface SuppliersTabProps {
  initialSuppliers: SupplierWithStats[]
  categories: Category[]
  pagination: { page: number; total: number; totalPages: number }
  onPageChange?: (page: number) => void
}

export function SuppliersTab({
  initialSuppliers,
  categories,
  pagination,
  onPageChange,
}: SuppliersTabProps) {
  const t = useTranslations('backoffice')
  const router = useRouter()
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

  // Client-side filtering
  // Use initialSuppliers directly - it gets updated on router.refresh()
  const filteredSuppliers = initialSuppliers.filter((supplier) => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory =
      categoryFilter === 'all' || supplier.default_category_id === categoryFilter
    const matchesPeriodicity =
      periodicityFilter === 'all' || supplier.periodicity === periodicityFilter
    return matchesSearch && matchesCategory && matchesPeriodicity
  })

  // Helper to get periodicity label from translations
  const getPeriodicityLabel = (periodicity: string): string => {
    const periodicityKeys: Record<string, string> = {
      monthly: 'monthly',
      bimonthly: 'bimonthly',
      quarterly: 'quarterly',
      annual: 'annual',
      on_demand: 'onDemand',
    }
    const key = periodicityKeys[periodicity] || periodicity
    return t(`periodicity.${key}`)
  }

  // Helper to get payment method label from translations
  const getPaymentMethodLabel = (method: string): string => {
    return method === 'transfer' ? t('filters.transfer') : t('filters.directDebit')
  }

  const formatDate = (date: string | null) => (date ? formatDateDisplayShort(date) : '-')

  // Handle refresh after mutations
  const handleMutationSuccess = () => {
    router.refresh()
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
      toast.success(t('toast.supplierDeleted'))
      setDeleteDialogOpen(false)
      setDeletingSupplier(null)
      setSelectedSupplier(null)
      handleMutationSuccess()
    } catch (error) {
      const message = error instanceof Error ? error.message : t('toast.supplierDeleteError')
      toast.error(message)
    }
  }

  // Summary stats
  const totalYTD = filteredSuppliers.reduce((sum, s) => sum + (s.ytd_total || 0), 0)
  const domiciledCount = filteredSuppliers.filter((s) => s.payment_method === 'direct_debit').length

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
          <p className="text-[10px] text-fg-muted font-medium">{t('suppliers.summary.totalYtd')}</p>
          <p className="text-sm sm:text-base font-bold text-fg mt-0.5">
            {formatCurrency(totalYTD)}
          </p>
        </div>
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
                            {getPeriodicityLabel(supplier.periodicity)}
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
          {pagination.total > 0 && (
            <div className="px-3 py-2 border-t border-border flex items-center justify-between">
              <span className="text-xs text-fg-subtle">
                {t('pagination.showingSuppliers', {
                  count: filteredSuppliers.length,
                  total: pagination.total,
                })}
                {pagination.totalPages > 1 &&
                  ` (${t('pagination.page', { current: pagination.page, total: pagination.totalPages })})`}
              </span>
              {pagination.totalPages > 1 && onPageChange && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onPageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-fg-muted bg-surface-hover rounded hover:bg-surface-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <FiChevronLeft className="w-3.5 h-3.5" />
                    {t('actions.previous')}
                  </button>
                  <button
                    onClick={() => onPageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
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
                  <button
                    onClick={() => handleOpenDeleteDialog(selectedSupplier)}
                    className="inline-flex items-center justify-center w-7 h-7 text-fg-muted hover:text-red-600 dark:hover:text-red-400 hover:bg-surface-hover rounded transition-colors"
                    title={t('actions.delete')}
                  >
                    <FiTrash2 className="w-3.5 h-3.5" />
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
                      {getPeriodicityLabel(selectedSupplier.periodicity)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-fg-muted">
                    <FiFileText className="w-3.5 h-3.5 text-gray-400" />
                    <span>{t('suppliers.detail.paymentMethod')}</span>
                    <span className="text-fg">
                      {getPaymentMethodLabel(selectedSupplier.payment_method)}
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
      <SupplierFormModal
        isOpen={supplierModalOpen}
        onClose={() => {
          setSupplierModalOpen(false)
          setEditingSupplier(null)
        }}
        onSuccess={handleMutationSuccess}
        supplier={editingSupplier}
        categories={categories}
      />

      {/* Delete Confirmation Dialog */}
      {deletingSupplier && (
        <ConfirmDialog
          isOpen={deleteDialogOpen}
          onClose={() => {
            setDeleteDialogOpen(false)
            setDeletingSupplier(null)
          }}
          onConfirm={handleDeleteSupplier}
          title={t('modals.deleteSupplier.title')}
          message={
            deletingSupplier.total_invoices > 0
              ? t('modals.deleteSupplier.messageWithInvoices', {
                  name: deletingSupplier.name,
                  count: deletingSupplier.total_invoices,
                })
              : t('modals.deleteSupplier.messageEmpty', { name: deletingSupplier.name })
          }
          confirmText={t('modals.deleteSupplier.confirmButton')}
          cancelText={t('actions.cancel')}
          variant="danger"
          disableConfirm={deletingSupplier.total_invoices > 0}
        />
      )}

      {/* Supplier Invoices Modal */}
      {selectedSupplier && (
        <SupplierInvoicesModal
          isOpen={invoicesModalOpen}
          onClose={() => setInvoicesModalOpen(false)}
          supplier={selectedSupplier}
          onInvoiceDeleted={handleMutationSuccess}
        />
      )}
    </div>
  )
}
