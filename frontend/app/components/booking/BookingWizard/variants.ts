// app/components/booking/BookingWizard/variants.ts

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export type WizardVariant = 'full' | 'modal'

// Utility para combinar clases
export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs))
}

// Configuración de estilos por variante
export const wizardStyles = {
  full: {
    // Contenedores principales
    container: 'min-h-screen bg-white dark:bg-[#010409] p-4 sm:p-6',
    wrapper: 'max-w-3xl mx-auto',
    card: 'bg-[#f6f8fa] dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-md p-5',

    // Headers
    title: 'text-3xl font-semibold text-[#24292f] dark:text-[#f0f6fc] mb-4',
    subtitle: 'text-sm text-[#57606a] dark:text-[#8b949e]',
    sectionTitle: 'text-lg font-medium text-[#24292f] dark:text-[#f0f6fc]',

    // Progress bar
    progressContainer: 'mt-3 flex gap-1',
    progressBar: (isActive: boolean) =>
      cn(
        'h-0.5 flex-1 rounded-full transition-colors',
        isActive ? 'bg-[#0969da] dark:bg-[#1f6feb]' : 'bg-[#d0d7de] dark:bg-[#30363d]'
      ),

    // Inputs
    input:
      'w-full px-3 py-2 bg-white dark:bg-[#0d1117] border border-[#d0d7de] dark:border-[#30363d] rounded-md text-[#24292f] dark:text-[#c9d1d9] placeholder-[#57606a] dark:placeholder-[#8b949e] focus:outline-none focus:ring-1 focus:ring-[#0969da] dark:focus:ring-[#1f6feb] text-sm',
    label: 'block text-sm font-medium text-[#24292f] dark:text-[#c9d1d9] mb-1',

    // Buttons
    buttonPrimary:
      'px-4 py-2 bg-[#0969da] hover:bg-[#0550ae] dark:bg-[#1f6feb] dark:hover:bg-[#1158c7] disabled:bg-[#d0d7de] dark:disabled:bg-[#30363d] disabled:text-[#8c959f] text-white rounded-md font-medium transition text-sm',
    buttonSecondary:
      'px-4 py-2 bg-[#f6f8fa] hover:bg-[#eaeef2] dark:bg-[#21262d] dark:hover:bg-[#30363d] text-[#24292f] dark:text-[#c9d1d9] rounded-md font-medium transition text-sm',
    buttonSuccess:
      'px-4 py-2 bg-[#1a7f37] hover:bg-[#116329] dark:bg-[#238636] dark:hover:bg-[#2ea043] disabled:bg-[#d0d7de] dark:disabled:bg-[#30363d] disabled:text-[#8c959f] text-white rounded-md font-medium transition text-sm',

    // Alerts
    alertInfo:
      'mb-4 p-3 bg-[#ddf4ff] dark:bg-[#051d30] border border-[#9cd7ff] dark:border-[#1f6feb] rounded-md flex gap-2 text-sm text-[#0969da] dark:text-[#58a6ff]',
    alertError:
      'mb-4 p-3 bg-[#fff8c5] dark:bg-[#3c2c00] border border-[#d4a72c] dark:border-[#9e6a03] rounded-md flex gap-2 text-sm text-[#9a6700] dark:text-[#f2cc60]',
    alertSuccess:
      'mb-4 p-3 bg-[#ddf4ff] dark:bg-[#051d30] border border-[#9cd7ff] dark:border-[#1f6feb] rounded-md flex gap-2 text-sm text-[#0969da] dark:text-[#58a6ff]',

    // Spot grid
    spotGrid:
      'grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto p-2 bg-[#f6f8fa] dark:bg-[#0d1117] border border-[#d0d7de] dark:border-[#30363d] rounded-md',
    spotCard: (isSelected: boolean) =>
      cn(
        'p-3 rounded-md border-2 transition text-center',
        isSelected
          ? 'bg-[#ddf4ff] dark:bg-[#051d30] border-[#0969da] dark:border-[#1f6feb]'
          : 'bg-white dark:bg-[#161b22] border-[#d0d7de] dark:border-[#30363d] hover:border-[#0969da] dark:hover:border-[#58a6ff]'
      ),
  },

  modal: {
    // Contenedores principales
    container: 'p-6 max-h-[60vh] overflow-y-auto',
    wrapper: 'space-y-5',
    card: 'space-y-5',

    // Headers
    title: 'text-base font-semibold text-gray-900 dark:text-gray-100 mb-1',
    subtitle: 'text-sm text-gray-600 dark:text-gray-400',
    sectionTitle: 'text-base font-semibold text-gray-900 dark:text-gray-100',

    // Progress bar (indicador de pasos)
    progressContainer:
      'px-6 py-4 bg-gray-50/50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-800',
    progressBar: (isActive: boolean) =>
      cn(
        'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200',
        isActive
          ? 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-500/30'
          : 'bg-gray-200 dark:bg-slate-800 text-gray-500 dark:text-gray-400'
      ),

    // Inputs
    input:
      'w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all',
    label: 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2',

    // Buttons
    buttonPrimary:
      'flex-1 px-5 py-3 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed',
    buttonSecondary:
      'px-5 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl transition-all duration-200',
    buttonSuccess:
      'flex-1 px-5 py-3 text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed',

    // Alerts
    alertInfo:
      'p-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 border border-indigo-200 dark:border-indigo-800 rounded-xl text-sm font-medium text-indigo-900 dark:text-indigo-200',
    alertError:
      'mb-4 p-4 bg-rose-50 dark:bg-rose-950/20 border-l-4 border-rose-500 rounded-r-lg text-sm text-rose-900 dark:text-rose-200',
    alertSuccess:
      'p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm font-medium text-emerald-900 dark:text-emerald-200',

    // No spot grid en modal (spot pre-seleccionado)
    spotGrid: '',
    spotCard: () => '',
  },
}

// Helper para obtener estilos según variante
export const getStyles = (variant: WizardVariant = 'full') => {
  return wizardStyles[variant]
}
