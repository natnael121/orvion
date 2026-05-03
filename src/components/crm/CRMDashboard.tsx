import React, { useState, useEffect } from 'react'
import { Users, Activity, Clock, Tag, RefreshCw, MessageCircle, Mail, DollarSign, ShoppingBag } from 'lucide-react'
import { getContactStats, getContactsByShop } from '../../services/crmService'
import { syncAllContacts, getLastSyncTimestamp, updateSyncTimestamp } from '../../services/crmSyncService'
import { CRMStats, CRMContact } from '../../types'

interface CRMDashboardProps {
  shopId: string
  onFilterChange?: (filter: 'all' | 'active' | 'inactive') => void
}

const CRMDashboard: React.FC<CRMDashboardProps> = ({ shopId, onFilterChange }) => {
  const [stats, setStats] = useState<CRMStats>({
    totalCustomers: 0,
    activeThisWeek: 0,
    inactive30Plus: 0,
    topTags: []
  })
  const [contacts, setContacts] = useState<CRMContact[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  const loadStats = async () => {
    try {
      setLoading(true)
      const data = await getContactStats(shopId)
      setStats(data)

      const contactsData = await getContactsByShop(shopId)
      setContacts(contactsData)

      const lastSyncTime = await getLastSyncTimestamp(shopId)
      setLastSync(lastSyncTime)
    } catch (error) {
      console.error('Error loading CRM stats:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (shopId) {
      loadStats()
    }
  }, [shopId])

  const handleSyncAll = async () => {
    try {
      setSyncing(true)
      const result = await syncAllContacts(shopId)

      if (result.success) {
        await updateSyncTimestamp(shopId)
        await loadStats()
        alert(`Successfully synced ${result.contactsProcessed} contacts!`)
      } else {
        alert(`Sync completed with errors. Processed: ${result.contactsProcessed}. Errors: ${result.errors.length}`)
      }
    } catch (error) {
      console.error('Error syncing contacts:', error)
      alert('Failed to sync contacts. Please try again.')
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-telegram-button"></div>
      </div>
    )
  }

  const webCustomers = contacts.filter(c => !c.telegramId || c.telegramId === 0).length
  const telegramCustomers = contacts.filter(c => c.telegramId && c.telegramId > 0).length
  const totalRevenue = contacts.reduce((sum, c) => sum + c.totalSpent, 0)
  const totalOrders = contacts.reduce((sum, c) => sum + c.totalOrders, 0)
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold text-telegram-text">CRM Dashboard</h3>
        <div className="flex items-center gap-2">
          {lastSync && (
            <span className="text-xs text-telegram-hint">
              Last sync: {lastSync.toLocaleString()}
            </span>
          )}
          <button
            onClick={handleSyncAll}
            disabled={syncing}
            className="flex items-center gap-1 px-3 py-2 bg-telegram-button text-telegram-button-text rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`h-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync All'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div
          onClick={() => onFilterChange?.('all')}
          className="bg-telegram-secondary-bg p-3 rounded-lg cursor-pointer hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-telegram-button/10 rounded-lg">
              <Users className="h-4 w-4 text-telegram-button" />
            </div>
            <span className="text-xl font-bold text-telegram-text">
              {stats.totalCustomers}
            </span>
          </div>
          <h3 className="text-xs font-medium text-telegram-text">Total Customers</h3>
          <p className="text-xs text-telegram-hint mt-0.5">All contacts</p>
        </div>

        <div className="bg-telegram-secondary-bg p-3 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-telegram-button/10 rounded-lg">
              <Mail className="h-4 w-4 text-telegram-button" />
            </div>
            <span className="text-xl font-bold text-telegram-button">
              {webCustomers}
            </span>
          </div>
          <h3 className="text-xs font-medium text-telegram-text">Web Customers</h3>
          <p className="text-xs text-telegram-hint mt-0.5">Email/phone</p>
        </div>

        <div className="bg-telegram-secondary-bg p-3 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <MessageCircle className="h-4 w-4 text-green-600" />
            </div>
            <span className="text-xl font-bold text-green-600">
              {telegramCustomers}
            </span>
          </div>
          <h3 className="text-xs font-medium text-telegram-text">Telegram</h3>
          <p className="text-xs text-telegram-hint mt-0.5">Via bot</p>
        </div>

        <div className="bg-telegram-secondary-bg p-3 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-telegram-button/10 rounded-lg">
              <DollarSign className="h-4 w-4 text-telegram-button" />
            </div>
            <span className="text-xl font-bold text-telegram-text">
              ${totalRevenue.toFixed(0)}
            </span>
          </div>
          <h3 className="text-xs font-medium text-telegram-text">Total Revenue</h3>
          <p className="text-xs text-telegram-hint mt-0.5">All time</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div
          onClick={() => onFilterChange?.('active')}
          className="bg-telegram-secondary-bg p-3 rounded-lg cursor-pointer hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <Activity className="h-4 w-4 text-green-600" />
            </div>
            <span className="text-xl font-bold text-green-600">
              {stats.activeThisWeek}
            </span>
          </div>
          <h3 className="text-xs font-medium text-telegram-text">Active This Week</h3>
          <p className="text-xs text-telegram-hint mt-0.5">
            Last 7 days
          </p>
        </div>

        <div
          onClick={() => onFilterChange?.('inactive')}
          className="bg-telegram-secondary-bg p-3 rounded-lg cursor-pointer hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="h-4 w-4 text-orange-600" />
            </div>
            <span className="text-xl font-bold text-orange-600">
              {stats.inactive30Plus}
            </span>
          </div>
          <h3 className="text-xs font-medium text-telegram-text">Inactive 30+ Days</h3>
          <p className="text-xs text-telegram-hint mt-0.5">
            Need re-engagement
          </p>
        </div>

        <div className="bg-telegram-secondary-bg p-3 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-telegram-button/10 rounded-lg">
              <ShoppingBag className="h-4 w-4 text-telegram-button" />
            </div>
            <span className="text-xl font-bold text-telegram-text">
              ${avgOrderValue.toFixed(2)}
            </span>
          </div>
          <h3 className="text-xs font-medium text-telegram-text">Avg Order Value</h3>
          <p className="text-xs text-telegram-hint mt-0.5">
            Per order
          </p>
        </div>
      </div>

      {stats.topTags.length > 0 && (
        <div className="bg-telegram-secondary-bg p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="h-4 w-4 text-telegram-hint" />
            <h3 className="text-base font-semibold text-telegram-text">Top Tags</h3>
          </div>
          <div className="space-y-2">
            {stats.topTags.map((tagData, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm font-medium text-telegram-text">
                  {tagData.tag}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-telegram-hint/20 rounded-full h-2">
                    <div
                      className="bg-telegram-button h-2 rounded-full transition-all"
                      style={{
                        width: `${(tagData.count / stats.totalCustomers) * 100}%`
                      }}
                    ></div>
                  </div>
                  <span className="text-sm text-telegram-hint w-12 text-right">
                    {tagData.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default CRMDashboard
