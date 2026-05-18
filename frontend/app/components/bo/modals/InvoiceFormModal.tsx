// app/components/bo/modals/InvoiceFormModal.tsx
/**
 * Modal para crear/editar facturas
 * Reutilizable para ambas operaciones
 */

'use client'

import { useState, useEffect, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { FiSave } from 'react-icons/fi'
import { Modal, Input, Select, Textarea, Button } from '@/app/ui/components'
import type {
  InvoiceWithDetails,
  InvoiceFormData,
  Category,
  SupplierWithStats,
  PaymentMethod,
} from '@/app/lib/backoffice/types'
import { applyVat } from '@/app/lib/backoffice/types'
import { backofficeApi } from '@/app/lib/backoffice/backofficeApi'
import DatePickerInput from '@/app/ui/calendar/DatePickerInput'
import toast from 'react-hot-toast'

interface InvoiceFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  invoice?: InvoiceWithDetails | null // Si existe, es edición
  categories: Category[]
  suppliers: SupplierWithStats[]
}

export function InvoiceFormModal({
  isOpen,
  onClose,
  onSuccess,
  invoice,
  categories,
  suppliers,
}: InvoiceFormModalProps) {
  const t = useTranslations('backoffice')
  const [isPending, startTransition] = useTransition()
  const [errors, setErrors] = useState<Record<string, string>>({})

  // VAT options with translations
  const VAT_OPTIONS = [
    { value: 21, label: t('modals.invoice.vat.general') },
    { value: 10, label: t('modals.invoice.vat.reduced') },
    { value: 4, label: t('modals.invoice.vat.superReduced') },
    { value: 0, label: t('modals.invoice.vat.exempt') },
  ]

  // Form state
  const [formData, setFormData] = useState<InvoiceFormData>({
    invoice_number: '',
    supplier_id: 0,
    category_id: undefined,
    amount_without_vat: 0,
    amount_with_vat: 0,
    vat_percentage: 21,
    invoice_date: new Date().toISOString().split('T')[0],
    received_date: new Date().toISOString().split('T')[0],
    billing_period_start: undefined,
    billing_period_end: undefined,
    due_date: undefined,
    payment_method: 'transfer',
    notes: '',
  })

  // Reset form when modal opens/closes or invoice changes
  useEffect(() => {
    if (isOpen) {
      if (invoice) {
        // Edit mode - populate form
        setFormData({
          invoice_number: invoice.invoice_number,
          supplier_id: invoice.supplier_id,
          category_id: invoice.category_id || undefined,
          amount_without_vat: invoice.amount_without_vat,
          amount_with_vat: invoice.amount_with_vat,
          vat_percentage: invoice.vat_percentage,
          invoice_date: invoice.invoice_date.split('T')[0],
          received_date: invoice.received_date?.split('T')[0] || undefined,
          billing_period_start: invoice.billing_period_start?.split('T')[0] || undefined,
          billing_period_end: invoice.billing_period_end?.split('T')[0] || undefined,
          due_date: invoice.due_date?.split('T')[0] || undefined,
          payment_method: invoice.payment_method,
          notes: invoice.notes || '',
        })
      } else {
        // Create mode - reset form
        setFormData({
          invoice_number: '',
          supplier_id: 0,
          category_id: undefined,
          amount_without_vat: 0,
          amount_with_vat: 0,
          vat_percentage: 21,
          invoice_date: new Date().toISOString().split('T')[0],
          received_date: new Date().toISOString().split('T')[0],
          billing_period_start: undefined,
          billing_period_end: undefined,
          due_date: undefined,
          payment_method: 'transfer',
          notes: '',
        })
      }
      setErrors({})
    }
  }, [isOpen, invoice])

  // Auto-calculate amount with VAT when amount without VAT or VAT percentage changes
  const handleAmountChange = (field: 'amount_without_vat' | 'vat_percentage', value: number) => {
    if (field === 'amount_without_vat') {
      const withVat = applyVat(value, formData.vat_percentage || 21)
      setFormData((prev) => ({
        ...prev,
        amount_without_vat: value,
        amount_with_vat: Math.round(withVat * 100) / 100,
      }))
    } else {
      const withVat = applyVat(formData.amount_without_vat, value)
      setFormData((prev) => ({
        ...prev,
        vat_percentage: value,
        amount_with_vat: Math.round(withVat * 100) / 100,
      }))
    }
  }

  // Auto-fill category when supplier changes
  const handleSupplierChange = (supplierId: number) => {
    const supplier = suppliers.find((s) => s.id === supplierId)
    setFormData((prev) => ({
      ...prev,
      supplier_id: supplierId,
      category_id: supplier?.default_category_id || prev.category_id,
      payment_method: supplier?.payment_method || prev.payment_method,
    }))
  }

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.invoice_number.trim()) {
      newErrors.invoice_number = t('modals.invoice.validation.invoiceNumberRequired')
    }
    if (!formData.supplier_id) {
      newErrors.supplier_id = t('modals.invoice.validation.supplierRequired')
    }
    if (!formData.amount_with_vat || formData.amount_with_vat <= 0) {
      newErrors.amount_with_vat = t('modals.invoice.validation.amountRequired')
    }
    if (!formData.invoice_date) {
      newErrors.invoice_date = t('modals.invoice.validation.dateRequired')
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
        if (invoice) {
          // Update existing invoice
          await backofficeApi.updateInvoice(invoice.id, formData)
          toast.success(t('toast.invoiceUpdated'))
        } else {
          // Create new invoice
          await backofficeApi.createInvoice(formData)
          toast.success(t('toast.invoiceCreated'))
        }
        onSuccess()
        onClose()
      } catch (error) {
        const message = error instanceof Error ? error.message : t('toast.invoiceSaveError')
        toast.error(message)
      }
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={invoice ? t('modals.invoice.editTitle') : t('modals.invoice.createTitle')}
      size="md"
      static={isPending}
      footer={
        <>
          <Button type="button" variant="default" onClick={onClose} disabled={isPending}>
            {t('actions.cancel')}
          </Button>
          <Button type="submit" form="invoice-form" variant="accent" loading={isPending}>
            <FiSave className="w-4 h-4" />
            {invoice ? t('modals.invoice.buttons.update') : t('modals.invoice.buttons.create')}
          </Button>
        </>
      }
    >
      <form id="invoice-form" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label={`${t('modals.invoice.fields.invoiceNumber')} *`}
            value={formData.invoice_number}
            onChange={(e) => setFormData((prev) => ({ ...prev, invoice_number: e.target.value }))}
            placeholder={t('modals.invoice.placeholders.invoiceNumber')}
            error={errors.invoice_number}
          />

          <Select
            label={`${t('modals.invoice.fields.supplier')} *`}
            value={formData.supplier_id ? String(formData.supplier_id) : ''}
            onChange={(e) => handleSupplierChange(Number(e.target.value))}
            options={suppliers.map((s) => ({ value: String(s.id), label: s.name }))}
            placeholder={t('modals.invoice.placeholders.selectSupplier')}
            error={errors.supplier_id}
          />

          <Select
            label={t('modals.invoice.fields.category')}
            value={formData.category_id != null ? String(formData.category_id) : ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                category_id: e.target.value ? Number(e.target.value) : undefined,
              }))
            }
            options={[
              { value: '', label: t('modals.invoice.placeholders.noCategory') },
              ...categories.map((c) => ({
                value: String(c.id),
                label: `${c.cost_center} - ${c.department}`,
              })),
            ]}
          />

          <div>
            <DatePickerInput
              label={t('modals.invoice.fields.invoiceDate')}
              value={formData.invoice_date}
              onChange={(value) => setFormData((prev) => ({ ...prev, invoice_date: value || '' }))}
              required
              error={errors.invoice_date}
              placeholder={t('modals.invoice.placeholders.selectDate')}
            />
          </div>

          <Input
            label={t('modals.invoice.fields.amountWithoutVat')}
            type="number"
            step="0.01"
            min="0"
            value={formData.amount_without_vat || ''}
            onChange={(e) =>
              handleAmountChange('amount_without_vat', parseFloat(e.target.value) || 0)
            }
            placeholder="0.00"
            mono
          />

          <Select
            label={t('modals.invoice.fields.vatPercentage')}
            value={String(formData.vat_percentage)}
            onChange={(e) => handleAmountChange('vat_percentage', Number(e.target.value))}
            options={VAT_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))}
          />

          <Input
            label={`${t('modals.invoice.fields.amountWithVat')} *`}
            type="number"
            step="0.01"
            min="0"
            value={formData.amount_with_vat || ''}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                amount_with_vat: parseFloat(e.target.value) || 0,
              }))
            }
            placeholder="0.00"
            error={errors.amount_with_vat}
            mono
          />

          <Select
            label={t('modals.invoice.fields.paymentMethod')}
            value={formData.payment_method}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                payment_method: e.target.value as PaymentMethod,
              }))
            }
            options={[
              { value: 'transfer', label: t('modals.invoice.paymentMethods.transfer') },
              { value: 'direct_debit', label: t('modals.invoice.paymentMethods.directDebit') },
            ]}
          />

          <div>
            <DatePickerInput
              label={t('modals.invoice.fields.receivedDate')}
              value={formData.received_date}
              onChange={(value) => setFormData((prev) => ({ ...prev, received_date: value }))}
              placeholder={t('modals.invoice.placeholders.selectDate')}
              clearable
            />
          </div>

          <div>
            <DatePickerInput
              label={t('modals.invoice.fields.dueDate')}
              value={formData.due_date}
              onChange={(value) => setFormData((prev) => ({ ...prev, due_date: value }))}
              placeholder={t('modals.invoice.placeholders.selectDate')}
              clearable
            />
          </div>

          <div>
            <DatePickerInput
              label={t('modals.invoice.fields.periodStart')}
              value={formData.billing_period_start}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, billing_period_start: value }))
              }
              placeholder={t('modals.invoice.placeholders.selectDate')}
              clearable
            />
          </div>

          <div>
            <DatePickerInput
              label={t('modals.invoice.fields.periodEnd')}
              value={formData.billing_period_end}
              onChange={(value) => setFormData((prev) => ({ ...prev, billing_period_end: value }))}
              placeholder={t('modals.invoice.placeholders.selectDate')}
              minDate={
                formData.billing_period_start
                  ? new Date(formData.billing_period_start + 'T12:00:00')
                  : null
              }
              clearable
            />
          </div>

          <div className="md:col-span-2">
            <Textarea
              label={t('modals.invoice.fields.notes')}
              value={formData.notes || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              rows={2}
              resize="none"
              placeholder={t('modals.invoice.placeholders.notes')}
            />
          </div>
        </div>
      </form>
    </Modal>
  )
}
