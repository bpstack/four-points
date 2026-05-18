// app/components/bo/modals/SupplierFormModal.tsx
/**
 * Modal para crear/editar proveedores
 * Reutilizable para ambas operaciones
 */

'use client'

import { useState, useEffect, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { FiSave } from 'react-icons/fi'
import { Modal, Input, Select, Textarea, Button, ConfirmDialog } from '@/app/ui/components'
import type {
  SupplierWithStats,
  SupplierFormData,
  Category,
  Periodicity,
  PaymentMethod,
} from '@/app/lib/backoffice/types'
import { backofficeApi } from '@/app/lib/backoffice/backofficeApi'
import { ApiError } from '@/app/lib/apiClient'
import toast from 'react-hot-toast'

interface SupplierFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  supplier?: SupplierWithStats | null // Si existe, es edición
  categories: Category[]
}

export function SupplierFormModal({
  isOpen,
  onClose,
  onSuccess,
  supplier,
  categories,
}: SupplierFormModalProps) {
  const t = useTranslations('backoffice')
  const [isPending, startTransition] = useTransition()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [reactivateModal, setReactivateModal] = useState<{
    open: boolean
    existingId: number | null
    name: string
  }>({ open: false, existingId: null, name: '' })

  // Periodicity options with translations
  const PERIODICITY_OPTIONS: { value: Periodicity; label: string }[] = [
    { value: 'monthly', label: t('periodicity.monthly') },
    { value: 'bimonthly', label: t('periodicity.bimonthly') },
    { value: 'quarterly', label: t('periodicity.quarterly') },
    { value: 'annual', label: t('periodicity.annual') },
    { value: 'on_demand', label: t('periodicity.onDemand') },
  ]

  // Payment method options with translations
  const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
    { value: 'transfer', label: t('filters.transfer') },
    { value: 'direct_debit', label: t('filters.directDebit') },
  ]

  // Form state
  const [formData, setFormData] = useState<SupplierFormData>({
    name: '',
    cif: '',
    default_category_id: undefined,
    periodicity: 'monthly',
    payment_method: 'transfer',
    bank_account: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
  })

  // Reset form when modal opens/closes or supplier changes
  useEffect(() => {
    if (isOpen) {
      if (supplier) {
        // Edit mode - populate form
        setFormData({
          name: supplier.name,
          cif: supplier.cif || '',
          default_category_id: supplier.default_category_id || undefined,
          periodicity: supplier.periodicity,
          payment_method: supplier.payment_method,
          bank_account: supplier.bank_account || '',
          email: supplier.email || '',
          phone: supplier.phone || '',
          address: supplier.address || '',
          notes: supplier.notes || '',
        })
      } else {
        // Create mode - reset form
        setFormData({
          name: '',
          cif: '',
          default_category_id: undefined,
          periodicity: 'monthly',
          payment_method: 'transfer',
          bank_account: '',
          email: '',
          phone: '',
          address: '',
          notes: '',
        })
      }
      setErrors({})
    }
  }, [isOpen, supplier])

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = t('modals.supplier.validation.nameRequired')
    }

    // Validate tax ID format if provided (CIF español o VAT extranjero)
    // Acepta: CIF español (B12345678), VAT europeo (DE123456789, FR12345678901), o genérico (5-20 alfanuméricos)
    if (formData.cif && formData.cif.trim()) {
      const taxIdRegex = /^[A-Za-z0-9]{5,20}$/
      const cleanedTaxId = formData.cif.replace(/[\s.-]/g, '').toUpperCase()
      if (!taxIdRegex.test(cleanedTaxId)) {
        newErrors.cif = t('modals.supplier.validation.cifInvalid')
      }
    }

    // Validate email format if provided
    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = t('modals.supplier.validation.emailInvalid')
      }
    }

    // Validate IBAN format if provided (universal format: 2 letters + 2 digits + 11-30 alphanumeric)
    if (formData.bank_account && formData.bank_account.trim()) {
      const ibanRegex = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/
      const cleanedIban = formData.bank_account.replace(/\s/g, '').toUpperCase()
      if (!ibanRegex.test(cleanedIban)) {
        newErrors.bank_account = t('modals.supplier.validation.ibanInvalid')
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    startTransition(async () => {
      try {
        // Clean up data before sending
        const cleanData: SupplierFormData = {
          name: formData.name.trim(),
          cif: formData.cif?.trim() || undefined,
          default_category_id: formData.default_category_id || undefined,
          periodicity: formData.periodicity,
          payment_method: formData.payment_method,
          bank_account: formData.bank_account?.trim() || undefined,
          email: formData.email?.trim() || undefined,
          phone: formData.phone?.trim() || undefined,
          address: formData.address?.trim() || undefined,
          notes: formData.notes?.trim() || undefined,
        }

        if (supplier) {
          // Update existing supplier
          await backofficeApi.updateSupplier(supplier.id, cleanData)
          toast.success(t('toast.supplierUpdated'))
        } else {
          // Create new supplier
          await backofficeApi.createSupplier(cleanData)
          toast.success(t('toast.supplierCreated'))
        }
        onSuccess()
        onClose()
      } catch (error) {
        // Si el backend reporta que existe un proveedor inactivo con ese nombre,
        // ofrecer reactivarlo en lugar de fallar.
        if (
          error instanceof ApiError &&
          error.status === 409 &&
          error.code === 'BACKOFFICE_SUPPLIER_INACTIVE_EXISTS' &&
          typeof error.body?.existingId === 'number'
        ) {
          setReactivateModal({
            open: true,
            existingId: error.body.existingId as number,
            name: formData.name.trim(),
          })
          return
        }
        const message = error instanceof Error ? error.message : t('toast.supplierSaveError')
        toast.error(message)
      }
    })
  }

  const handleReactivateConfirm = async () => {
    if (!reactivateModal.existingId) return
    try {
      await backofficeApi.activateSupplier(reactivateModal.existingId)
      toast.success(t('toast.supplierActivated'))
      setReactivateModal({ open: false, existingId: null, name: '' })
      onSuccess()
      onClose()
    } catch (error) {
      const message = error instanceof Error ? error.message : t('toast.supplierActivateError')
      toast.error(message)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={supplier ? t('modals.supplier.editTitle') : t('modals.supplier.createTitle')}
      size="md"
      static={isPending}
      footer={
        <>
          <Button type="button" variant="default" onClick={onClose} disabled={isPending}>
            {t('actions.cancel')}
          </Button>
          <Button type="submit" form="supplier-form" variant="accent" loading={isPending}>
            <FiSave className="w-4 h-4" />
            {supplier ? t('modals.supplier.buttons.update') : t('modals.supplier.buttons.create')}
          </Button>
        </>
      }
    >
      <form id="supplier-form" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input
              label={`${t('modals.supplier.fields.name')} *`}
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder={t('modals.supplier.placeholders.name')}
              error={errors.name}
            />
          </div>

          <Input
            label={t('modals.supplier.fields.cif')}
            value={formData.cif || ''}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, cif: e.target.value.toUpperCase() }))
            }
            placeholder={t('modals.supplier.placeholders.cif')}
            maxLength={9}
            error={errors.cif}
            mono
          />

          <Select
            label={t('modals.supplier.fields.defaultCategory')}
            value={formData.default_category_id != null ? String(formData.default_category_id) : ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                default_category_id: e.target.value ? Number(e.target.value) : undefined,
              }))
            }
            options={[
              { value: '', label: t('modals.supplier.placeholders.noCategory') },
              ...categories.map((c) => ({
                value: String(c.id),
                label: `${c.cost_center} - ${c.department}`,
              })),
            ]}
          />

          <Select
            label={t('modals.supplier.fields.periodicity')}
            value={formData.periodicity}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, periodicity: e.target.value as Periodicity }))
            }
            options={PERIODICITY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />

          <Select
            label={t('modals.supplier.fields.paymentMethod')}
            value={formData.payment_method}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                payment_method: e.target.value as PaymentMethod,
              }))
            }
            options={PAYMENT_METHOD_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />

          <div className="md:col-span-2">
            <Input
              label={t('modals.supplier.fields.bankAccount')}
              value={formData.bank_account || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  bank_account: e.target.value.toUpperCase(),
                }))
              }
              placeholder={t('modals.supplier.placeholders.bankAccount')}
              error={errors.bank_account}
              mono
            />
          </div>

          <Input
            label={t('modals.supplier.fields.email')}
            type="email"
            value={formData.email || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
            placeholder={t('modals.supplier.placeholders.email')}
            error={errors.email}
          />

          <Input
            label={t('modals.supplier.fields.phone')}
            type="tel"
            value={formData.phone || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
            placeholder={t('modals.supplier.placeholders.phone')}
          />

          <div className="md:col-span-2">
            <Input
              label={t('modals.supplier.fields.address')}
              value={formData.address || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
              placeholder={t('modals.supplier.placeholders.address')}
            />
          </div>

          <div className="md:col-span-2">
            <Textarea
              label={t('modals.supplier.fields.notes')}
              value={formData.notes || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              rows={2}
              resize="none"
              placeholder={t('modals.supplier.placeholders.notes')}
            />
          </div>
        </div>
      </form>

      {reactivateModal.open && (
        <ConfirmDialog
          isOpen={reactivateModal.open}
          title={t('modals.reactivateSupplier.title')}
          message={t('modals.reactivateSupplier.message', { name: reactivateModal.name })}
          confirmText={t('modals.reactivateSupplier.confirmButton')}
          cancelText={t('actions.cancel')}
          variant="info"
          onClose={() => setReactivateModal({ open: false, existingId: null, name: '' })}
          onConfirm={handleReactivateConfirm}
        />
      )}
    </Modal>
  )
}
