// app/components/scheduling/EmployeeTotals.tsx

'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { schedulingApi, schedulingKeys } from '@/app/lib/scheduling'
import type { EmployeeContract, UpdateContractDto } from '@/app/lib/scheduling'
import { FiRefreshCw, FiSave, FiPlus, FiCalendar } from 'react-icons/fi'
import toast from 'react-hot-toast'

interface EmployeeTotalsProps {
  year: number
}

// Tipo para los datos editables de convenio
interface EditableConvenio {
  id: number
  employeeId: string
  employeeName: string
  diasTrabajo: number
  horasAnuales: number
  diasVacaciones: number
  diasLibreSemanal: number
  diasIt: number
  diasBonificables: number
  diasLaborablesAno: number
  observaciones: string
}

export function EmployeeTotals({ year }: EmployeeTotalsProps) {
  const queryClient = useQueryClient()
  const [editedContracts, setEditedContracts] = useState<Record<number, Partial<EditableConvenio>>>({})
  const [hasChanges, setHasChanges] = useState(false)
  // State for start dates per employee (for new contracts)
  const [startDates, setStartDates] = useState<Record<string, string>>({})

  // Fetch schedulable employees (to know how many should have contracts)
  const { data: schedulableEmployees = [] } = useQuery({
    queryKey: schedulingKeys.employees(),
    queryFn: schedulingApi.getSchedulableEmployees,
  })

  // Fetch contracts for the year
  const {
    data: contracts = [],
    isLoading: loadingContracts,
    refetch: refetchContracts,
  } = useQuery({
    queryKey: schedulingKeys.contracts(year),
    queryFn: () => schedulingApi.getContractsByYear(year),
  })

  // Fetch annual totals (for disfrutados and pendiente)
  const {
    data: totalsData,
    isLoading: loadingTotals,
    refetch: refetchTotals,
  } = useQuery({
    queryKey: schedulingKeys.annualTotals(year),
    queryFn: () => schedulingApi.getAnnualTotals(year),
    staleTime: 5 * 60 * 1000,
  })

  // Initialize ALL contracts mutation (full year values)
  const initAllContractsMutation = useMutation({
    mutationFn: () => schedulingApi.initializeContractsForYear(year),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: schedulingKeys.contracts(year) })
      queryClient.invalidateQueries({ queryKey: schedulingKeys.annualTotals(year) })
      toast.success(`${data.created} contratos creados con valores por defecto`)
    },
    onError: () => {
      toast.error('Error al inicializar contratos')
    },
  })

  // Initialize SINGLE contract mutation (with optional start date)
  const initSingleContractMutation = useMutation({
    mutationFn: ({ employeeId, startDate }: { employeeId: string; startDate?: string }) => 
      schedulingApi.initializeContractForEmployee(year, employeeId, startDate),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: schedulingKeys.contracts(year) })
      queryClient.invalidateQueries({ queryKey: schedulingKeys.annualTotals(year) })
      toast.success(data.message)
    },
    onError: () => {
      toast.error('Error al crear contrato')
    },
  })

  // Update contract mutation
  const updateContractMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateContractDto }) =>
      schedulingApi.updateContract(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulingKeys.contracts(year) })
      queryClient.invalidateQueries({ queryKey: schedulingKeys.annualTotals(year) })
    },
    onError: () => {
      toast.error('Error al guardar contrato')
    },
  })

  const employees = totalsData?.employees || []
  const totalMesesPublicados = totalsData?.totalMesesPublicados || 0

  // Check if there are employees without contracts
  const employeesWithContracts = new Set(contracts.map(c => c.employeeId))
  const employeesWithoutContracts = schedulableEmployees.filter(e => !employeesWithContracts.has(e.id))
  const hasEmployeesWithoutContracts = employeesWithoutContracts.length > 0

  // Get current value (edited or original)
  const getValue = (contract: EmployeeContract, field: keyof EditableConvenio): string | number => {
    const edited = editedContracts[contract.id]
    if (edited && edited[field] !== undefined) {
      return edited[field] as string | number
    }
    return contract[field as keyof EmployeeContract] as string | number
  }

  // Handle input change
  const handleChange = (contractId: number, field: keyof EditableConvenio, value: string) => {
    const numericFields = ['diasTrabajo', 'horasAnuales', 'diasVacaciones', 'diasLibreSemanal', 'diasIt', 'diasBonificables', 'diasLaborablesAno']
    
    setEditedContracts(prev => ({
      ...prev,
      [contractId]: {
        ...prev[contractId],
        [field]: numericFields.includes(field) ? (value === '' ? 0 : parseInt(value, 10)) : value,
      }
    }))
    setHasChanges(true)
  }

  // Save all changes
  const handleSaveAll = async () => {
    const promises = Object.entries(editedContracts).map(([id, changes]) => {
      const data: UpdateContractDto = {}
      if (changes.diasTrabajo !== undefined) data.dias_trabajo = changes.diasTrabajo
      if (changes.horasAnuales !== undefined) data.horas_anuales = changes.horasAnuales
      if (changes.diasVacaciones !== undefined) data.dias_vacaciones = changes.diasVacaciones
      if (changes.diasLibreSemanal !== undefined) data.dias_libre_semanal = changes.diasLibreSemanal
      if (changes.diasIt !== undefined) data.dias_it = changes.diasIt
      if (changes.diasBonificables !== undefined) data.dias_bonificables = changes.diasBonificables
      if (changes.diasLaborablesAno !== undefined) data.dias_laborables_ano = changes.diasLaborablesAno
      if (changes.observaciones !== undefined) data.observaciones = changes.observaciones || null

      return updateContractMutation.mutateAsync({ id: parseInt(id), data })
    })

    try {
      await Promise.all(promises)
      setEditedContracts({})
      setHasChanges(false)
      toast.success('Contratos guardados correctamente')
    } catch {
      // Error already handled in mutation
    }
  }

  // Create single contract with optional start date
  const handleCreateContract = (employeeId: string) => {
    const startDate = startDates[employeeId]
    initSingleContractMutation.mutate({ employeeId, startDate: startDate || undefined })
  }

  const isLoading = loadingContracts || loadingTotals

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-solid border-blue-600 border-r-transparent"></div>
        <p className="mt-3 text-xs text-gray-600 dark:text-gray-400">Cargando datos...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {totalMesesPublicados} meses publicados
        </p>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <button
              onClick={handleSaveAll}
              disabled={updateContractMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <FiSave className="w-3.5 h-3.5" />
              {updateContractMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          )}
          <button
            onClick={() => { refetchContracts(); refetchTotals(); }}
            className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            title="Actualizar"
          >
            <FiRefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* EMPLEADOS SIN CONTRATO */}
      {hasEmployeesWithoutContracts && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Empleados sin contrato ({employeesWithoutContracts.length})
            </h3>
            <button
              onClick={() => initAllContractsMutation.mutate()}
              disabled={initAllContractsMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-md hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              <FiPlus className="w-3.5 h-3.5" />
              {initAllContractsMutation.isPending ? 'Creando...' : 'Crear todos (año completo)'}
            </button>
          </div>
          <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">
            Selecciona la fecha de inicio para calcular valores proporcionales, o deja en blanco para año completo.
          </p>
          <div className="space-y-2">
            {employeesWithoutContracts.map((emp) => (
              <div 
                key={emp.id}
                className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded px-3 py-2"
              >
                <span className="flex-1 text-sm text-gray-900 dark:text-gray-100 font-medium">
                  {emp.username}
                </span>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <FiCalendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="date"
                      value={startDates[emp.id] || ''}
                      onChange={(e) => setStartDates(prev => ({ ...prev, [emp.id]: e.target.value }))}
                      min={`${year}-01-01`}
                      max={`${year}-12-31`}
                      className="pl-7 pr-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      placeholder="Fecha inicio"
                    />
                  </div>
                  <button
                    onClick={() => handleCreateContract(emp.id)}
                    disabled={initSingleContractMutation.isPending}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    <FiPlus className="w-3 h-3" />
                    Crear
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DÍAS POR CONVENIO - Editable */}
      <div>
        <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 mb-2 px-1">
          DÍAS POR CONVENIO
        </h3>
        <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded">
          <table className="w-full text-xs">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300 min-w-[100px]"></th>
                <th className="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-300 min-w-[80px]">DÍAS DE TRABAJO</th>
                <th className="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-300 min-w-[80px]">HORAS A TRABAJAR</th>
                <th className="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-300 min-w-[80px]">DÍAS VACACIONES</th>
                <th className="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-300 min-w-[80px]">LIBRE SEMANAL</th>
                <th className="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-300 min-w-[50px]">IT</th>
                <th className="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-300 min-w-[80px]">DÍAS BONIFICABLES</th>
                <th className="px-2 py-2 text-center font-medium text-gray-700 dark:text-gray-300 min-w-[80px]">DÍAS LABORABLES AÑO</th>
                <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-300 min-w-[150px]">OBSERVACIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {contracts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-4 text-center text-gray-500 dark:text-gray-400">
                    No hay contratos. Crea contratos para los empleados en la seccion de arriba.
                  </td>
                </tr>
              ) : (
                contracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-3 py-1 font-medium text-gray-900 dark:text-gray-100">
                      {contract.employeeName}
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="number"
                        value={getValue(contract, 'diasTrabajo')}
                        onChange={(e) => handleChange(contract.id, 'diasTrabajo', e.target.value)}
                        className="w-full px-2 py-1 text-center text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="number"
                        value={getValue(contract, 'horasAnuales')}
                        onChange={(e) => handleChange(contract.id, 'horasAnuales', e.target.value)}
                        className="w-full px-2 py-1 text-center text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="number"
                        value={getValue(contract, 'diasVacaciones')}
                        onChange={(e) => handleChange(contract.id, 'diasVacaciones', e.target.value)}
                        className="w-full px-2 py-1 text-center text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="number"
                        value={getValue(contract, 'diasLibreSemanal')}
                        onChange={(e) => handleChange(contract.id, 'diasLibreSemanal', e.target.value)}
                        className="w-full px-2 py-1 text-center text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="number"
                        value={getValue(contract, 'diasIt')}
                        onChange={(e) => handleChange(contract.id, 'diasIt', e.target.value)}
                        className="w-full px-2 py-1 text-center text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="number"
                        value={getValue(contract, 'diasBonificables')}
                        onChange={(e) => handleChange(contract.id, 'diasBonificables', e.target.value)}
                        className="w-full px-2 py-1 text-center text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="number"
                        value={getValue(contract, 'diasLaborablesAno')}
                        onChange={(e) => handleChange(contract.id, 'diasLaborablesAno', e.target.value)}
                        className="w-full px-2 py-1 text-center text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="text"
                        value={getValue(contract, 'observaciones') || ''}
                        onChange={(e) => handleChange(contract.id, 'observaciones', e.target.value)}
                        placeholder="Ej: Inicio: 2025-02-07"
                        className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DISFRUTADOS - Solo lectura */}
      <div>
        <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 mb-2 px-1">
          DISFRUTADOS
        </h3>
        <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded">
          <table className="w-full text-xs">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300 min-w-[100px]"></th>
                <th className="px-3 py-2 text-center font-medium text-gray-700 dark:text-gray-300">DÍAS TRABAJADOS</th>
                <th className="px-3 py-2 text-center font-medium text-gray-700 dark:text-gray-300">HORAS TRABAJADAS</th>
                <th className="px-3 py-2 text-center font-medium text-gray-700 dark:text-gray-300">DÍAS VACACIONES</th>
                <th className="px-3 py-2 text-center font-medium text-gray-700 dark:text-gray-300">LIBRE SEMANAL</th>
                <th className="px-3 py-2 text-center font-medium text-gray-700 dark:text-gray-300">IT</th>
                <th className="px-3 py-2 text-center font-medium text-gray-700 dark:text-gray-300">DÍAS BONIFICABLES</th>
                <th className="px-3 py-2 text-center font-medium text-gray-700 dark:text-gray-300">TOTAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-4 text-center text-gray-500 dark:text-gray-400">
                    Sin datos
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.employeeId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{emp.employeeName}</td>
                    <td className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">{emp.disfrutados.diasTrabajados}</td>
                    <td className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">{emp.disfrutados.horasTrabajadas}</td>
                    <td className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">{emp.disfrutados.diasVacaciones}</td>
                    <td className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">{emp.disfrutados.diasLibreSemanal}</td>
                    <td className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">{emp.disfrutados.diasIt}</td>
                    <td className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">{emp.disfrutados.diasBonificables}</td>
                    <td className="px-3 py-2 text-center font-bold text-gray-900 dark:text-gray-100">{emp.disfrutados.total}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PENDIENTE HASTA FINAL DE AÑO - Solo lectura */}
      <div>
        <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 mb-2 px-1">
          PENDIENTE HASTA FINAL DE AÑO
        </h3>
        <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded">
          <table className="w-full text-xs">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300 min-w-[100px]"></th>
                <th className="px-3 py-2 text-center font-medium text-gray-700 dark:text-gray-300">DÍAS A TRABAJAR</th>
                <th className="px-3 py-2 text-center font-medium text-gray-700 dark:text-gray-300">HORAS A TRABAJAR</th>
                <th className="px-3 py-2 text-center font-medium text-gray-700 dark:text-gray-300">DÍAS VACACIONES</th>
                <th className="px-3 py-2 text-center font-medium text-gray-700 dark:text-gray-300">LIBRE SEMANAL</th>
                <th className="px-3 py-2 text-center font-medium text-gray-700 dark:text-gray-300">IT</th>
                <th className="px-3 py-2 text-center font-medium text-gray-700 dark:text-gray-300">DÍAS BONIFICABLES</th>
                <th className="px-3 py-2 text-center font-medium text-gray-700 dark:text-gray-300">TOTAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-4 text-center text-gray-500 dark:text-gray-400">
                    Sin datos
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.employeeId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{emp.employeeName}</td>
                    <td className={`px-3 py-2 text-center ${emp.pendiente.diasATrabaja < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      {emp.pendiente.diasATrabaja}
                    </td>
                    <td className={`px-3 py-2 text-center ${emp.pendiente.horasATrabaja < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      {emp.pendiente.horasATrabaja}
                    </td>
                    <td className={`px-3 py-2 text-center ${emp.pendiente.diasVacaciones < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      {emp.pendiente.diasVacaciones}
                    </td>
                    <td className={`px-3 py-2 text-center ${emp.pendiente.diasLibreSemanal < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      {emp.pendiente.diasLibreSemanal}
                    </td>
                    <td className={`px-3 py-2 text-center ${emp.pendiente.diasIt < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      {emp.pendiente.diasIt}
                    </td>
                    <td className={`px-3 py-2 text-center ${emp.pendiente.diasBonificables < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      {emp.pendiente.diasBonificables}
                    </td>
                    <td className={`px-3 py-2 text-center font-bold ${emp.pendiente.total < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                      {emp.pendiente.total}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
