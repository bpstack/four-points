// app/components/groups/cards/ContactCard.tsx

//TODO Agregar role y descripción como campos, db, backend y frontend
//TODO Establecer primary contact como único

'use client'

import { GroupContact } from '@/app/lib/groups'
import { FiMail, FiPhone, FiEdit, FiStar, FiUser } from 'react-icons/fi'

interface ContactCardProps {
  contact: GroupContact
  onEdit: () => void
}

export function ContactCard({ contact, onEdit }: ContactCardProps) {
  return (
    <div className="bg-surface rounded-lg border border-border p-4 hover:shadow-md dark:hover:shadow-gray-900/50 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <FiUser className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-fg truncate">
                {contact.contact_name || 'Sin nombre'}
              </h3>
              {contact.is_primary && (
                <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800 rounded-full text-[10px] font-medium">
                  <FiStar className="w-3 h-3" />
                  Principal
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={onEdit}
          className="ml-2 flex-shrink-0 inline-flex items-center justify-center w-8 h-8 text-fg-muted hover:text-blue-600 dark:hover:text-blue-400 hover:bg-surface-hover rounded transition-colors"
        >
          <FiEdit className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        {contact.contact_email && (
          <div className="flex items-center gap-2 text-xs">
            <FiMail className="w-3.5 h-3.5 text-fg-subtle flex-shrink-0" />
            <a
              href={`mailto:${contact.contact_email}`}
              className="text-blue-600 dark:text-blue-400 hover:underline truncate"
            >
              {contact.contact_email}
            </a>
          </div>
        )}

        {contact.contact_phone && (
          <div className="flex items-center gap-2 text-xs">
            <FiPhone className="w-3.5 h-3.5 text-fg-subtle flex-shrink-0" />
            <a
              href={`tel:${contact.contact_phone}`}
              className="text-fg hover:text-blue-600 dark:hover:text-blue-400"
            >
              {contact.contact_phone}
            </a>
          </div>
        )}

        {!contact.contact_email && !contact.contact_phone && (
          <p className="text-xs text-fg-subtle italic">Sin información de contacto</p>
        )}
      </div>
    </div>
  )
}
