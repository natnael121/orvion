import React, { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'

type NotificationType = 'success' | 'error' | 'warning' | 'info'

interface Notification {
  id: string
  type: NotificationType
  message: string
  duration?: number
}

interface NotificationContextType {
  showNotification: (type: NotificationType, message: string, duration?: number) => void
  success: (message: string, duration?: number) => void
  error: (message: string, duration?: number) => void
  warning: (message: string, duration?: number) => void
  info: (message: string, duration?: number) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export const useNotification = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
}

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const showNotification = useCallback((type: NotificationType, message: string, duration: number = 4000) => {
    const id = `${Date.now()}-${Math.random()}`
    const notification: Notification = { id, type, message, duration }

    setNotifications(prev => [...prev, notification])

    if (duration > 0) {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id))
      }, duration)
    }
  }, [])

  const success = useCallback((message: string, duration?: number) => {
    showNotification('success', message, duration)
  }, [showNotification])

  const error = useCallback((message: string, duration?: number) => {
    showNotification('error', message, duration)
  }, [showNotification])

  const warning = useCallback((message: string, duration?: number) => {
    showNotification('warning', message, duration)
  }, [showNotification])

  const info = useCallback((message: string, duration?: number) => {
    showNotification('info', message, duration)
  }, [showNotification])

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />
      case 'error':
        return <XCircle className="w-5 h-5" />
      case 'warning':
        return <AlertCircle className="w-5 h-5" />
      case 'info':
        return <Info className="w-5 h-5" />
    }
  }

  const getColorClasses = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return 'bg-green-500 text-white'
      case 'error':
        return 'bg-red-500 text-white'
      case 'warning':
        return 'bg-yellow-500 text-white'
      case 'info':
        return 'bg-blue-500 text-white'
    }
  }

  return (
    <NotificationContext.Provider value={{ showNotification, success, error, warning, info }}>
      {children}

      <div className="fixed top-4 right-4 z-[9999] space-y-2 max-w-md">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`${getColorClasses(notification.type)} rounded-lg shadow-lg p-4 flex items-start gap-3 animate-slide-in`}
          >
            {getIcon(notification.type)}
            <p className="flex-1 text-sm font-medium">{notification.message}</p>
            <button
              onClick={() => removeNotification(notification.id)}
              className="hover:opacity-80 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  )
}
