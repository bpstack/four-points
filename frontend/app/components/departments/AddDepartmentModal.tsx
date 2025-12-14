// app/components/departments/AddDepartmentModal.tsx
'use client'

import { useState } from 'react'
import { FiX, FiSave } from 'react-icons/fi'
import { toast } from 'react-hot-toast'
import { departmentsApi } from '@/app/api/departments/route'
import type { DepartmentModalProps } from './types'

export default function AddDepartmentModal({ isOpen, onClose, onSuccess }: DepartmentModalProps) {
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (name.trim().length < 2) {
      toast.error('El nombre debe tener al menos 2 caracteres')
      return
    }

    setIsSubmitting(true)
    try {
      await departmentsApi.create({ name: name.trim().toLowerCase() })
      toast.success('Departamento creado')
      setName('')
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Error desconocido')
      toast.error(error.message || 'Error al crear departamento')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#161b22] border border-[#d0d7de] dark:border-[#30363d] rounded-md w-full max-w-md shadow-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#d0d7de] dark:border-[#30363d]">
          <h3 className="text-base font-semibold text-[#24292f] dark:text-[#f0f6fc]">
            Nuevo Departamento
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-[#57606a] hover:text-[#24292f] dark:text-[#8b949e] dark:hover:text-[#c9d1d9] transition"
            disabled={isSubmitting}
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-3">
            <label className="block text-sm font-medium text-[#24292f] dark:text-[#c9d1d9] mb-1.5">
              Nombre del Departamento
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-[#0d1117] border border-[#d0d7de] dark:border-[#30363d] rounded-md text-[#24292f] dark:text-[#c9d1d9] text-sm focus:outline-none focus:ring-1 focus:ring-[#0969da] dark:focus:ring-[#1f6feb]"
              placeholder="Ej: Recursos Humanos"
              disabled={isSubmitting}
              autoFocus
            />
            <p className="text-xs text-[#57606a] dark:text-[#8b949e] mt-1">
              {`Se guardara en minusculas. Ejemplo: "backoffice" se mostrara como "Back Office"`}
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-[#f6f8fa] hover:bg-[#eaeef2] dark:bg-[#21262d] dark:hover:bg-[#30363d] text-[#24292f] dark:text-[#c9d1d9] text-sm rounded-md transition"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 bg-[#1a7f37] hover:bg-[#116329] dark:bg-[#238636] dark:hover:bg-[#2ea043] text-white text-sm rounded-md transition flex items-center gap-1.5 disabled:opacity-50"
              disabled={isSubmitting || name.trim().length < 2}
            >
              {isSubmitting ? (
                'Creando...'
              ) : (
                <>
                  <FiSave className="w-3.5 h-3.5" />
                  Crear
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
