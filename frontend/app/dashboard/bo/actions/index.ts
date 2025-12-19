// app/dashboard/bo/actions/index.ts
/**
 * Server Actions for Backoffice module
 * 
 * Pattern: Server Actions for data mutations
 * - All functions marked with 'use server'
 * - Return structured responses { success, error, data }
 * - Use revalidatePath/revalidateTag after mutations
 * - Can be called from Client Components via form actions or direct calls
 */

export * from './invoices'
export * from './suppliers'
