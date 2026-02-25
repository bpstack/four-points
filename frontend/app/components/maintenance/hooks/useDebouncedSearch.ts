/**
 * Hook personalizado para debounce suave
 * Ideal para búsqueda en tiempo real sin interrumpir al usuario
 */

import { useState, useCallback, useRef, useEffect } from 'react'

interface UseDebouncedSearchOptions {
  delayMs?: number
  onSearch: (value: string) => void
  initialValue?: string
}

export function useDebouncedSearch({
  delayMs = 400,
  onSearch,
  initialValue = '',
}: UseDebouncedSearchOptions) {
  const [searchInput, setSearchInputState] = useState(initialValue)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const onSearchRef = useRef(onSearch)
  onSearchRef.current = onSearch

  // Manejar cambio de input (con debounce)
  const handleInputChange = useCallback(
    (value: string) => {
      setSearchInputState(value)

      // Limpiar timeout anterior
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Establecer nuevo timeout - usa ref para siempre tener la versión más reciente
      setIsSearching(true)
      timeoutRef.current = setTimeout(() => {
        onSearchRef.current(value)
        setIsSearching(false)
      }, delayMs)
    },
    [delayMs]
  )

  // Búsqueda inmediata (sin esperar debounce)
  const searchNow = useCallback((value: string) => {
    setSearchInputState(value)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsSearching(false)
    onSearchRef.current(value)
  }, [])

  // Resetear el input sin disparar búsqueda
  const resetInput = useCallback((value: string = '') => {
    setSearchInputState(value)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsSearching(false)
  }, [])

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    searchInput,
    setSearchInput: handleInputChange,
    searchNow,
    resetInput,
    isSearching,
  }
}
