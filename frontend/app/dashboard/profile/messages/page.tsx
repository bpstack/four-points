// app/dashboard/profile/messages/page.tsx

'use client'

import { useState, ReactNode } from 'react'
import Link from 'next/link'
import {
  FiInbox,
  FiSend,
  FiArchive,
  FiTrash2,
  FiCheckCircle,
  FiCircle,
  FiSearch,
  FiFilter,
  FiMoreVertical,
  FiArrowLeft,
  FiMenu,
} from 'react-icons/fi'

type Message = {
  id: number
  subject: string
  preview: string
  sender: string
  timestamp: string
  read: boolean
  category: 'inbox' | 'sent' | 'archived'
}

const mockMessages: Message[] = [
  {
    id: 1,
    subject: 'Actualización del sistema de reservas',
    preview: 'Se ha actualizado el módulo de reservas con nuevas funcionalidades...',
    sender: 'Sistema',
    timestamp: '2h',
    read: false,
    category: 'inbox',
  },
  {
    id: 2,
    subject: 'Informe semanal completado',
    preview: 'El informe de la semana pasada ha sido generado y está disponible...',
    sender: 'Admin',
    timestamp: '5h',
    read: false,
    category: 'inbox',
  },
  {
    id: 3,
    subject: 'Mantenimiento programado',
    preview: 'Recordatorio: El mantenimiento programado se realizará el próximo...',
    sender: 'Operaciones',
    timestamp: '1d',
    read: true,
    category: 'inbox',
  },
]

export default function MessagesPage() {
  const [selectedTab, setSelectedTab] = useState<'inbox' | 'sent' | 'archived'>('inbox')
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [messages, setMessages] = useState<Message[]>(mockMessages)
  const [searchQuery, setSearchQuery] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const filteredMessages = messages.filter(
    (msg) =>
      msg.category === selectedTab &&
      (msg.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.preview.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.sender.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const unreadCount = messages.filter((m) => !m.read && m.category === 'inbox').length

  const handleMarkAsRead = (id: number) => {
    setMessages(messages.map((msg) => (msg.id === id ? { ...msg, read: true } : msg)))
  }

  const handleArchive = (id: number) => {
    setMessages(messages.map((msg) => (msg.id === id ? { ...msg, category: 'archived' } : msg)))
    setSelectedMessage(null)
  }

  const handleDelete = (id: number) => {
    setMessages(messages.filter((msg) => msg.id !== id))
    setSelectedMessage(null)
  }

  return (
    <div className="min-h-screen bg-white text-gray-800 dark:bg-[#010409] dark:text-gray-300">
      <div className="max-w-[1280px] mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/profile">
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-[#21262d] rounded-lg transition-colors">
                <FiArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">Mensajes</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Gestiona tus notificaciones y comunicaciones
              </p>
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-[#21262d] rounded-lg transition-colors"
            >
              <FiMenu className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex gap-4 md:gap-6 h-[calc(100vh-180px)]">
          {/* Sidebar */}
          <div
            className={`${
              sidebarOpen
                ? 'fixed inset-0 z-50 bg-black/50 md:relative md:bg-transparent'
                : 'hidden md:block'
            }`}
            onClick={() => setSidebarOpen(false)}
          >
            <div
              className={`${
                sidebarOpen ? 'fixed left-0 top-0 bottom-0 w-72' : 'w-64 lg:w-72'
              } flex-shrink-0`}
              onClick={(e) => e.stopPropagation()}
            >
              <Sidebar
                selectedTab={selectedTab}
                setSelectedTab={(tab) => {
                  setSelectedTab(tab)
                  setSidebarOpen(false)
                }}
                unreadCount={unreadCount}
                onClose={() => setSidebarOpen(false)}
                isMobile={sidebarOpen}
              />
            </div>
          </div>

          {/* Message List */}
          <div className="flex-1 min-w-0">
            <MessageList
              filteredMessages={filteredMessages}
              selectedMessage={selectedMessage}
              setSelectedMessage={setSelectedMessage}
              handleMarkAsRead={handleMarkAsRead}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          </div>

          {/* Message Detail - Desktop only */}
          {selectedMessage && (
            <div className="hidden lg:block w-80 xl:w-96 flex-shrink-0">
              <MessageDetail
                message={selectedMessage}
                onArchive={handleArchive}
                onDelete={handleDelete}
                onClose={() => setSelectedMessage(null)}
              />
            </div>
          )}
        </div>

        {/* Mobile Message Detail Modal */}
        {selectedMessage && (
          <div
            className="lg:hidden fixed inset-0 z-50 bg-black/50"
            onClick={() => setSelectedMessage(null)}
          >
            <div
              className="absolute right-0 top-0 bottom-0 w-full sm:w-96 bg-white dark:bg-[#0d1117]"
              onClick={(e) => e.stopPropagation()}
            >
              <MessageDetail
                message={selectedMessage}
                onArchive={handleArchive}
                onDelete={handleDelete}
                onClose={() => setSelectedMessage(null)}
                isMobile
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Continuación del archivo messages/page.tsx desde la función Sidebar

function Sidebar({
  selectedTab,
  setSelectedTab,
  unreadCount,
  onClose,
  isMobile,
}: {
  selectedTab: 'inbox' | 'sent' | 'archived'
  setSelectedTab: (tab: 'inbox' | 'sent' | 'archived') => void
  unreadCount: number
  onClose?: () => void
  isMobile?: boolean
}) {
  return (
    <div className={`h-full ${isMobile ? 'bg-white dark:bg-[#0d1117]' : ''}`}>
      <div className="bg-gray-50 dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-lg p-4 h-full">
        {isMobile && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Menú</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-[#21262d] rounded transition-colors"
            >
              ×
            </button>
          </div>
        )}

        <button className="w-full mb-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2">
          <FiSend className="w-4 h-4" />
          Nuevo mensaje
        </button>

        <nav className="space-y-1">
          <SidebarButton
            active={selectedTab === 'inbox'}
            onClick={() => setSelectedTab('inbox')}
            icon={<FiInbox className="w-4 h-4" />}
            label="Bandeja de entrada"
            badge={unreadCount > 0 ? unreadCount : undefined}
          />
          <SidebarButton
            active={selectedTab === 'sent'}
            onClick={() => setSelectedTab('sent')}
            icon={<FiSend className="w-4 h-4" />}
            label="Enviados"
          />
          <SidebarButton
            active={selectedTab === 'archived'}
            onClick={() => setSelectedTab('archived')}
            icon={<FiArchive className="w-4 h-4" />}
            label="Archivados"
          />
        </nav>
      </div>
    </div>
  )
}

function SidebarButton({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  label: string
  badge?: number
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors ${
        active
          ? 'bg-blue-600 text-white'
          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-[#21262d]'
      }`}
    >
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      {badge && (
        <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-medium rounded-full">
          {badge}
        </span>
      )}
    </button>
  )
}

function MessageList({
  filteredMessages,
  selectedMessage,
  setSelectedMessage,
  handleMarkAsRead,
  searchQuery,
  setSearchQuery,
}: {
  filteredMessages: Message[]
  selectedMessage: Message | null
  setSelectedMessage: React.Dispatch<React.SetStateAction<Message | null>>
  handleMarkAsRead: (id: number) => void
  searchQuery: string
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>
}) {
  return (
    <div className="bg-gray-50 dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-lg overflow-hidden flex flex-col h-full">
      {/* Search & Filter */}
      <div className="border-b border-gray-200 dark:border-[#30363d] p-3 md:p-4">
        <div className="flex gap-2 md:gap-3">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar mensajes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs md:text-sm bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-md text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>
          <button className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-[#21262d] dark:hover:bg-[#30363d] border border-gray-200 dark:border-[#30363d] rounded-md transition-colors">
            <FiFilter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <FiInbox className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-sm">No hay mensajes</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-[#30363d]">
            {filteredMessages.map((message) => (
              <button
                key={message.id}
                onClick={() => {
                  setSelectedMessage(message)
                  handleMarkAsRead(message.id)
                }}
                className={`w-full px-3 md:px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-[#21262d] transition-colors ${
                  selectedMessage?.id === message.id ? 'bg-gray-100 dark:bg-[#21262d]' : ''
                } ${!message.read ? 'border-l-2 border-blue-600' : 'border-l-2 border-transparent'}`}
              >
                <MessageItem message={message} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MessageItem({ message }: { message: Message }) {
  return (
    <div className="flex items-start gap-2 md:gap-3">
      <div className="flex-shrink-0 mt-1">
        {message.read ? (
          <FiCheckCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400" />
        ) : (
          <FiCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-600" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <h3
            className={`text-xs md:text-sm truncate ${
              !message.read
                ? 'font-semibold text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-gray-300'
            }`}
          >
            {message.subject}
          </h3>
          <span className="text-xs text-gray-500 flex-shrink-0">{message.timestamp}</span>
        </div>
        <p className="text-xs text-gray-500">{message.sender}</p>
        <p className="text-xs text-gray-400 truncate">{message.preview}</p>
      </div>
    </div>
  )
}

function MessageDetail({
  message,
  onArchive,
  onDelete,
  onClose,
  isMobile,
}: {
  message: Message
  onArchive: (id: number) => void
  onDelete: (id: number) => void
  onClose?: () => void
  isMobile?: boolean
}) {
  return (
    <div className="bg-gray-50 dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-lg overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-[#30363d] p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 truncate">
              {message.subject}
            </h2>
            <p className="text-xs text-gray-500">
              De: <span className="text-gray-700 dark:text-gray-300">{message.sender}</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">Hace {message.timestamp}</p>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            {isMobile && (
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 dark:hover:bg-[#21262d] rounded transition-colors"
              >
                <FiArrowLeft className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            )}
            <button className="p-1 hover:bg-gray-100 dark:hover:bg-[#21262d] rounded transition-colors">
              <FiMoreVertical className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onArchive(message.id)}
            className="flex-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-[#21262d] dark:hover:bg-[#30363d] border border-gray-200 dark:border-[#30363d] rounded-md text-xs text-gray-700 dark:text-gray-300 transition-colors flex items-center justify-center gap-2"
          >
            <FiArchive className="w-3 h-3" />
            Archivar
          </button>
          <button
            onClick={() => onDelete(message.id)}
            className="flex-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-[#21262d] dark:hover:bg-[#30363d] border border-gray-200 dark:border-[#30363d] rounded-md text-xs text-red-500 transition-colors flex items-center justify-center gap-2"
          >
            <FiTrash2 className="w-3 h-3" />
            Eliminar
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="text-xs md:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          <p className="mb-4">{message.preview}</p>
          <p className="text-gray-500 dark:text-gray-400">
            Este es el contenido completo del mensaje. Aquí se mostraría el cuerpo completo del
            mensaje con todos los detalles y información relevante.
          </p>
        </div>
      </div>

      {/* Reply Button */}
      <div className="border-t border-gray-200 dark:border-[#30363d] p-4">
        <button className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2">
          <FiSend className="w-4 h-4" />
          Responder
        </button>
      </div>
    </div>
  )
}
