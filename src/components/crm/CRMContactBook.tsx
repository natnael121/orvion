import React, { useState, useEffect } from 'react'
import { Search, Filter, User, MessageCircle, RefreshCw, Grid2x2 as Grid, List, Mail, Phone, ShoppingBag, DollarSign } from 'lucide-react'
import { getContactsByShop, searchContacts } from '../../services/crmService'
import { syncContact } from '../../services/crmSyncService'
import { CRMContact } from '../../types'
import { format } from 'date-fns'

interface CRMContactBookProps {
  shopId: string
  filterMode?: 'all' | 'active' | 'inactive'
  onContactSelect: (contact: CRMContact) => void
}

const CRMContactBook: React.FC<CRMContactBookProps> = ({
  shopId,
  filterMode = 'all',
  onContactSelect
}) => {
  const [contacts, setContacts] = useState<CRMContact[]>([])
  const [filteredContacts, setFilteredContacts] = useState<CRMContact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [refreshingId, setRefreshingId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'table'>('list')
  const [sourceFilter, setSourceFilter] = useState<'all' | 'web' | 'telegram'>('all')

  const loadContacts = async () => {
    try {
      setLoading(true)
      const data = await getContactsByShop(shopId)
      setContacts(data)

      const tags = new Set<string>()
      data.forEach(contact => {
        contact.tags.forEach(tag => tags.add(tag))
      })
      setAvailableTags(Array.from(tags))

      applyFilters(data, searchTerm, selectedTags, filterMode)
    } catch (error) {
      console.error('Error loading contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (shopId) {
      loadContacts()
    }
  }, [shopId])

  useEffect(() => {
    applyFilters(contacts, searchTerm, selectedTags, filterMode)
  }, [searchTerm, selectedTags, filterMode, contacts, sourceFilter])

  const applyFilters = (
    contactsList: CRMContact[],
    search: string,
    tags: string[],
    mode: 'all' | 'active' | 'inactive'
  ) => {
    let filtered = [...contactsList]

    if (search) {
      const term = search.toLowerCase()
      filtered = filtered.filter(contact =>
        contact.name?.toLowerCase().includes(term) ||
        contact.username?.toLowerCase().includes(term) ||
        contact.phone?.includes(term) ||
        contact.email?.toLowerCase().includes(term)
      )
    }

    if (tags.length > 0) {
      filtered = filtered.filter(contact =>
        tags.some(tag => contact.tags.includes(tag))
      )
    }

    if (sourceFilter === 'web') {
      filtered = filtered.filter(contact => !contact.telegramId || contact.telegramId === 0)
    } else if (sourceFilter === 'telegram') {
      filtered = filtered.filter(contact => contact.telegramId && contact.telegramId > 0)
    }

    if (mode === 'active') {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      filtered = filtered.filter(contact => {
        const lastDate = contact.lastContactedDate || contact.lastOrderDate
        return lastDate && lastDate >= weekAgo
      })
    } else if (mode === 'inactive') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      filtered = filtered.filter(contact => {
        const lastDate = contact.lastContactedDate || contact.lastOrderDate
        return !lastDate || lastDate < thirtyDaysAgo
      })
    }

    setFilteredContacts(filtered)
  }

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const handleRefreshContact = async (contact: CRMContact, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      setRefreshingId(contact.id)
      await syncContact(shopId, contact.telegramId)
      await loadContacts()
    } catch (error) {
      console.error('Error refreshing contact:', error)
      alert('Failed to refresh contact data')
    } finally {
      setRefreshingId(null)
    }
  }

  const getActivityIndicator = (contact: CRMContact) => {
    const lastDate = contact.lastContactedDate || contact.lastOrderDate
    if (!lastDate) return 'bg-gray-400'

    const daysSinceActivity = Math.floor(
      (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysSinceActivity <= 7) return 'bg-green-500'
    if (daysSinceActivity <= 30) return 'bg-yellow-500'
    return 'bg-gray-400'
  }

  const formatLastActivity = (contact: CRMContact) => {
    const lastDate = contact.lastContactedDate || contact.lastOrderDate
    if (!lastDate) return 'No activity'

    const daysSince = Math.floor(
      (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysSince === 0) return 'Today'
    if (daysSince === 1) return 'Yesterday'
    if (daysSince < 7) return `${daysSince} days ago`
    if (daysSince < 30) return `${Math.floor(daysSince / 7)} weeks ago`
    return `${Math.floor(daysSince / 30)} months ago`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-telegram-button"></div>
      </div>
    )
  }

  const webCount = contacts.filter(c => !c.telegramId || c.telegramId === 0).length
  const telegramCount = contacts.filter(c => c.telegramId && c.telegramId > 0).length

  return (
    <div className="space-y-3">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="bg-telegram-secondary-bg rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-telegram-hint">Total</p>
              <p className="text-lg font-bold text-telegram-text">{contacts.length}</p>
            </div>
            <User className="h-5 w-5 text-telegram-button" />
          </div>
        </div>
        <div className="bg-telegram-secondary-bg rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-telegram-hint">Web</p>
              <p className="text-lg font-bold text-telegram-button">{webCount}</p>
            </div>
            <User className="h-5 w-5 text-telegram-button" />
          </div>
        </div>
        <div className="bg-telegram-secondary-bg rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-telegram-hint">Telegram</p>
              <p className="text-lg font-bold text-green-600">{telegramCount}</p>
            </div>
            <MessageCircle className="h-5 w-5 text-green-500" />
          </div>
        </div>
        <div className="bg-telegram-secondary-bg rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-telegram-hint">Active</p>
              <p className="text-lg font-bold text-green-600">
                {contacts.filter(c => c.activityStatus === 'active').length}
              </p>
            </div>
            <Filter className="h-5 w-5 text-green-500" />
          </div>
        </div>
      </div>

      {/* Source Tabs */}
      <div className="bg-telegram-secondary-bg rounded-lg">
        <div className="border-b border-telegram-hint/20">
          <nav className="flex space-x-4 px-3 overflow-x-auto" aria-label="Tabs">
            <button
              onClick={() => setSourceFilter('all')}
              className={`py-3 px-2 border-b-2 font-medium text-xs transition-colors whitespace-nowrap ${
                sourceFilter === 'all'
                  ? 'border-telegram-button text-telegram-button'
                  : 'border-transparent text-telegram-hint hover:text-telegram-text'
              }`}
            >
              All ({contacts.length})
            </button>
            <button
              onClick={() => setSourceFilter('web')}
              className={`py-3 px-2 border-b-2 font-medium text-xs transition-colors whitespace-nowrap ${
                sourceFilter === 'web'
                  ? 'border-telegram-button text-telegram-button'
                  : 'border-transparent text-telegram-hint hover:text-telegram-text'
              }`}
            >
              Web ({webCount})
            </button>
            <button
              onClick={() => setSourceFilter('telegram')}
              className={`py-3 px-2 border-b-2 font-medium text-xs transition-colors whitespace-nowrap ${
                sourceFilter === 'telegram'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-telegram-hint hover:text-telegram-text'
              }`}
            >
              Telegram ({telegramCount})
            </button>
          </nav>
        </div>
      </div>

      <div className="bg-telegram-secondary-bg p-3 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-telegram-hint" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, username, phone, or email..."
              className="w-full pl-10 pr-3 py-2 bg-telegram-bg border border-telegram-hint/20 rounded-lg text-telegram-text text-sm focus:ring-2 focus:ring-telegram-button focus:border-transparent"
            />
          </div>
          <div className="flex gap-1 bg-telegram-bg rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-telegram-button text-telegram-button-text'
                  : 'text-telegram-hint hover:text-telegram-text'
              }`}
              title="List View"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'table'
                  ? 'bg-telegram-button text-telegram-button-text'
                  : 'text-telegram-hint hover:text-telegram-text'
              }`}
              title="Table View"
            >
              <Grid className="h-4 w-4" />
            </button>
          </div>
        </div>

        {availableTags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-3 w-3 text-telegram-hint" />
            <span className="text-xs text-telegram-hint">Tags:</span>
            {availableTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-2 py-1 rounded-full text-xs transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-telegram-button text-telegram-button-text'
                    : 'bg-telegram-hint/10 text-telegram-text hover:bg-telegram-hint/20'
                }`}
              >
                {tag}
              </button>
            ))}
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="text-xs text-telegram-button hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      <div className="bg-telegram-secondary-bg rounded-lg overflow-hidden">
        {filteredContacts.length === 0 ? (
          <div className="text-center py-12 text-telegram-hint">
            <User className="h-12 w-12 mx-auto mb-3 text-telegram-hint" />
            <p>No contacts found</p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="divide-y divide-telegram-hint/10">
            {filteredContacts.map(contact => (
              <div
                key={contact.id}
                onClick={() => onContactSelect(contact)}
                className="p-3 hover:bg-telegram-bg cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-telegram-button rounded-full flex items-center justify-center text-telegram-button-text font-semibold text-sm">
                      {contact.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-telegram-secondary-bg ${getActivityIndicator(contact)}`}
                    ></div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-telegram-text truncate text-sm">
                        {contact.name || 'Unknown User'}
                      </h3>
                      {contact.username && (
                        <span className="text-xs text-telegram-hint">
                          @{contact.username}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-telegram-hint">
                      <span>{formatLastActivity(contact)}</span>
                      <span>{contact.totalOrders} orders</span>
                      <span>${contact.totalSpent.toFixed(2)} spent</span>
                    </div>

                    {contact.tags.length > 0 && (
                      <div className="flex items-center gap-1 mt-1.5">
                        {contact.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-telegram-button/10 text-telegram-button text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {contact.notes && (
                      <p className="text-xs text-telegram-hint mt-1 truncate">
                        {contact.notes.substring(0, 40)}
                        {contact.notes.length > 40 && '...'}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {contact.telegramId > 0 && (
                      <button
                        onClick={(e) => handleRefreshContact(contact, e)}
                        disabled={refreshingId === contact.id}
                        className="p-1.5 text-telegram-hint hover:text-telegram-button transition-colors disabled:opacity-50"
                        title="Refresh data"
                      >
                        <RefreshCw
                          className={`h-4 w-4 ${refreshingId === contact.id ? 'animate-spin' : ''}`}
                        />
                      </button>
                    )}
                    <MessageCircle className="h-4 w-4 text-telegram-hint" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-telegram-bg">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-telegram-hint uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-telegram-hint uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-telegram-hint uppercase tracking-wider">
                    Orders
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-telegram-hint uppercase tracking-wider">
                    Total Spent
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-telegram-hint uppercase tracking-wider">
                    Last Order
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-telegram-hint uppercase tracking-wider">
                    Tags
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-telegram-hint uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-telegram-secondary-bg divide-y divide-telegram-hint/10">
                {filteredContacts.map(contact => (
                  <tr key={contact.id} className="hover:bg-telegram-bg cursor-pointer" onClick={() => onContactSelect(contact)}>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-telegram-button flex items-center justify-center relative">
                            <span className="text-xs font-medium text-telegram-button-text">
                              {contact.name?.charAt(0)?.toUpperCase() || 'U'}
                            </span>
                            <div
                              className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-telegram-secondary-bg ${getActivityIndicator(contact)}`}
                            ></div>
                          </div>
                        </div>
                        <div className="ml-3">
                          <div className="text-xs font-medium text-telegram-text">{contact.name || 'Unknown'}</div>
                          {contact.username && (
                            <div className="text-xs text-telegram-hint">@{contact.username}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-xs text-telegram-text">
                        {contact.email && (
                          <div className="flex items-center">
                            <Mail className="w-3 h-3 mr-1 text-telegram-hint" />
                            {contact.email}
                          </div>
                        )}
                        {contact.phone && (
                          <div className="flex items-center mt-1">
                            <Phone className="w-3 h-3 mr-1 text-telegram-hint" />
                            {contact.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-xs font-medium text-telegram-text">{contact.totalOrders}</div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-xs font-medium text-telegram-text">${contact.totalSpent.toFixed(2)}</div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="text-xs text-telegram-text">
                        {contact.lastOrderDate ? format(contact.lastOrderDate, 'MMM dd, yyyy') : 'Never'}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {contact.tags.slice(0, 2).map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-telegram-button/10 text-telegram-button"
                          >
                            {tag}
                          </span>
                        ))}
                        {contact.tags.length > 2 && (
                          <span className="text-xs text-telegram-hint">+{contact.tags.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs font-medium">
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {contact.telegramId > 0 && (
                          <button
                            onClick={(e) => handleRefreshContact(contact, e)}
                            disabled={refreshingId === contact.id}
                            className="text-telegram-hint hover:text-telegram-button p-1 rounded disabled:opacity-50"
                            title="Refresh"
                          >
                            <RefreshCw className={`w-4 h-4 ${refreshingId === contact.id ? 'animate-spin' : ''}`} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="text-xs text-telegram-hint text-center">
        Showing {filteredContacts.length} of {contacts.length} contacts
      </div>
    </div>
  )
}

export default CRMContactBook
