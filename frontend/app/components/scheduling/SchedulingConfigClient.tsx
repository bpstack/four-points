// app/components/scheduling/SchedulingConfigClient.tsx

'use client'

import { useTranslations } from 'next-intl'
import { useState, useCallback, useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { schedulingApi, schedulingKeys } from '@/app/lib/scheduling'
import type {
  SchedulingConfigMap,
  SchedulingShift,
  SchedulingEmployeeRule,
  CreateEmployeeRuleDto,
  EmployeeRuleType,
  CreateShiftDto,
  UpdateShiftDto,
} from '@/app/lib/scheduling'
import { getShiftClasses } from '@/app/lib/scheduling'
import toast from 'react-hot-toast'
import Link from 'next/link'
import {
  FiArrowLeft,
  FiSettings,
  FiUsers,
  FiCalendar,
  FiSave,
  FiPlus,
  FiTrash2,
  FiEdit2,
  FiX,
  FiCheck,
  FiUserCheck,
  FiCalendar as FiCalendarOff,
  FiBarChart2,
} from 'react-icons/fi'
import { EmployeeTotals } from './EmployeeTotals'

type TabType = 'employees' | 'totals' | 'general' | 'rules' | 'requests'

const VALID_TABS: TabType[] = ['employees', 'totals', 'general', 'rules', 'requests']

interface Employee {
  id: string
  username: string
}

export function SchedulingConfigClient() {
  const t = useTranslations('scheduling')
  const tConfig = useTranslations('scheduling.config')
  const tMessages = useTranslations('scheduling.messages')
  const _queryClient = useQueryClient()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Get active tab from URL, default to 'employees'
  const tabParam = searchParams.get('tab')
  const activeTab: TabType = VALID_TABS.includes(tabParam as TabType)
    ? (tabParam as TabType)
    : 'employees'

  // Update URL when tab changes
  const setActiveTab = useCallback(
    (tab: TabType) => {
      const params = new URLSearchParams(searchParams.toString())
      if (tab === 'employees') {
        params.delete('tab') // Default tab, no need in URL
      } else {
        params.set('tab', tab)
      }
      const query = params.toString()
      router.push(`${pathname}${query ? `?${query}` : ''}`, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  // Fetch configuration
  const { data: config, isLoading: loadingConfig } = useQuery({
    queryKey: schedulingKeys.configMap(),
    queryFn: schedulingApi.getConfigMap,
  })

  // Fetch shifts
  const { data: shifts = [], isLoading: loadingShifts } = useQuery({
    queryKey: schedulingKeys.shifts(),
    queryFn: schedulingApi.getAllShifts,
  })

  // Fetch employee rules
  const { data: rulesData, isLoading: loadingRules } = useQuery({
    queryKey: schedulingKeys.rules(),
    queryFn: schedulingApi.getAllRules,
  })

  // Fetch AI status (for isProduction flag)
  const { data: aiStatus } = useQuery({
    queryKey: schedulingKeys.aiStatus(),
    queryFn: schedulingApi.getAIStatus,
    refetchOnWindowFocus: false,
  })

  const rules = rulesData?.rules || []

  const tabs = [
    { id: 'employees' as TabType, label: tConfig('tabs.employees'), icon: FiUserCheck },
    { id: 'totals' as TabType, label: tConfig('tabs.totals'), icon: FiBarChart2 },
    { id: 'general' as TabType, label: tConfig('tabs.general'), icon: FiSettings },
    { id: 'rules' as TabType, label: tConfig('tabs.rules'), icon: FiUsers },
    { id: 'requests' as TabType, label: tConfig('tabs.requests'), icon: FiCalendarOff },
  ]

  const isLoading = loadingConfig || loadingShifts || loadingRules

  return (
    <div className="min-h-screen bg-white dark:bg-[#010409] p-4 md:p-6">
      <div className="max-w-[1400px] space-y-5">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/scheduling"
            className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <FiArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
              {t('page.configTitle')}
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              {t('page.configSubtitle')}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-800">
          <nav className="flex gap-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors
                  ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }
                `}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-[#151b23] rounded-md border border-gray-200 dark:border-gray-800">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-solid border-blue-600 dark:border-blue-500 border-r-transparent"></div>
              <p className="mt-3 text-xs text-gray-600 dark:text-gray-400">
                {tMessages('loadingConfig')}
              </p>
            </div>
          ) : (
            <>
              {activeTab === 'employees' && <EmployeesTab />}
              {activeTab === 'totals' && <TotalsTab />}
              {activeTab === 'general' && config && (
                <GeneralConfigTab
                  config={config}
                  shifts={shifts}
                  isProduction={aiStatus?.isProduction ?? false}
                  aiEnabled={aiStatus?.enabled ?? false}
                />
              )}
              {activeTab === 'rules' && <RulesTab rules={rules} />}
              {activeTab === 'requests' && <RequestsTab />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// EMPLOYEES TAB
// ============================================

interface EmployeeWithStatus {
  id: string
  username: string
  role_id: number
  is_schedulable: boolean
}

function EmployeesTab() {
  const _t = useTranslations('scheduling')
  const tConfig = useTranslations('scheduling.config')
  const tActions = useTranslations('scheduling.actions')
  const tToasts = useTranslations('scheduling.toasts')
  const tMessages = useTranslations('scheduling.messages')

  const queryClient = useQueryClient()

  // Fetch all employees with their schedulable status
  const { data: employees = [], isLoading } = useQuery<EmployeeWithStatus[]>({
    queryKey: schedulingKeys.employeesAll(),
    queryFn: schedulingApi.getAllEmployeesWithStatus,
  })

  const [selectedIds, setSelectedIds] = useState<Set<string> | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  // Initialize selected IDs when data loads
  useEffect(() => {
    if (employees.length > 0 && selectedIds === null) {
      const initialSelected = new Set(employees.filter((e) => e.is_schedulable).map((e) => e.id))
      setSelectedIds(initialSelected)
    }
  }, [employees, selectedIds])

  const currentSelected = selectedIds ?? new Set<string>()

  const toggleEmployee = (id: string) => {
    const newSelected = new Set(currentSelected)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
    setHasChanges(true)
  }

  const selectAll = () => {
    setSelectedIds(new Set(employees.map((e) => e.id)))
    setHasChanges(true)
  }

  const selectNone = () => {
    setSelectedIds(new Set())
    setHasChanges(true)
  }

  const saveMutation = useMutation({
    mutationFn: (ids: string[]) => schedulingApi.setSchedulableEmployees(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulingKeys.employeesAll() })
      queryClient.invalidateQueries({ queryKey: schedulingKeys.employees() })
      queryClient.invalidateQueries({ queryKey: schedulingKeys.all })
      toast.success(tToasts('employeesUpdated'))
      setHasChanges(false)
    },
    onError: () => {
      toast.error(tToasts('saveError'))
    },
  })

  const handleSave = () => {
    saveMutation.mutate(Array.from(currentSelected))
  }

  if (isLoading || selectedIds === null) {
    return (
      <div className="p-12 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-solid border-blue-600 dark:border-blue-500 border-r-transparent"></div>
        <p className="mt-3 text-xs text-gray-600 dark:text-gray-400">
          {tMessages('loadingEmployees')}
        </p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {tConfig('employees.title')}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {tConfig('employees.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {tConfig('employees.selectedCount', {
              selected: currentSelected.size,
              total: employees.length,
            })}
          </span>
          <button
            onClick={selectAll}
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            {tActions('all')}
          </button>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <button
            onClick={selectNone}
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            {tActions('none')}
          </button>
        </div>
      </div>

      <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
        <div>
          {employees.map((employee, index) => (
            <div
              key={employee.id}
              className={`flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer ${
                index !== employees.length - 1
                  ? 'border-b border-gray-100 dark:border-gray-800'
                  : ''
              }`}
              onClick={() => toggleEmployee(employee.id)}
            >
              <input
                type="checkbox"
                checked={currentSelected.has(employee.id)}
                onChange={() => toggleEmployee(employee.id)}
                className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-800"
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  {employee.username}
                </span>
              </div>
              {!hasChanges &&
                (employee.is_schedulable ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    {tConfig('employees.active')}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500">
                    {tConfig('employees.excluded')}
                  </span>
                ))}
            </div>
          ))}
        </div>
      </div>

      {employees.length === 0 && (
        <div className="text-center py-8">
          <FiUsers className="w-10 h-10 mx-auto text-gray-400 mb-3" />
          <p className="text-sm text-gray-600 dark:text-gray-400">{tMessages('noEmployees')}</p>
        </div>
      )}

      {hasChanges && (
        <div className="flex justify-end mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <FiSave className="w-4 h-4" />
            {saveMutation.isPending ? tActions('saving') : tActions('save')}
          </button>
        </div>
      )}
    </div>
  )
}

// ============================================
// GENERAL CONFIG TAB
// ============================================

interface GeneralConfigTabProps {
  config: SchedulingConfigMap
  shifts: SchedulingShift[]
  isProduction: boolean
  aiEnabled: boolean
}

// ============================================
// AI STATUS PANEL
// ============================================

interface AIStatusPanelProps {
  selectedProvider: string
}

function AIStatusPanel({ selectedProvider }: AIStatusPanelProps) {
  const t = useTranslations('scheduling.config.ai')
  const tToasts = useTranslations('scheduling.toasts')
  const tActions = useTranslations('scheduling.actions')

  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    provider?: string
    responseTime?: number
    model?: string
    error?: string
  } | null>(null)

  // Fetch AI status
  const { data: aiStatus, isLoading } = useQuery({
    queryKey: schedulingKeys.aiStatus(),
    queryFn: schedulingApi.getAIStatus,
    refetchOnWindowFocus: false,
  })

  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await schedulingApi.testAIConnection(selectedProvider)
      setTestResult(result)
      if (result.success) {
        toast.success(tToasts('connectionSuccess', { provider: result.provider }))
      } else {
        toast.error(result.error || tToasts('connectionError'))
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : tToasts('connectionTestError')
      setTestResult({ success: false, error: message })
      toast.error(message)
    } finally {
      setTesting(false)
    }
  }

  const providerInfo = aiStatus?.providers?.[selectedProvider as keyof typeof aiStatus.providers]
  const isOllama = selectedProvider === 'ollama'
  const isConfigured = providerInfo?.configured ?? false
  const isProviderEnabled = (providerInfo as { enabled?: boolean })?.enabled ?? true

  const getStatusText = () => {
    if (isLoading) return t('verifying')
    if (!isProviderEnabled) return t('disabledOnServer')
    if (isOllama) return t('requiresDocker')
    if (isConfigured) return t('apiKeyConfigured')
    return t('apiKeyNotConfigured')
  }

  const statusText = getStatusText()

  const getStatusColor = () => {
    if (isLoading) return 'bg-gray-400'
    if (!isProviderEnabled) return 'bg-red-500'
    if (isOllama) return 'bg-blue-500'
    if (isConfigured) return 'bg-green-500'
    return 'bg-yellow-500'
  }

  const statusColor = getStatusColor()

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3 max-w-2xl">
      {/* Status Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${statusColor}`} />
          <span className="text-sm text-gray-700 dark:text-gray-300">{statusText}</span>
        </div>
        {providerInfo && 'model' in providerInfo && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {t('activeProvider', { provider: providerInfo.model })}
          </span>
        )}
      </div>

      {/* Server Status */}
      {aiStatus && (
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`w-1.5 h-1.5 rounded-full ${aiStatus.enabled ? 'bg-green-500' : 'bg-red-500'}`}
            />
            <span>{t('enabledStatus', { status: aiStatus.enabled ? 'true' : 'false' })}</span>
          </div>
          {aiStatus.activeProvider !== 'None' && (
            <div>{t('activeProvider', { provider: aiStatus.activeProvider })}</div>
          )}
        </div>
      )}

      {/* Warning/Info for configuration */}
      {!isLoading && (
        <>
          {!isProviderEnabled ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-2">
              <p className="text-xs text-red-700 dark:text-red-300">
                {t('providerDisabled', { provider: selectedProvider.toUpperCase() })}
              </p>
            </div>
          ) : isOllama ? (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3">
              <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                {t('ollamaNote')}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                {t('requiresOllama', {
                  url:
                    providerInfo && 'baseUrl' in providerInfo
                      ? providerInfo.baseUrl
                      : 'http://localhost:11434',
                })}
              </p>
            </div>
          ) : (
            !isConfigured && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-2">
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                  {t('configureEnvVar')}
                  {selectedProvider === 'claude' && (
                    <code className="ml-1 px-1 bg-yellow-100 dark:bg-yellow-900 rounded">
                      CLAUDE_API_KEY
                    </code>
                  )}
                  {selectedProvider === 'gemini' && (
                    <code className="ml-1 px-1 bg-yellow-100 dark:bg-yellow-900 rounded">
                      GEMINI_API_KEY
                    </code>
                  )}
                  {selectedProvider === 'openai' && (
                    <code className="ml-1 px-1 bg-yellow-100 dark:bg-yellow-900 rounded">
                      OPENAI_API_KEY
                    </code>
                  )}
                  {selectedProvider === 'minimax' && (
                    <code className="ml-1 px-1 bg-yellow-100 dark:bg-yellow-900 rounded">
                      MINIMAX_API_KEY
                    </code>
                  )}
                </p>
              </div>
            )
          )}
        </>
      )}

      {/* Test Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleTestConnection}
          disabled={testing || !isConfigured || !aiStatus?.enabled || !isProviderEnabled}
          className="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {testing ? tActions('testing') : tActions('testConnection')}
        </button>

        {testResult && (
          <div
            className={`text-xs ${testResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
          >
            {testResult.success
              ? `OK - ${testResult.responseTime}ms (${testResult.model})`
              : testResult.error}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
        {t('enabledDescription')}
      </div>
    </div>
  )
}

// ============================================
// GENERAL CONFIG TAB
// ============================================

function GeneralConfigTab({ config, shifts, isProduction, aiEnabled }: GeneralConfigTabProps) {
  const t = useTranslations('scheduling.config.general')
  const tToasts = useTranslations('scheduling.toasts')
  const tActions = useTranslations('scheduling.actions')
  const tAI = useTranslations('scheduling.config.ai')

  const queryClient = useQueryClient()
  const [editedConfig, setEditedConfig] = useState<Partial<Record<string, string>>>({})
  const [saving, setSaving] = useState(false)

  const updateMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      schedulingApi.updateConfig(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulingKeys.configMap() })
    },
  })

  const handleSave = async () => {
    setSaving(true)
    try {
      const promises = Object.entries(editedConfig).map(([key, value]) =>
        updateMutation.mutateAsync({ key, value: value! })
      )
      await Promise.all(promises)
      setEditedConfig({})
      toast.success(tToasts('configSaved'))
    } catch {
      toast.error(tToasts('saveError'))
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = Object.keys(editedConfig).length > 0

  const getValue = (key: string, defaultValue: number) => {
    return editedConfig[key] ?? defaultValue
  }

  const handleChange = (key: string, value: string) => {
    setEditedConfig({ ...editedConfig, [key]: value })
  }

  const currentAIProvider = editedConfig['ai_provider'] ?? config.aiProvider
  const isAIActive = currentAIProvider !== 'none'

  return (
    <div className="p-4 space-y-6">
      {/* DOTACIÓN POR TURNO */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
          {t('staffingPerShift')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Mañana */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center text-sm font-bold">
                M
              </span>
              <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                {t('morningShift')}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-400">{t('minimum')}</span>
                <input
                  type="number"
                  value={getValue('min_morning_staff', config.minMorningStaff)}
                  onChange={(e) => handleChange('min_morning_staff', e.target.value)}
                  className="w-16 px-2 py-1 text-sm text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-400">{t('preferred')}</span>
                <input
                  type="number"
                  value={getValue('pref_morning_staff', config.prefMorningStaff)}
                  onChange={(e) => handleChange('pref_morning_staff', e.target.value)}
                  className="w-16 px-2 py-1 text-sm text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          </div>

          {/* Tarde */}
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-bold">
                T
              </span>
              <span className="text-sm font-medium text-orange-800 dark:text-orange-300">
                {t('afternoonShift')}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-400">{t('minimum')}</span>
                <input
                  type="number"
                  value={getValue('min_afternoon_staff', config.minAfternoonStaff)}
                  onChange={(e) => handleChange('min_afternoon_staff', e.target.value)}
                  className="w-16 px-2 py-1 text-sm text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-400">{t('preferred')}</span>
                <input
                  type="number"
                  value={getValue('pref_afternoon_staff', config.prefAfternoonStaff)}
                  onChange={(e) => handleChange('pref_afternoon_staff', e.target.value)}
                  className="w-16 px-2 py-1 text-sm text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          </div>

          {/* Noche */}
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold">
                N
              </span>
              <span className="text-sm font-medium text-indigo-800 dark:text-indigo-300">
                {t('nightShift')}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-400">{t('minimum')}</span>
                <input
                  type="number"
                  value={getValue('min_night_staff', config.minNightStaff)}
                  onChange={(e) => handleChange('min_night_staff', e.target.value)}
                  className="w-16 px-2 py-1 text-sm text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-400">{t('maximum')}</span>
                <input
                  type="number"
                  value={getValue('max_night_staff', config.maxNightStaff)}
                  onChange={(e) => handleChange('max_night_staff', e.target.value)}
                  className="w-16 px-2 py-1 text-sm text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LÍMITES Y RESTRICCIONES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Limites Semanales */}
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
            {t('weeklyLimits')}
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {t('maxShiftsPerWeek')}
              </span>
              <input
                type="number"
                value={getValue('max_weekly_shifts', config.maxWeeklyShifts)}
                onChange={(e) => handleChange('max_weekly_shifts', e.target.value)}
                className="w-16 px-2 py-1 text-sm text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {t('preferredShiftsPerWeek')}
              </span>
              <input
                type="number"
                value={getValue('pref_weekly_shifts', config.prefWeeklyShifts)}
                onChange={(e) => handleChange('pref_weekly_shifts', e.target.value)}
                className="w-16 px-2 py-1 text-sm text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400">{t('minRestHours')}</span>
              <input
                type="number"
                value={getValue('min_rest_hours', config.minRestHours)}
                onChange={(e) => handleChange('min_rest_hours', e.target.value)}
                className="w-16 px-2 py-1 text-sm text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        </div>

        {/* Bloques de Noche */}
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
            {t('nightBlocks')}
          </h4>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-3">
            {t('consecutiveNightsAllowed')}
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {t('minConsecutive')}
              </span>
              <input
                type="number"
                value={getValue('min_night_block', config.minNightBlock)}
                onChange={(e) => handleChange('min_night_block', e.target.value)}
                className="w-16 px-2 py-1 text-sm text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {t('maxConsecutive')}
              </span>
              <input
                type="number"
                value={getValue('max_night_block', config.maxNightBlock)}
                onChange={(e) => handleChange('max_night_block', e.target.value)}
                className="w-16 px-2 py-1 text-sm text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400">{t('preferred')}</span>
              <input
                type="number"
                value={getValue('pref_night_block', config.prefNightBlock)}
                onChange={(e) => handleChange('pref_night_block', e.target.value)}
                className="w-16 px-2 py-1 text-sm text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        </div>
      </div>

      {/* AI Provider */}
      <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {tAI('provider')}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{tAI('subtitle')}</p>
          </div>
          {isAIActive && (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                aiEnabled
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${aiEnabled ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}
              ></span>
              {aiEnabled ? tAI('active') : tAI('inactive')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <select
            value={currentAIProvider}
            onChange={(e) => setEditedConfig({ ...editedConfig, ['ai_provider']: e.target.value })}
            className="w-72 px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="none">{tAI('disabled')}</option>
            <option value="claude">{tAI('claude')}</option>
            <option value="gemini">{tAI('gemini')}</option>
            <option value="groq">{tAI('groq')}</option>
            {!isProduction && <option value="ollama">{tAI('ollama')}</option>}
            <option value="minimax">{tAI('minimax')}</option>
          </select>
          {currentAIProvider === 'none' && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {tAI('baseAlgorithmOnly')}
            </span>
          )}
        </div>
        {isAIActive && <AIStatusPanel selectedProvider={currentAIProvider} />}
      </div>

      {/* Shifts Section */}
      <ShiftsSection shifts={shifts} />

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <FiSave className="w-4 h-4" />
            {saving ? tActions('saving') : tActions('save')}
          </button>
        </div>
      )}
    </div>
  )
}

// ============================================
// SHIFTS SECTION (within General Config Tab)
// ============================================

interface ShiftsSectionProps {
  shifts: SchedulingShift[]
}

function ShiftsSection({ shifts }: ShiftsSectionProps) {
  const t = useTranslations('scheduling.config.shifts')
  const tToasts = useTranslations('scheduling.toasts')
  const tActions = useTranslations('scheduling.actions')

  const queryClient = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingShift, setEditingShift] = useState<SchedulingShift | null>(null)

  const deleteMutation = useMutation({
    mutationFn: (shiftId: number) => schedulingApi.deleteShift(shiftId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulingKeys.shifts() })
      toast.success(tToasts('shiftDeleted'))
    },
    onError: () => {
      toast.error(tToasts('shiftDeleteError'))
    },
  })

  const handleDelete = (shift: SchedulingShift) => {
    if (confirm(t('deleteConfirm', { name: shift.name, code: shift.code }))) {
      deleteMutation.mutate(shift.id)
    }
  }

  return (
    <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('title')}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('subtitle')}</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          <FiPlus className="w-3.5 h-3.5" />
          {tActions('addShift')}
        </button>
      </div>

      <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-md">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-[#0d1117] border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 dark:text-gray-400">
                {t('code')}
              </th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 dark:text-gray-400">
                {t('name')}
              </th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 dark:text-gray-400">
                {t('schedule')}
              </th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 dark:text-gray-400">
                {t('hours')}
              </th>
              <th className="text-center py-2 px-3 text-xs font-semibold text-gray-600 dark:text-gray-400">
                {t('work')}
              </th>
              <th className="text-center py-2 px-3 text-xs font-semibold text-gray-600 dark:text-gray-400">
                {t('paid')}
              </th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600 dark:text-gray-400">
                {t('actions')}
              </th>
            </tr>
          </thead>
          <tbody>
            {shifts.map((shift) => (
              <tr
                key={shift.id}
                className="border-b border-gray-100 dark:border-gray-800 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <td className="py-2 px-3">
                  <span
                    className={`inline-flex items-center justify-center w-8 h-6 rounded text-xs font-bold border ${getShiftClasses(shift.code)}`}
                  >
                    {shift.code}
                  </span>
                </td>
                <td className="py-2 px-3 text-gray-900 dark:text-gray-100">{shift.name}</td>
                <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                  {shift.startTime && shift.endTime ? `${shift.startTime} - ${shift.endTime}` : '-'}
                </td>
                <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{shift.hours}h</td>
                <td className="py-2 px-3 text-center">
                  {shift.isWorkShift ? (
                    <FiCheck className="w-4 h-4 text-green-500 mx-auto" />
                  ) : (
                    <FiX className="w-4 h-4 text-gray-400 mx-auto" />
                  )}
                </td>
                <td className="py-2 px-3 text-center">
                  {shift.isPaid ? (
                    <FiCheck className="w-4 h-4 text-green-500 mx-auto" />
                  ) : (
                    <FiX className="w-4 h-4 text-gray-400 mx-auto" />
                  )}
                </td>
                <td className="py-2 px-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => setEditingShift(shift)}
                      className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                      title={tActions('edit')}
                    >
                      <FiEdit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(shift)}
                      className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      title={tActions('delete')}
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {shifts.length === 0 && (
        <div className="text-center py-8">
          <FiCalendar className="w-10 h-10 mx-auto text-gray-400 mb-3" />
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('noShifts')}</p>
        </div>
      )}

      {/* Add/Edit Shift Modal */}
      {(showAddModal || editingShift) && (
        <ShiftModal
          shift={editingShift}
          onClose={() => {
            setShowAddModal(false)
            setEditingShift(null)
          }}
        />
      )}
    </div>
  )
}

// ============================================
// SHIFT MODAL (Create/Edit)
// ============================================

interface ShiftModalProps {
  shift: SchedulingShift | null
  onClose: () => void
}

function ShiftModal({ shift, onClose }: ShiftModalProps) {
  const t = useTranslations('scheduling.config.shifts')
  const tActions = useTranslations('scheduling.actions')
  const tToasts = useTranslations('scheduling.toasts')

  const queryClient = useQueryClient()
  const isEditing = !!shift

  const [code, setCode] = useState(shift?.code || '')
  const [name, setName] = useState(shift?.name || '')
  const [startTime, setStartTime] = useState(shift?.startTime || '')
  const [endTime, setEndTime] = useState(shift?.endTime || '')
  const [hours, setHours] = useState(shift?.hours ? String(shift.hours) : '8')
  const [isWorkShift, setIsWorkShift] = useState(shift?.isWorkShift ?? true)
  const [isPaid, setIsPaid] = useState(shift?.isPaid ?? true)
  const [displayOrder, setDisplayOrder] = useState(
    shift?.displayOrder ? String(shift.displayOrder) : '10'
  )

  const createMutation = useMutation({
    mutationFn: (data: CreateShiftDto) => schedulingApi.createShift(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulingKeys.shifts() })
      toast.success(tToasts('shiftCreated'))
      onClose()
    },
    onError: () => {
      toast.error(tToasts('shiftCreateError'))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateShiftDto }) =>
      schedulingApi.updateShift(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulingKeys.shifts() })
      toast.success(tToasts('shiftUpdated'))
      onClose()
    },
    onError: () => {
      toast.error(tToasts('shiftUpdateError'))
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!code || !name) {
      toast.error(t('codeNameRequired'))
      return
    }

    const data = {
      code: code.toUpperCase(),
      name,
      startTime: startTime || null,
      endTime: endTime || null,
      hours: parseFloat(hours) || 0,
      isWorkShift,
      isPaid,
      displayOrder: parseInt(displayOrder) || 10,
    }

    if (isEditing && shift) {
      updateMutation.mutate({ id: shift.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-[#151b23] rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {isEditing ? t('editShift') : t('newShift')}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('code')} *
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={3}
                placeholder="M, T, N..."
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 uppercase"
                required
                disabled={isEditing}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('hours')} *
              </label>
              <input
                type="number"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                step="0.5"
                min="0"
                max="24"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('name')} *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('name')}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('startTime')}
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('endTime')}
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('displayOrder')}
            </label>
            <input
              type="number"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(e.target.value)}
              min="1"
              max="99"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('displayOrderHint')}</p>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isWorkShift}
                onChange={(e) => setIsWorkShift(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-800"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{t('isWorkShift')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPaid}
                onChange={(e) => setIsPaid(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-800"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{t('isPaid')}</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
            >
              {tActions('cancel')}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-sm bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? tActions('saving') : isEditing ? tActions('save') : t('newShift')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============================================
// RULES TAB
// ============================================

interface RulesTabProps {
  rules: SchedulingEmployeeRule[]
}

const RULE_TYPE_LABELS: Record<EmployeeRuleType, string> = {
  shift_priority: 'shift_priority',
  max_shift_per_month: 'max_shift_per_month',
  min_shift_per_month: 'min_shift_per_month',
  fixed_days: 'fixed_days',
  fixed_shift: 'fixed_shift',
  no_weekends: 'no_weekends',
  custom: 'custom',
}

function RulesTab({ rules }: RulesTabProps) {
  const t = useTranslations('scheduling.config.rules')
  const tActions = useTranslations('scheduling.actions')
  const tToasts = useTranslations('scheduling.toasts')
  const tTypes = useTranslations('scheduling.config.rules.types')

  const queryClient = useQueryClient()
  const [showAddForm, setShowAddForm] = useState(false)
  const [_editingRule, _setEditingRule] = useState<SchedulingEmployeeRule | null>(null)

  const rulesByEmployee = rules.reduce(
    (acc, rule) => {
      if (!acc[rule.employeeId]) {
        acc[rule.employeeId] = {
          employeeName: rule.employeeName,
          rules: [],
        }
      }
      acc[rule.employeeId].rules.push(rule)
      return acc
    },
    {} as Record<string, { employeeName: string; rules: SchedulingEmployeeRule[] }>
  )

  const deleteMutation = useMutation({
    mutationFn: (ruleId: number) => schedulingApi.deleteRule(ruleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulingKeys.rules() })
      toast.success(tToasts('ruleDeleted'))
    },
    onError: () => {
      toast.error(tToasts('ruleDeleteError'))
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ ruleId, isActive }: { ruleId: number; isActive: boolean }) =>
      schedulingApi.updateRule(ruleId, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulingKeys.rules() })
      toast.success(tToasts('ruleUpdated'))
    },
    onError: () => {
      toast.error(tToasts('ruleUpdateError'))
    },
  })

  const getRuleLabel = (ruleType: EmployeeRuleType) => {
    return tTypes(ruleType as string)
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('title')}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('subtitle')}</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          <FiPlus className="w-3.5 h-3.5" />
          {t('addRule')}
        </button>
      </div>

      {Object.keys(rulesByEmployee).length === 0 ? (
        <div className="text-center py-8">
          <FiUsers className="w-10 h-10 mx-auto text-gray-400 mb-3" />
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('noRules')}</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{t('noRulesHint')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(rulesByEmployee).map(
            ([employeeId, { employeeName, rules: employeeRules }]) => (
              <div
                key={employeeId}
                className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden"
              >
                <div className="bg-gray-50 dark:bg-[#0d1117] px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {employeeName}
                  </span>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {employeeRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            rule.isActive
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                          }`}
                        >
                          {getRuleLabel(rule.ruleType)}
                        </span>
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {formatRuleValue(rule.ruleType, rule.ruleValue)}
                        </span>
                        {rule.notes && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            ({rule.notes})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            toggleActiveMutation.mutate({
                              ruleId: rule.id,
                              isActive: !rule.isActive,
                            })
                          }
                          className={`text-xs px-2 py-1 rounded ${
                            rule.isActive
                              ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                              : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                          }`}
                        >
                          {rule.isActive ? tActions('deactivate') : tActions('activate')}
                        </button>
                        <button
                          onClick={() => deleteMutation.mutate(rule.id)}
                          className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      )}

      {showAddForm && <AddRuleModal onClose={() => setShowAddForm(false)} />}
    </div>
  )
}

// ============================================
// ADD RULE MODAL
// ============================================

interface AddRuleModalProps {
  onClose: () => void
}

function AddRuleModal({ onClose }: AddRuleModalProps) {
  const t = useTranslations('scheduling.config.rules')
  const tActions = useTranslations('scheduling.actions')
  const tToasts = useTranslations('scheduling.toasts')
  const tTypes = useTranslations('scheduling.config.rules.types')
  const tPlaceholders = useTranslations('scheduling.config.rules.placeholders')
  const tHelp = useTranslations('scheduling.config.rules.help')

  const queryClient = useQueryClient()
  const [employeeId, setEmployeeId] = useState('')
  const [ruleType, setRuleType] = useState<EmployeeRuleType>('shift_priority')
  const [ruleValue, setRuleValue] = useState('')
  const [notes, setNotes] = useState('')

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: schedulingKeys.employees(),
    queryFn: schedulingApi.getSchedulableEmployees,
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateEmployeeRuleDto) => schedulingApi.createRule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulingKeys.rules() })
      toast.success(tToasts('ruleCreated'))
      onClose()
    },
    onError: () => {
      toast.error(tToasts('ruleCreateError'))
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!employeeId || !ruleValue) {
      toast.error(t('completeAllFields'))
      return
    }
    createMutation.mutate({
      employeeId,
      ruleType,
      ruleValue,
      notes: notes || undefined,
    })
  }

  const getRuleTypeLabel = (type: EmployeeRuleType) => {
    return tTypes(type as string)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-[#151b23] rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('addRule')}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('employee')}
            </label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100"
              required
            >
              <option value="">{t('selectEmployee')}</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.username}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('ruleType')}
            </label>
            <select
              value={ruleType}
              onChange={(e) => setRuleType(e.target.value as EmployeeRuleType)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100"
            >
              {Object.entries(RULE_TYPE_LABELS).map(([key, _label]) => (
                <option key={key} value={key}>
                  {getRuleTypeLabel(key as EmployeeRuleType)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('value')}
            </label>
            <input
              type="text"
              value={ruleValue}
              onChange={(e) => setRuleValue(e.target.value)}
              placeholder={tPlaceholders(ruleType as string)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100"
              required
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {tHelp(ruleType as string)}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('notes')}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
            >
              {tActions('cancel')}
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 text-sm bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {createMutation.isPending ? tActions('saving') : tActions('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============================================
// REQUESTS TAB (Day Off Requests)
// ============================================

function RequestsTab() {
  const t = useTranslations('scheduling.config.requests')
  const tActions = useTranslations('scheduling.actions')
  const tToasts = useTranslations('scheduling.toasts')
  const tMessages = useTranslations('scheduling.messages')

  const queryClient = useQueryClient()
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)

  const { data: monthsData } = useQuery({
    queryKey: schedulingKeys.monthsList(),
    queryFn: () => schedulingApi.getAllMonths({ limit: 12 }),
  })

  const months = monthsData?.months || []

  const { data: requests = [], isLoading: loadingRequests } = useQuery({
    queryKey: ['scheduling-requests', selectedMonth],
    queryFn: async () => {
      if (!selectedMonth) return []
      const constraints = await schedulingApi.getConstraintsByMonth(selectedMonth, {})
      return constraints.filter((c) => c.constraintType === 'request_off')
    },
    enabled: !!selectedMonth,
  })

  const deleteMutation = useMutation({
    mutationFn: (constraintId: number) => schedulingApi.deleteConstraint(constraintId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduling-requests', selectedMonth] })
      toast.success(tToasts('requestDeleted'))
    },
    onError: () => {
      toast.error(tToasts('ruleDeleteError'))
    },
  })

  const approveMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'approved' | 'rejected' }) =>
      schedulingApi.approveConstraint(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduling-requests', selectedMonth] })
      toast.success(tToasts('requestUpdated'))
    },
    onError: () => {
      toast.error(tToasts('ruleUpdateError'))
    },
  })

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'rejected':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      default:
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return t('approved')
      case 'rejected':
        return t('rejected')
      default:
        return t('pending')
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('title')}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedMonth || ''}
            onChange={(e) => setSelectedMonth(e.target.value ? Number(e.target.value) : null)}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100"
          >
            <option value="">{t('selectMonth')}</option>
            {months.map((m) => (
              <option key={m.id} value={m.id}>
                {new Date(m.year, m.month - 1).toLocaleDateString('es-ES', {
                  month: 'long',
                  year: 'numeric',
                })}
              </option>
            ))}
          </select>
          {selectedMonth && (
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              <FiPlus className="w-3.5 h-3.5" />
              {t('newRequest')}
            </button>
          )}
        </div>
      </div>

      {!selectedMonth ? (
        <div className="text-center py-12">
          <FiCalendarOff className="w-10 h-10 mx-auto text-gray-400 mb-3" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {tMessages('selectMonthToSeeRequests')}
          </p>
        </div>
      ) : loadingRequests ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-solid border-blue-600 dark:border-blue-500 border-r-transparent"></div>
          <p className="mt-3 text-xs text-gray-600 dark:text-gray-400">
            {tMessages('loadingRequests')}
          </p>
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12">
          <FiCalendarOff className="w-10 h-10 mx-auto text-gray-400 mb-3" />
          <p className="text-sm text-gray-600 dark:text-gray-400">{tMessages('noRequests')}</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {tMessages('noRequestsHint')}
          </p>
        </div>
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#0d1117] border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 dark:text-gray-400">
                  {t('employee')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 dark:text-gray-400">
                  {t('dates')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600 dark:text-gray-400">
                  {t('reasonLabel')}
                </th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-gray-600 dark:text-gray-400">
                  {t('status')}
                </th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600 dark:text-gray-400">
                  {t('actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr
                  key={request.id}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td className="py-2 px-3 text-gray-900 dark:text-gray-100">
                    {request.employeeName}
                  </td>
                  <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                    {formatDate(request.startDate)}
                    {request.startDate !== request.endDate && ` - ${formatDate(request.endDate)}`}
                  </td>
                  <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                    {request.notes || '-'}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(request.status)}`}
                    >
                      {getStatusLabel(request.status)}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center justify-end gap-1">
                      {request.status === 'pending' && (
                        <>
                          <button
                            onClick={() =>
                              approveMutation.mutate({ id: request.id, status: 'approved' })
                            }
                            className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                            title={t('approved')}
                          >
                            <FiCheck className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              approveMutation.mutate({ id: request.id, status: 'rejected' })
                            }
                            className="p-1 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded"
                            title={t('rejected')}
                          >
                            <FiX className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => deleteMutation.mutate(request.id)}
                        className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        title={tActions('delete')}
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddForm && selectedMonth && (
        <AddRequestModal monthId={selectedMonth} onClose={() => setShowAddForm(false)} />
      )}
    </div>
  )
}

// ============================================
// ADD REQUEST MODAL
// ============================================

interface AddRequestModalProps {
  monthId: number
  onClose: () => void
}

function AddRequestModal({ monthId, onClose }: AddRequestModalProps) {
  const t = useTranslations('scheduling.config.requests')
  const tActions = useTranslations('scheduling.actions')
  const tToasts = useTranslations('scheduling.toasts')

  const queryClient = useQueryClient()
  const [employeeId, setEmployeeId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: schedulingKeys.employees(),
    queryFn: schedulingApi.getSchedulableEmployees,
  })

  const { data: monthData } = useQuery({
    queryKey: schedulingKeys.month(monthId),
    queryFn: () => schedulingApi.getMonthById(monthId),
  })

  const createMutation = useMutation({
    mutationFn: (data: {
      monthId: number
      employeeId: string
      constraintType: string
      startDate: string
      endDate: string
      notes?: string
    }) =>
      schedulingApi.createConstraint(data as Parameters<typeof schedulingApi.createConstraint>[0]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduling-requests', monthId] })
      toast.success(tToasts('requestCreated'))
      onClose()
    },
    onError: () => {
      toast.error(tToasts('requestCreateError'))
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!employeeId || !startDate) {
      toast.error(t('completeRequired'))
      return
    }
    createMutation.mutate({
      monthId,
      employeeId,
      constraintType: 'request_off',
      startDate,
      endDate: endDate || startDate,
      notes: notes || undefined,
    })
  }

  const getDateLimits = () => {
    if (!monthData) return { min: '', max: '' }
    const year = monthData.year
    const month = monthData.month
    const firstDay = new Date(year, month - 1, 1)
    const lastDay = new Date(year, month, 0)
    return {
      min: firstDay.toISOString().split('T')[0],
      max: lastDay.toISOString().split('T')[0],
    }
  }

  const dateLimits = getDateLimits()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-[#151b23] rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {t('newRequest')}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('employee')} *
            </label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100"
              required
            >
              <option value="">{t('selectMonth')}</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.username}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('from')}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  if (!endDate) setEndDate(e.target.value)
                }}
                min={dateLimits.min}
                max={dateLimits.max}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('until')}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || dateLimits.min}
                max={dateLimits.max}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('reason')}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('reasonPlaceholder')}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100"
            />
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">{t('approvedNote')}</p>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
            >
              {tActions('cancel')}
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 text-sm bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {createMutation.isPending ? tActions('saving') : tActions('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============================================
// TOTALS TAB
// ============================================

function TotalsTab() {
  const t = useTranslations('scheduling.config.totals')

  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)

  const yearOptions = [currentYear, currentYear - 1, currentYear - 2]

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('title')}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600 dark:text-gray-400">{t('year')}</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500"
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      <EmployeeTotals year={selectedYear} />
    </div>
  )
}

// ============================================
// HELPERS
// ============================================

function formatRuleValue(ruleType: EmployeeRuleType, value: string): string {
  switch (ruleType) {
    case 'shift_priority':
      return value === 'M' ? 'Mañana' : value === 'T' ? 'Tarde' : value
    case 'fixed_days': {
      const dayNames = ['', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']
      return value
        .split(',')
        .map((d) => dayNames[parseInt(d)] || d)
        .join(', ')
    }
    case 'no_weekends':
      return value === 'true' ? 'Sí' : 'No'
    case 'max_shift_per_month':
    case 'min_shift_per_month': {
      const [shift, count] = value.split(':')
      return `${shift}: ${count} turnos`
    }
    default:
      return value
  }
}
