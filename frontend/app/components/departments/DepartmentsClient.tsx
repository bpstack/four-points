// app/components/departments/DepartmentsClient.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi'
import { toast } from 'react-hot-toast'
import { departmentsApi } from '@/app/api/departments/route'
import { formatDepartmentName } from '@/app/lib/logbooks/hooks/useDepartments'
import AddDepartmentModal from './AddDepartmentModal'
import EditDepartmentModal from './EditDepartmentModal'
import type { FormattedDepartment } from './types'

export default function DepartmentsClient() {
  const [departments, setDepartments] = useState<FormattedDepartment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState<FormattedDepartment | null>(null)

  // Cargar departamentos con nombres formateados
  const loadDepartments = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await departmentsApi.getAll()

      // Formatear nombres
      const formatted: FormattedDepartment[] = data.map((dept) => ({
        ...dept,
        displayName: formatDepartmentName(dept.name),
      }))

      // Ordenar alfabeticamente por nombre formateado
      formatted.sort((a, b) =>
        a.displayName.localeCompare(b.displayName, 'es', { sensitivity: 'base' })
      )

      setDepartments(formatted)
    } catch (err: unknown) {
      console.error('Error loading departments:', err)
      toast.error('Error al cargar departamentos')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDepartments()
  }, [loadDepartments])

  // Eliminar departamento
  const handleDelete = async (id: number, displayName: string) => {
    if (!confirm(`Eliminar el departamento "${displayName}"?`)) {
      return
    }

    try {
      await departmentsApi.delete(id)
      toast.success('Departamento eliminado')
      loadDepartments()
    } catch (err: unknown) {
      console.error('Error deleting department:', err)
      const error = err as { response?: { data?: { error?: string } } }
      toast.error(error?.response?.data?.error || 'Error al eliminar')
    }
  }

  // Abrir modal de edicion
  const handleEdit = (department: FormattedDepartment) => {
    setSelectedDepartment(department)
    setIsEditModalOpen(true)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f6f8fa] dark:bg-[#0d1117] p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-[#d0d7de] dark:bg-[#30363d] rounded w-48"></div>
            <div className="h-64 bg-[#d0d7de] dark:bg-[#30363d] rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f6f8fa] dark:bg-[#0d1117] p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[#24292f] dark:text-[#f0f6fc]">
              Departamentos
            </h1>
            <p className="text-sm text-[#57606a] dark:text-[#8b949e] mt-0.5">
              Gestiona los departamentos del hotel ({departments.length} total)
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3 py-1.5 bg-[#1a7f37] hover:bg-[#116329] dark:bg-[#238636] dark:hover:bg-[#2ea043] text-white text-sm rounded-md transition flex items-center gap-1.5"
          >
            <FiPlus className="w-4 h-4" />
            Nuevo
          </button>
        </div>

        {/* Tabla */}
        <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f6f8fa] dark:bg-[#0d1117] border-b border-[#d0d7de] dark:border-[#30363d]">
                <th className="text-left px-4 py-2 font-semibold text-[#24292f] dark:text-[#c9d1d9]">
                  ID
                </th>
                <th className="text-left px-4 py-2 font-semibold text-[#24292f] dark:text-[#c9d1d9]">
                  Nombre del Departamento
                </th>
                <th className="text-right px-4 py-2 font-semibold text-[#24292f] dark:text-[#c9d1d9]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {departments.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-8 text-center text-[#57606a] dark:text-[#8b949e]"
                  >
                    No hay departamentos registrados
                  </td>
                </tr>
              ) : (
                departments.map((dept) => (
                  <tr
                    key={dept.id}
                    className="border-b border-[#d0d7de] dark:border-[#30363d] last:border-0 hover:bg-[#f6f8fa] dark:hover:bg-[#0d1117] transition"
                  >
                    <td className="px-4 py-2.5 text-[#57606a] dark:text-[#8b949e]">#{dept.id}</td>
                    <td className="px-4 py-2.5 text-[#24292f] dark:text-[#c9d1d9] font-medium">
                      {dept.displayName}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleEdit(dept)}
                          className="p-1.5 text-[#57606a] hover:text-[#0969da] dark:text-[#8b949e] dark:hover:text-[#58a6ff] hover:bg-[#f6f8fa] dark:hover:bg-[#21262d] rounded transition"
                          title="Editar"
                        >
                          <FiEdit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(dept.id, dept.displayName)}
                          className="p-1.5 text-[#57606a] hover:text-[#cf222e] dark:text-[#8b949e] dark:hover:text-[#f85149] hover:bg-[#f6f8fa] dark:hover:bg-[#21262d] rounded transition"
                          title="Eliminar"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modales */}
      <AddDepartmentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={loadDepartments}
      />

      {selectedDepartment && (
        <EditDepartmentModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setSelectedDepartment(null)
          }}
          onSuccess={loadDepartments}
          department={selectedDepartment}
        />
      )}
    </div>
  )
}
