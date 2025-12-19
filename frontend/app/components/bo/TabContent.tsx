// app/components/bo/TabContent.tsx
/**
 * Client Component - Tab Content Wrapper
 * 
 * Reads the current tab from URL and renders the appropriate content.
 */

'use client'

import { useSearchParams } from 'next/navigation'
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
  const currentTab = (searchParams.get('tab') as TabType) || 'pending'

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
