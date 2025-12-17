// app/components/profile/MessagesPanel.tsx

'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/app/lib/auth/useAuth'
import { cn } from '@/app/lib/helpers/utils'
import {
  FiSend,
  FiSearch,
  FiMoreVertical,
  FiArrowLeft,
  FiUser,
  FiCheck,
  FiCheckCircle,
} from 'react-icons/fi'

// Types
interface Message {
  id: number
  senderId: string
  receiverId: string
  content: string
  timestamp: Date
  read: boolean
}

interface Conversation {
  id: string
  participant: {
    id: string
    username: string
    role: string
    avatar?: string
  }
  lastMessage: string
  lastMessageTime: Date
  unreadCount: number
}

// Mock data - esto vendrá del backend
const mockConversations: Conversation[] = [
  {
    id: '1',
    participant: { id: '2', username: 'Maria Garcia', role: 'recepcionista' },
    lastMessage: 'De acuerdo, me encargo ahora mismo',
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 5), // 5 min ago
    unreadCount: 2,
  },
  {
    id: '2',
    participant: { id: '3', username: 'Carlos Lopez', role: 'mantenimiento' },
    lastMessage: 'La reparacion de la hab 305 esta completada',
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
    unreadCount: 0,
  },
  {
    id: '3',
    participant: { id: '4', username: 'Ana Martinez', role: 'admin' },
    lastMessage: 'Reunion manana a las 10:00',
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
    unreadCount: 0,
  },
]

const mockMessages: Record<string, Message[]> = {
  '1': [
    { id: 1, senderId: '2', receiverId: '1', content: 'Hola, necesito ayuda con una reserva', timestamp: new Date(Date.now() - 1000 * 60 * 30), read: true },
    { id: 2, senderId: '1', receiverId: '2', content: 'Claro, dime que necesitas', timestamp: new Date(Date.now() - 1000 * 60 * 25), read: true },
    { id: 3, senderId: '2', receiverId: '1', content: 'El cliente de la habitacion 201 quiere extender su estancia', timestamp: new Date(Date.now() - 1000 * 60 * 20), read: true },
    { id: 4, senderId: '1', receiverId: '2', content: 'Perfecto, puedes hacer la extension desde el sistema. Ve a Reservas > Modificar', timestamp: new Date(Date.now() - 1000 * 60 * 15), read: true },
    { id: 5, senderId: '2', receiverId: '1', content: 'De acuerdo, me encargo ahora mismo', timestamp: new Date(Date.now() - 1000 * 60 * 5), read: false },
  ],
  '2': [
    { id: 1, senderId: '3', receiverId: '1', content: 'Buenos dias, hay un problema con el aire acondicionado de la 305', timestamp: new Date(Date.now() - 1000 * 60 * 120), read: true },
    { id: 2, senderId: '1', receiverId: '3', content: 'Puedes revisarlo? El huesped se queja del ruido', timestamp: new Date(Date.now() - 1000 * 60 * 110), read: true },
    { id: 3, senderId: '3', receiverId: '1', content: 'La reparacion de la hab 305 esta completada', timestamp: new Date(Date.now() - 1000 * 60 * 60), read: true },
  ],
  '3': [
    { id: 1, senderId: '4', receiverId: '1', content: 'Reunion manana a las 10:00', timestamp: new Date(Date.now() - 1000 * 60 * 180), read: true },
  ],
}

export function MessagesPanel() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations)
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const filteredConversations = conversations.filter(conv =>
    conv.participant.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalUnread = conversations.reduce((acc, conv) => acc + conv.unreadCount, 0)

  useEffect(() => {
    if (selectedConversation) {
      setMessages(mockMessages[selectedConversation.id] || [])
      // Mark as read
      setConversations(prev => prev.map(conv =>
        conv.id === selectedConversation.id ? { ...conv, unreadCount: 0 } : conv
      ))
    }
  }, [selectedConversation])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation || !user) return

    const message: Message = {
      id: Date.now(),
      senderId: user.id,
      receiverId: selectedConversation.participant.id,
      content: newMessage.trim(),
      timestamp: new Date(),
      read: false,
    }

    setMessages(prev => [...prev, message])
    setConversations(prev => prev.map(conv =>
      conv.id === selectedConversation.id
        ? { ...conv, lastMessage: newMessage.trim(), lastMessageTime: new Date() }
        : conv
    ))
    setNewMessage('')
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 1000 / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 1) return 'Ahora'
    if (minutes < 60) return `${minutes}m`
    if (hours < 24) return `${hours}h`
    if (days < 7) return `${days}d`
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
      case 'recepcionista': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'mantenimiento': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Mensajes</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {totalUnread > 0 ? `${totalUnread} sin leer` : 'Todas las conversaciones leidas'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Conversations List */}
        <div className={cn(
          'w-full md:w-80 flex-shrink-0 flex flex-col bg-gray-50 dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-lg overflow-hidden',
          selectedConversation && 'hidden md:flex'
        )}>
          {/* Search */}
          <div className="p-3 border-b border-gray-200 dark:border-[#30363d]">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar conversacion..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
                <FiUser className="w-10 h-10 mb-2 opacity-50" />
                <p className="text-sm">No hay conversaciones</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-[#30363d]">
                {filteredConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={cn(
                      'w-full p-3 text-left hover:bg-gray-100 dark:hover:bg-[#21262d] transition-colors',
                      selectedConversation?.id === conv.id && 'bg-gray-100 dark:bg-[#21262d]'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                        {conv.participant.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {conv.participant.username}
                          </span>
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            {formatTime(conv.lastMessageTime)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {conv.lastMessage}
                          </p>
                          {conv.unreadCount > 0 && (
                            <span className="px-1.5 py-0.5 bg-blue-600 text-white text-xs font-medium rounded-full flex-shrink-0">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={cn(
          'flex-1 flex flex-col bg-gray-50 dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-lg overflow-hidden',
          !selectedConversation && 'hidden md:flex'
        )}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-gray-200 dark:border-[#30363d] flex items-center gap-3">
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="md:hidden p-1 hover:bg-gray-100 dark:hover:bg-[#21262d] rounded-lg transition-colors"
                >
                  <FiArrowLeft className="w-5 h-5 text-gray-500" />
                </button>
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {selectedConversation.participant.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {selectedConversation.participant.username}
                  </p>
                  <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', getRoleColor(selectedConversation.participant.role))}>
                    {selectedConversation.participant.role}
                  </span>
                </div>
                <button className="p-1 hover:bg-gray-100 dark:hover:bg-[#21262d] rounded-lg transition-colors">
                  <FiMoreVertical className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => {
                  const isOwn = msg.senderId === user?.id
                  return (
                    <div
                      key={msg.id}
                      className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}
                    >
                      <div className={cn(
                        'max-w-[80%] px-3 py-2 rounded-lg',
                        isOwn
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] text-gray-900 dark:text-white'
                      )}>
                        <p className="text-sm">{msg.content}</p>
                        <div className={cn(
                          'flex items-center justify-end gap-1 mt-1',
                          isOwn ? 'text-blue-200' : 'text-gray-400'
                        )}>
                          <span className="text-xs">{formatTime(msg.timestamp)}</span>
                          {isOwn && (
                            msg.read
                              ? <FiCheckCircle className="w-3 h-3" />
                              : <FiCheck className="w-3 h-3" />
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-gray-200 dark:border-[#30363d]">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Escribe un mensaje..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1 px-3 py-2 text-sm bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
                  >
                    <FiSend className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-4">
              <FiUser className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm font-medium">Selecciona una conversacion</p>
              <p className="text-xs text-gray-400 mt-1">Elige un contacto para ver los mensajes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
