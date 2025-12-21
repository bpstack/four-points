// app/components/profile/MessagesPanel.tsx

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
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
  FiPlus,
  FiUsers,
  FiEdit2,
  FiTrash2,
  FiBell,
  FiX,
  FiLoader,
} from 'react-icons/fi'
import {
  getConversations,
  getMessages,
  sendMessage,
  createConversation,
  markConversationAsRead,
  searchUsers,
  editMessage,
  deleteMessage,
  deleteConversation,
  leaveConversation,
  getConversation,
} from '@/app/lib/messaging/queries'
import type {
  Conversation,
  ConversationWithParticipants,
  Message,
  UserSearchResult,
  ConversationType,
} from '@/app/lib/messaging/types'

// ===============================================
// COMPONENT
// ===============================================

export function MessagesPanel() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const chatParam = searchParams.get('chat')

  // State
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [hasMoreMessages, setHasMoreMessages] = useState(false)
  const [notify, setNotify] = useState(false)

  // New conversation modal
  const [showNewConversation, setShowNewConversation] = useState(false)
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [searchingUsers, setSearchingUsers] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<UserSearchResult[]>([])
  const [groupName, setGroupName] = useState('')
  const [creatingConversation, setCreatingConversation] = useState(false)

  // Edit/Delete
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null)
  const [editContent, setEditContent] = useState('')

  // Conversation menu
  const [showConversationMenu, setShowConversationMenu] = useState(false)

  // Participants dropdown
  const [showParticipants, setShowParticipants] = useState(false)
  const [participants, setParticipants] = useState<ConversationWithParticipants['participants']>([])
  const [loadingParticipants, setLoadingParticipants] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // ===============================================
  // DATA FETCHING
  // ===============================================

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getConversations()
      setConversations(data)

      // Si hay chat param, seleccionar esa conversacion
      if (chatParam) {
        const conv = data.find((c) => c.id === parseInt(chatParam))
        if (conv) setSelectedConversation(conv)
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoading(false)
    }
  }, [chatParam])

  const fetchMessages = useCallback(async (conversationId: number, before?: number) => {
    try {
      setLoadingMessages(true)
      const response = await getMessages(conversationId, { before, limit: 50 })

      if (before) {
        // Prepend older messages
        setMessages((prev) => [...response.data, ...prev])
      } else {
        setMessages(response.data)
      }
      setHasMoreMessages(response.has_more)
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoadingMessages(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // Load messages when conversation changes
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id)
      markConversationAsRead(selectedConversation.id).catch(console.error)

      // Update unread count locally
      setConversations((prev) =>
        prev.map((c) => (c.id === selectedConversation.id ? { ...c, unread_count: 0 } : c))
      )

      // Reset participants dropdown
      setShowParticipants(false)
      setParticipants([])
    }
  }, [selectedConversation, fetchMessages])

  // Search users for new conversation
  useEffect(() => {
    if (!showNewConversation) return

    const searchUsersDebounced = async () => {
      setSearchingUsers(true)
      try {
        const results = await searchUsers(userSearchQuery || undefined)
        setSearchResults(results)
      } catch (error) {
        console.error('Error searching users:', error)
      } finally {
        setSearchingUsers(false)
      }
    }

    const timer = setTimeout(searchUsersDebounced, 300)
    return () => clearTimeout(timer)
  }, [userSearchQuery, showNewConversation])

  // ===============================================
  // HANDLERS
  // ===============================================

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user || sending) return

    try {
      setSending(true)
      const message = await sendMessage(selectedConversation.id, {
        content: newMessage.trim(),
        notify,
      })

      setMessages((prev) => [...prev, message])
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConversation.id
            ? { ...c, last_message: newMessage.trim(), last_message_at: new Date().toISOString() }
            : c
        )
      )
      setNewMessage('')
      setNotify(false)
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  const handleCreateConversation = async () => {
    if (selectedUsers.length === 0 || creatingConversation) return

    const type: ConversationType = selectedUsers.length === 1 ? 'dm' : 'group'
    if (type === 'group' && !groupName.trim()) {
      alert('Los grupos necesitan un nombre')
      return
    }

    try {
      setCreatingConversation(true)
      const { conversation, existing } = await createConversation({
        type,
        name: type === 'group' ? groupName.trim() : undefined,
        participant_ids: selectedUsers.map((u) => u.id),
      })

      if (!existing) {
        setConversations((prev) => [conversation, ...prev])
      }

      setSelectedConversation(conversation)
      setShowNewConversation(false)
      setSelectedUsers([])
      setGroupName('')
      setUserSearchQuery('')
    } catch (error) {
      console.error('Error creating conversation:', error)
    } finally {
      setCreatingConversation(false)
    }
  }

  const handleEditMessage = async (messageId: number) => {
    if (!editContent.trim()) return

    try {
      const updated = await editMessage(messageId, { content: editContent.trim() })
      setMessages((prev) => prev.map((m) => (m.id === messageId ? updated : m)))
      setEditingMessageId(null)
      setEditContent('')
    } catch (error) {
      console.error('Error editing message:', error)
    }
  }

  const handleDeleteMessage = async (messageId: number) => {
    if (!confirm('¿Eliminar este mensaje?')) return

    try {
      await deleteMessage(messageId)
      setMessages((prev) => prev.filter((m) => m.id !== messageId))
    } catch (error) {
      console.error('Error deleting message:', error)
    }
  }

  const handleLoadMore = () => {
    if (messages.length > 0 && hasMoreMessages && selectedConversation) {
      fetchMessages(selectedConversation.id, messages[0].id)
    }
  }

  const handleShowParticipants = async () => {
    if (!selectedConversation || selectedConversation.type !== 'group') return

    // Toggle off if already showing
    if (showParticipants) {
      setShowParticipants(false)
      return
    }

    try {
      setLoadingParticipants(true)
      const data = await getConversation(selectedConversation.id)
      setParticipants(data?.participants || [])
      setShowParticipants(true)
    } catch (error) {
      console.error('Error loading participants:', error)
    } finally {
      setLoadingParticipants(false)
    }
  }

  const handleDeleteConversation = async () => {
    if (!selectedConversation) return
    if (!confirm('¿Eliminar esta conversación? Se borrarán todos los mensajes permanentemente.'))
      return

    try {
      await deleteConversation(selectedConversation.id)
      setConversations((prev) => prev.filter((c) => c.id !== selectedConversation.id))
      setSelectedConversation(null)
      setMessages([])
      setShowConversationMenu(false)
    } catch (error) {
      console.error('Error deleting conversation:', error)
      alert('No tienes permisos para eliminar esta conversación')
    }
  }

  const handleLeaveConversation = async () => {
    if (!selectedConversation) return
    if (!confirm('¿Salir de esta conversación?')) return

    try {
      await leaveConversation(selectedConversation.id)
      setConversations((prev) => prev.filter((c) => c.id !== selectedConversation.id))
      setSelectedConversation(null)
      setMessages([])
      setShowConversationMenu(false)
    } catch (error) {
      console.error('Error leaving conversation:', error)
    }
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowConversationMenu(false)
      }
    }

    if (showConversationMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showConversationMenu])

  const toggleUserSelection = (userResult: UserSearchResult) => {
    // Si tiene DM existente, abrir directamente
    if (userResult.existing_dm_id) {
      const existingConv = conversations.find((c) => c.id === userResult.existing_dm_id)
      if (existingConv) {
        setSelectedConversation(existingConv)
        setShowNewConversation(false)
        return
      }
    }

    setSelectedUsers((prev) => {
      const exists = prev.find((u) => u.id === userResult.id)
      if (exists) {
        return prev.filter((u) => u.id !== userResult.id)
      }
      return [...prev, userResult]
    })
  }

  // ===============================================
  // HELPERS
  // ===============================================

  const formatTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    // Si la fecha es futura o inválida, mostrar vacío
    if (diff < 0 || isNaN(diff)) return ''

    const minutes = Math.floor(diff / 1000 / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 1) return 'Ahora'
    if (minutes < 60) return `${minutes}m`
    if (hours < 24) return `${hours}h`
    if (days < 7) return `${days}d`
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }

  const getRoleColor = (role: string | undefined) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
      case 'recepcionista':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'mantenimiento':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
    }
  }

  const getConversationName = (conv: Conversation) => {
    if (conv.type === 'group') return conv.name || 'Grupo sin nombre'
    return conv.other_username || 'Usuario'
  }

  const getConversationInitial = (conv: Conversation) => {
    const name = getConversationName(conv)
    return name.charAt(0).toUpperCase()
  }

  const filteredConversations = conversations.filter((conv) => {
    const name = getConversationName(conv).toLowerCase()
    return name.includes(searchQuery.toLowerCase())
  })

  const totalUnread = conversations.reduce((acc, conv) => acc + (conv.unread_count || 0), 0)

  // ===============================================
  // RENDER
  // ===============================================

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <FiLoader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
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
          <button
            onClick={() => setShowNewConversation(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <FiPlus className="w-4 h-4" />
            Nuevo
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Conversations List */}
        <div
          className={cn(
            'w-full md:w-80 flex-shrink-0 flex flex-col bg-gray-50 dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-lg overflow-hidden',
            selectedConversation && 'hidden md:flex'
          )}
        >
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
                <button
                  onClick={() => setShowNewConversation(true)}
                  className="mt-2 text-blue-500 text-sm hover:underline"
                >
                  Iniciar una nueva
                </button>
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
                      <div
                        className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0',
                          conv.type === 'group'
                            ? 'bg-gradient-to-br from-green-500 to-teal-600'
                            : 'bg-gradient-to-br from-blue-500 to-purple-600'
                        )}
                      >
                        {conv.type === 'group' ? (
                          <FiUsers className="w-5 h-5" />
                        ) : (
                          getConversationInitial(conv)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {getConversationName(conv)}
                          </span>
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            {formatTime(conv.last_message_at)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {conv.last_message || 'Sin mensajes'}
                          </p>
                          {Number(conv.unread_count) > 0 ? (
                            <span className="px-1.5 py-0.5 bg-blue-600 text-white text-xs font-medium rounded-full flex-shrink-0">
                              {conv.unread_count}
                            </span>
                          ) : null}
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
        <div
          className={cn(
            'flex-1 flex flex-col bg-gray-50 dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-lg overflow-hidden',
            !selectedConversation && 'hidden md:flex'
          )}
        >
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
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium',
                    selectedConversation.type === 'group'
                      ? 'bg-gradient-to-br from-green-500 to-teal-600'
                      : 'bg-gradient-to-br from-blue-500 to-purple-600'
                  )}
                >
                  {selectedConversation.type === 'group' ? (
                    <FiUsers className="w-4 h-4" />
                  ) : (
                    getConversationInitial(selectedConversation)
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {getConversationName(selectedConversation)}
                  </p>
                  {selectedConversation.type === 'dm' && selectedConversation.other_role && (
                    <span
                      className={cn(
                        'px-1.5 py-0.5 rounded text-xs font-medium',
                        getRoleColor(selectedConversation.other_role)
                      )}
                    >
                      {selectedConversation.other_role}
                    </span>
                  )}
                  {selectedConversation.type === 'group' && (
                    <button
                      onClick={handleShowParticipants}
                      className="text-xs text-gray-500 hover:text-blue-500 hover:underline transition-colors flex items-center gap-1"
                      disabled={loadingParticipants}
                    >
                      {loadingParticipants ? <FiLoader className="w-3 h-3 animate-spin" /> : null}
                      {selectedConversation.participant_count} participantes
                    </button>
                  )}
                </div>
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setShowConversationMenu(!showConversationMenu)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-[#21262d] rounded-lg transition-colors"
                  >
                    <FiMoreVertical className="w-4 h-4 text-gray-500" />
                  </button>

                  {/* Dropdown Menu */}
                  {showConversationMenu && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-[#21262d] border border-gray-200 dark:border-[#30363d] rounded-lg shadow-lg py-1 z-50">
                      {selectedConversation.type === 'group' && (
                        <button
                          onClick={handleLeaveConversation}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#30363d] flex items-center gap-2"
                        >
                          <FiArrowLeft className="w-4 h-4" />
                          Salir del grupo
                        </button>
                      )}
                      <button
                        onClick={handleDeleteConversation}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                      >
                        <FiTrash2 className="w-4 h-4" />
                        Eliminar conversación
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {hasMoreMessages && (
                  <div className="text-center">
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingMessages}
                      className="text-sm text-blue-500 hover:underline disabled:opacity-50"
                    >
                      {loadingMessages ? 'Cargando...' : 'Cargar mensajes anteriores'}
                    </button>
                  </div>
                )}

                {messages.map((msg) => {
                  const isOwn = msg.sender_id === user?.id
                  const isEditing = editingMessageId === msg.id

                  return (
                    <div
                      key={msg.id}
                      className={cn('flex group', isOwn ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className={cn(
                          'max-w-[80%] px-3 py-2 rounded-lg relative',
                          isOwn
                            ? 'bg-blue-600 text-white'
                            : 'bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] text-gray-900 dark:text-white'
                        )}
                      >
                        {!isOwn && selectedConversation.type === 'group' && (
                          <p className="text-xs font-medium mb-1 text-blue-500">
                            {msg.sender_username}
                          </p>
                        )}

                        {isEditing ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="flex-1 px-2 py-1 text-sm bg-white dark:bg-[#21262d] border rounded text-gray-900 dark:text-white"
                              autoFocus
                            />
                            <button
                              onClick={() => handleEditMessage(msg.id)}
                              className="text-green-500"
                            >
                              <FiCheck className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingMessageId(null)
                                setEditContent('')
                              }}
                              className="text-red-500"
                            >
                              <FiX className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <p className="text-sm">{msg.content}</p>
                        )}

                        <div
                          className={cn(
                            'flex items-center justify-end gap-1 mt-1',
                            isOwn ? 'text-blue-200' : 'text-gray-400'
                          )}
                        >
                          {!!msg.is_edited && <span className="text-xs italic">editado</span>}
                          <span className="text-xs">{formatTime(msg.created_at)}</span>
                          {isOwn && <FiCheckCircle className="w-3 h-3" />}
                        </div>

                        {/* Edit/Delete buttons */}
                        {isOwn && !isEditing && (
                          <div className="absolute -top-2 -right-2 hidden group-hover:flex gap-1">
                            <button
                              onClick={() => {
                                setEditingMessageId(msg.id)
                                setEditContent(msg.content)
                              }}
                              className="p-1 bg-white dark:bg-[#21262d] border border-gray-200 dark:border-[#30363d] rounded shadow-sm hover:bg-gray-100 dark:hover:bg-[#30363d]"
                            >
                              <FiEdit2 className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                            </button>
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="p-1 bg-white dark:bg-[#21262d] border border-gray-200 dark:border-[#30363d] rounded shadow-sm hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <FiTrash2 className="w-3 h-3 text-red-500" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-gray-200 dark:border-[#30363d]">
                <div className="flex gap-2 items-center">
                  <button
                    onClick={() => setNotify(!notify)}
                    className={cn(
                      'p-2 rounded-lg transition-colors',
                      notify
                        ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'hover:bg-gray-100 dark:hover:bg-[#21262d] text-gray-400'
                    )}
                    title={notify ? 'Notificacion activada' : 'Activar notificacion urgente'}
                  >
                    <FiBell className="w-4 h-4" />
                  </button>
                  <input
                    type="text"
                    placeholder="Escribe un mensaje..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    className="flex-1 px-3 py-2 text-sm bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sending}
                    className="p-1.5 md:px-4 md:py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:opacity-50 text-white rounded-md md:rounded-lg transition-colors"
                  >
                    {sending ? (
                      <FiLoader className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" />
                    ) : (
                      <FiSend className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    )}
                  </button>
                </div>
                {notify && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                    Los destinatarios recibiran una notificacion urgente
                  </p>
                )}
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

      {/* New Conversation Modal */}
      {showNewConversation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#161b22] rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200 dark:border-[#30363d] flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Nueva conversacion
              </h3>
              <button
                onClick={() => {
                  setShowNewConversation(false)
                  setSelectedUsers([])
                  setGroupName('')
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-[#21262d] rounded-lg transition-colors"
              >
                <FiX className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Selected Users */}
            {selectedUsers.length > 0 && (
              <div className="p-3 border-b border-gray-200 dark:border-[#30363d]">
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((u) => (
                    <span
                      key={u.id}
                      className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm rounded-full flex items-center gap-1"
                    >
                      {u.username}
                      <button onClick={() => toggleUserSelection(u)}>
                        <FiX className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                {selectedUsers.length > 1 && (
                  <input
                    type="text"
                    placeholder="Nombre del grupo..."
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full mt-2 px-3 py-2 text-sm bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                )}
              </div>
            )}

            {/* Search */}
            <div className="p-3 border-b border-gray-200 dark:border-[#30363d]">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar usuarios..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* User List */}
            <div className="flex-1 overflow-y-auto">
              {searchingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <FiLoader className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                  <FiUser className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm">No se encontraron usuarios</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-[#30363d]">
                  {searchResults.map((u) => {
                    const isSelected = selectedUsers.some((su) => su.id === u.id)
                    return (
                      <button
                        key={u.id}
                        onClick={() => toggleUserSelection(u)}
                        className={cn(
                          'w-full p-3 text-left hover:bg-gray-100 dark:hover:bg-[#21262d] transition-colors flex items-center gap-3',
                          isSelected && 'bg-blue-50 dark:bg-blue-900/20'
                        )}
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {u.username}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{u.email}</p>
                        </div>
                        <span
                          className={cn('px-2 py-0.5 rounded text-xs', getRoleColor(u.role_name))}
                        >
                          {u.role_name}
                        </span>
                        {u.existing_dm_id && (
                          <span className="text-xs text-blue-500">Chat existente</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-[#30363d]">
              <button
                onClick={handleCreateConversation}
                disabled={selectedUsers.length === 0 || creatingConversation}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {creatingConversation ? (
                  <>
                    <FiLoader className="w-4 h-4 animate-spin" />
                    Creando...
                  </>
                ) : selectedUsers.length > 1 ? (
                  <>
                    <FiUsers className="w-4 h-4" />
                    Crear grupo
                  </>
                ) : (
                  <>
                    <FiSend className="w-4 h-4" />
                    Iniciar chat
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Participants Modal */}
      {showParticipants && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowParticipants(false)}
        >
          <div
            className="bg-white dark:bg-[#161b22] rounded-lg shadow-xl w-full max-w-sm max-h-[60vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200 dark:border-[#30363d] flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Participantes</h3>
              <button
                onClick={() => setShowParticipants(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-[#21262d] rounded-lg transition-colors"
              >
                <FiX className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Participants List */}
            <div className="flex-1 overflow-y-auto">
              {participants.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <FiLoader className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-[#30363d]">
                  {participants.map((p) => (
                    <div key={p.user_id} className="px-4 py-3 flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                        {p.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {p.username}
                          {p.user_id === user?.id && (
                            <span className="text-gray-400 ml-1">(tu)</span>
                          )}
                        </p>
                        {p.role_name && (
                          <span
                            className={cn(
                              'px-1.5 py-0.5 rounded text-xs',
                              getRoleColor(p.role_name)
                            )}
                          >
                            {p.role_name}
                          </span>
                        )}
                      </div>
                      {p.is_admin && (
                        <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs rounded">
                          Admin
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
