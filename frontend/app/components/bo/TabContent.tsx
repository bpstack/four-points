// app/components/bo/TabContent.tsx
/**
 * Client Component - Tab Content Wrapper
 * 
 * Reads the current tab from URL and renders the appropriate content.
 */

'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import type { TabType } from './TabsNavigation'
import type { InvoiceWithDetails, SupplierWithStats, Category, Asset } from '@/app/lib/backoffice/types'

// Import tab components
import { PendingInvoicesTab } from './tabs/PendingInvoicesTab'
import { PaidInvoicesTab } from './tabs/PaidInvoicesTab'
import { SuppliersTab } from './tabs/SuppliersTab'
import { SettingsTab } from './tabs/SettingsTab'

interface TabContentProps {
  // Initial data passed from server
  pendingInvoices: InvoiceWithDetails[]
  paidInvoices: InvoiceWithDetails[]
  suppliers: SupplierWithStats[]
  categories: Category[]
  assets: Asset[]
  // Pagination info
  pendingPagination: { page: number; total: number; totalPages: number }
  paidPagination: { page: number; total: number; totalPages: number }
}

export function TabContent({
  pendingInvoices,
  paidInvoices,
  suppliers,
  categories,
  assets,
  pendingPagination,
  paidPagination,
}: TabContentProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const currentTab = (searchParams.get('tab') as TabType) || 'pending'

  // Handle page change for paid invoices
  const handlePaidPageChange = useCallback((newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', 'paid')
    params.set('paidPage', newPage.toString())
    router.push(`${pathname}?${params.toString()}`)
  }, [searchParams, router, pathname])

  return (
    <div className="mt-4">
      {currentTab === 'pending' && (
        <PendingInvoicesTab
          initialInvoices={pendingInvoices}
          categories={categories}
          suppliers={suppliers}
          pagination={pendingPagination}
        />
      )}
      {currentTab === 'paid' && (
        <PaidInvoicesTab
          initialInvoices={paidInvoices}
          categories={categories}
          pagination={paidPagination}
          onPageChange={handlePaidPageChange}
        />
      )}
      {currentTab === 'suppliers' && (
        <SuppliersTab
          initialSuppliers={suppliers}
          categories={categories}
        />
      )}
      {currentTab === 'settings' && (
        <SettingsTab
          initialAssets={assets}
        />
      )}
    </div>
  )
}
