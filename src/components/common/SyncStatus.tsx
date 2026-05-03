import React, { useState, useEffect } from 'react'
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { cacheSyncService } from '../../services/cacheSync'

const SyncStatus: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState({
    pendingSync: 0,
    lastSyncTime: 0,
    isOnline: true
  })
  const [isVisible, setIsVisible] = useState(false)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    const updateStatus = async () => {
      const status = await cacheSyncService.getSyncStatus()
      setSyncStatus(status)
      
      // Show status if offline or has pending syncs
      setIsVisible(!status.isOnline || status.pendingSync > 0)
    }

    updateStatus()
    const interval = setInterval(updateStatus, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [])

  const handleForceSync = async () => {
    setSyncing(true)
    try {
      await cacheSyncService.forcSync()
      const status = await cacheSyncService.getSyncStatus()
      setSyncStatus(status)
    } catch (error) {
      console.error('Force sync failed:', error)
    } finally {
      setSyncing(false)
    }
  }

  if (!isVisible) return null

  const getStatusIcon = () => {
    if (syncing) return <RefreshCw className="w-4 h-4 animate-spin" />
    if (!syncStatus.isOnline) return <WifiOff className="w-4 h-4" />
    if (syncStatus.pendingSync > 0) return <Clock className="w-4 h-4" />
    return <CheckCircle className="w-4 h-4" />
  }

  const getStatusText = () => {
    if (syncing) return 'Syncing...'
    if (!syncStatus.isOnline) return 'Offline'
    if (syncStatus.pendingSync > 0) return `${syncStatus.pendingSync} pending`
    return 'Synced'
  }

  const getStatusColor = () => {
    if (syncing) return 'text-blue-600 bg-blue-100'
    if (!syncStatus.isOnline) return 'text-red-600 bg-red-100'
    if (syncStatus.pendingSync > 0) return 'text-yellow-600 bg-yellow-100'
    return 'text-green-600 bg-green-100'
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div 
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg border shadow-sm ${getStatusColor()}`}
      >
        {getStatusIcon()}
        <span className="text-sm font-medium">{getStatusText()}</span>
        
        {syncStatus.isOnline && syncStatus.pendingSync > 0 && (
          <button
            onClick={handleForceSync}
            disabled={syncing}
            className="ml-2 p-1 rounded hover:bg-black hover:bg-opacity-10 disabled:opacity-50"
            title="Force sync now"
          >
            <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
    </div>
  )
}

export default SyncStatus