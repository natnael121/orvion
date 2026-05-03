import React, { useState } from 'react'
import {
  BarChart3,
  Users,
  Settings,
  MessageSquare,
  Tag
} from 'lucide-react'
import { Shop, CRMContact } from '../../types'
import CRMDashboard from './CRMDashboard'
import CRMContactBook from './CRMContactBook'
import CRMContactDetail from './CRMContactDetail'
import CRMMessageComposer from './CRMMessageComposer'
import MessageTemplatesManager from './MessageTemplatesManager'
import AutoTagRulesManager from './AutoTagRulesManager'

interface CRMPanelProps {
  shopId: string
  shop?: Shop
  botToken: string
}

const CRMPanel: React.FC<CRMPanelProps> = ({ shopId, shop, botToken: propBotToken }) => {
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'contacts' | 'templates' | 'autoTag'
  >('dashboard')

  // Use bot token from props or fallback to environment variable
  const botToken = propBotToken || import.meta.env.VITE_TELEGRAM_BOT_TOKEN

  const [selectedContact, setSelectedContact] = useState<CRMContact | null>(null)
  const [messageMode, setMessageMode] = useState<'single' | 'multiple'>('single')
  const [selectedContacts, setSelectedContacts] = useState<CRMContact[]>([])
  const [showMessageComposer, setShowMessageComposer] = useState(false)
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'inactive'>('all')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleContactSelect = (contact: CRMContact) => {
    setSelectedContact(contact)
  }

  const handleSendMessage = (contact: CRMContact) => {
    setSelectedContacts([contact])
    setMessageMode('single')
    setShowMessageComposer(true)
    setSelectedContact(null)
  }

  const handleFilterChange = (filter: 'all' | 'active' | 'inactive') => {
    setFilterMode(filter)
    setActiveTab('contacts')
  }

  const handleMessageSent = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  const handleContactUpdate = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  const tabs = [
    {
      id: 'dashboard' as const,
      label: 'Dashboard',
      icon: BarChart3
    },
    {
      id: 'contacts' as const,
      label: 'Contacts',
      icon: Users
    },
    {
      id: 'templates' as const,
      label: 'Templates',
      icon: MessageSquare
    },
    {
      id: 'autoTag' as const,
      label: 'Auto-Tag Rules',
      icon: Tag
    }
  ]

  return (
    <div className="space-y-3">
      <div className="bg-telegram-secondary-bg rounded-lg">
        <div className="border-b border-telegram-hint/20">
          <nav className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-telegram-button text-telegram-button'
                      : 'border-transparent text-telegram-hint hover:text-telegram-text'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="p-3">
          {activeTab === 'dashboard' && (
            <CRMDashboard
              key={refreshTrigger}
              shopId={shopId}
              onFilterChange={handleFilterChange}
            />
          )}

          {activeTab === 'contacts' && (
            <CRMContactBook
              key={refreshTrigger}
              shopId={shopId}
              filterMode={filterMode}
              onContactSelect={handleContactSelect}
            />
          )}

          {activeTab === 'templates' && (
            <MessageTemplatesManager shopId={shopId} />
          )}

          {activeTab === 'autoTag' && (
            <AutoTagRulesManager shopId={shopId} />
          )}
        </div>
      </div>

      {selectedContact && (
        <CRMContactDetail
          contact={selectedContact}
          onClose={() => setSelectedContact(null)}
          onSendMessage={handleSendMessage}
          onUpdate={handleContactUpdate}
        />
      )}

      {showMessageComposer && selectedContacts.length > 0 && (
        <CRMMessageComposer
          shopId={shopId}
          shop={shop}
          botToken={botToken}
          mode={messageMode}
          contacts={selectedContacts}
          onClose={() => {
            setShowMessageComposer(false)
            setSelectedContacts([])
          }}
          onSent={handleMessageSent}
        />
      )}
    </div>
  )
}

export default CRMPanel
