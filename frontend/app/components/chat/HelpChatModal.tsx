// app/components/chat/HelpChatModal.tsx
'use client'

import { Fragment, useState, useRef, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { FiX, FiSend, FiHelpCircle } from 'react-icons/fi'
import { cn } from '@/app/lib/helpers/utils'
import { sendChatMessage, ChatMessage } from '@/app/lib/chat'

// ============================================
// TYPES
// ============================================

interface HelpChatModalProps {
  isOpen: boolean
  onClose: () => void
}

// Preguntas frecuentes organizadas por categoría
const FREQUENT_QUESTIONS = [
  {
    category: 'General',
    questions: [
      '¿Qué módulos tiene la aplicación?',
      '¿Cómo cambio el tema a oscuro?',
      '¿Qué roles de usuario existen?',
    ],
  },
  {
    category: 'Logbook',
    questions: ['¿Cómo creo una entrada en el logbook?', '¿Cómo filtro por departamento?'],
  },
  {
    category: 'Scheduling',
    questions: [
      '¿Cómo funciona el generador de horarios?',
      '¿Qué fases tiene el algoritmo?',
      '¿Cómo funciona la IA en los horarios?',
      '¿Qué validaciones hace la IA?',
    ],
  },
  {
    category: 'Desarrollo',
    questions: ['¿Cómo añado una nueva fase al generador?', '¿Cómo funciona la autenticación?'],
  },
]

// ============================================
// COMPONENT
// ============================================

export function HelpChatModal({ isOpen, onClose }: HelpChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Scroll al final cuando hay nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus en el input cuando se abre
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Limpiar al cerrar
  const handleClose = () => {
    setMessages([])
    setInput('')
    setError(null)
    onClose()
  }

  // Enviar mensaje
  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setError(null)

    // Agregar mensaje del usuario
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: userMessage }]
    setMessages(newMessages)

    setIsLoading(true)

    try {
      const response = await sendChatMessage(userMessage, messages)

      if (response.success && response.reply) {
        setMessages([...newMessages, { role: 'assistant', content: response.reply }])
      } else {
        setError(response.error || 'Error al obtener respuesta')
      }
    } catch (err) {
      console.error('Error en chat:', err)
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  // Enviar con Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={handleClose} className="relative z-50">
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
        </Transition.Child>

        {/* Modal container */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-[#0d1117] shadow-2xl transition-all border border-gray-200/50 dark:border-gray-800/50 flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="px-5 py-3 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-100 dark:border-blue-900/30 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <FiHelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <Dialog.Title className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        Ayuda IA
                      </Dialog.Title>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Pregunta sobre la aplicación
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </div>

                {/* Messages area */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-[400px]">
                  {messages.length === 0 && !isLoading && (
                    <div className="flex flex-col text-gray-500 dark:text-gray-400">
                      <div className="text-center mb-5">
                        <FiHelpCircle className="w-12 h-12 mx-auto mb-3 opacity-40" />
                        <p className="text-sm">
                          Pregúntame sobre la app o cómo funciona el código.
                        </p>
                      </div>
                      <div className="space-y-4">
                        {FREQUENT_QUESTIONS.map((category) => (
                          <div key={category.category}>
                            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase mb-2 tracking-wide">
                              {category.category}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {category.questions.map((question) => (
                                <button
                                  key={question}
                                  onClick={() => setInput(question)}
                                  className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-800/80 hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors text-left border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
                                >
                                  {question}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className={cn(
                          'max-w-[85%] px-4 py-2.5 rounded-2xl text-sm',
                          msg.role === 'user'
                            ? 'bg-blue-600 text-white rounded-br-md'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-md'
                        )}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2.5 rounded-2xl rounded-bl-md">
                        <div className="flex gap-1.5">
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                        </div>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="flex justify-center">
                      <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
                        {error}
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input area */}
                <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#161b22] shrink-0">
                  <div className="flex gap-3">
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Escribe tu pregunta..."
                      disabled={isLoading}
                      className="flex-1 px-4 py-2.5 bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition-all"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() || isLoading}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-xl transition-colors disabled:cursor-not-allowed"
                    >
                      <FiSend className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
