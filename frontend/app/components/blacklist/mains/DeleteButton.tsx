// app/components/blacklist/mains/DeleteButton.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/app/components/blacklist/ui/Button'
import { deleteBlacklist } from '@/app/dashboard/blacklist/actions/deleteBlacklist'
import { IoTrashOutline } from 'react-icons/io5'
import toast from 'react-hot-toast'

interface DeleteButtonProps {
  entryId: string
}

export function DeleteButton({ entryId }: DeleteButtonProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (
      !confirm(
        '¿Estás seguro de eliminar este registro? Esta acción marcará el registro como eliminado pero podrá ser restaurado posteriormente.'
      )
    ) {
      return
    }

    setIsDeleting(true)
    toast.loading('Eliminando registro...')

    try {
      const result = await deleteBlacklist(entryId)

      toast.dismiss()

      if (result.success) {
        toast.success('Registro eliminado correctamente')
        router.push('/dashboard/blacklist')
        router.refresh()
      } else {
        toast.error(result.error || 'Error al eliminar el registro')
      }
    } catch (error) {
      toast.dismiss()
      const message = error instanceof Error ? error.message : 'Error al eliminar'
      toast.error(message)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Button
      variant="danger"
      onClick={handleDelete}
      isLoading={isDeleting}
      leftIcon={<IoTrashOutline size={18} />}
    >
      Eliminar
    </Button>
  )
}
