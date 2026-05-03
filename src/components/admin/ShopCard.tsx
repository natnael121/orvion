import React, { useState } from 'react'
import { Shop } from '../../types'
import { Store, Package, ShoppingCart, DollarSign, Users, FileEdit as Edit, BarChart3, Star, Clock, MapPin, Phone, Share2, Copy, ExternalLink, Link } from 'lucide-react'
import ShopLinkManager from './ShopLinkManager'
 
interface ShopCardProps {
  shop: Shop
  onEdit: (shop: Shop) => void
  onSelect: (shop: Shop) => void
}

const ShopCard: React.FC<ShopCardProps> = ({ shop, onEdit, onSelect }) => {
  const [showLinkManager, setShowLinkManager] = useState(false)

  // Helper function to get currency
  const getCurrency = () => {
    return shop.settings?.currency || 'USD'
  }

  const formatCurrency = (amount: number) => {
    const currency = getCurrency()
    const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'ETB' ? 'Br' : '$'
    return `${symbol}${amount.toFixed(0)}`
  }

  // Helper to get business hours from either structure
  const getBusinessHours = () => {
    if (shop.settings?.businessHours) {
      return shop.settings.businessHours
    }
    // Return default business hours if none exist
    return {
      open: "09:00",
      close: "18:00",
      days: ["monday", "tuesday", "wednesday", "thursday", "friday"]
    }
  }

  const getOperatingStatus = () => {
    const businessHours = getBusinessHours()
    
    const now = new Date()
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'lowercase' })
    const currentTime = now.toTimeString().slice(0, 5)
    
    const { open, close, days } = businessHours
    
    if (!days?.includes(currentDay)) return 'Closed'
    if (currentTime >= open && currentTime <= close) return 'Open'
    return 'Closed'
  }

  // Helper to get description
  const getDescription = () => {
    return shop.description || shop.businessInfo?.description || "No description"
  }

  // Helper to get name
  const getName = () => {
    return shop.name || "Untitled Shop"
  }

  // Helper to get logo
  const getLogo = () => {
    return shop.logo || ""
  }

  // Helper to get business info
  const getBusinessInfo = () => {
    return shop.businessInfo || {}
  }

  // Helper to get stats
  const getStats = () => {
    return shop.stats || {
      totalCustomers: 0,
      totalOrders: 0,
      totalProducts: 0,
      totalRevenue: 0
    }
  }

  // Helper to get settings
  const getSettings = () => {
    return shop.settings || {}
  }

  const operatingStatus = getOperatingStatus()
  const businessHours = getBusinessHours()
  const description = getDescription()
  const name = getName()
  const logo = getLogo()
  const businessInfo = getBusinessInfo()
  const stats = getStats()
  const settings = getSettings()

  const shareShop = (e: React.MouseEvent) => {
    e.stopPropagation()
    const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'YourBot'
    const shareUrl = `https://t.me/${botUsername}?start=${shop.id}`
    const shareText = `Check out ${name}! 🛍️\n\n${description}\n\n${shareUrl}`
    
    // Try Telegram WebApp share first
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`)
    } else if (navigator.share) {
      navigator.share({
        title: name,
        text: shareText,
        url: shareUrl
      }).catch(() => {
        // Fallback to clipboard
        copyToClipboard(shareText)
      })
    } else {
      copyToClipboard(shareText)
    }
  }

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        if (window.Telegram?.WebApp?.showAlert) {
          window.Telegram.WebApp.showAlert('Shop link copied to clipboard!')
        } else {
          alert('Shop link copied to clipboard!')
        }
      }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = text
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        
        if (window.Telegram?.WebApp?.showAlert) {
          window.Telegram.WebApp.showAlert('Shop link copied to clipboard!')
        } else {
          alert('Shop link copied to clipboard!')
        }
      })
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      
      if (window.Telegram?.WebApp?.showAlert) {
        window.Telegram.WebApp.showAlert('Shop link copied to clipboard!')
      } else {
        alert('Shop link copied to clipboard!')
      }
    }
  }

  const openShopLink = (e: React.MouseEvent) => {
    e.stopPropagation()
    const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'YourBot'
    const shopUrl = `https://t.me/${botUsername}?start=${shop.id}`
    
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(shopUrl)
    } else {
      window.open(shopUrl, '_blank')
    }
  }

  return (
    <div className="bg-telegram-secondary-bg rounded-xl p-4 border border-telegram-hint/10 hover:border-telegram-button/30 transition-all duration-200">
      {/* Header Section */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3 flex-1">
          {logo ? (
            <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-telegram-hint/20">
              <img 
                src={logo} 
                alt={name} 
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-14 h-14 bg-telegram-button/10 rounded-xl flex items-center justify-center">
              <Store className="w-7 h-7 text-telegram-button" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="font-bold text-telegram-text text-base truncate">
                {name}
              </h3>
              {shop.isActive && (
                <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                  operatingStatus === 'Open' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    operatingStatus === 'Open' ? 'bg-green-500' : 'bg-orange-500'
                  }`} />
                  <span>{operatingStatus}</span>
                </div>
              )}
            </div>
            
            <p className="text-sm text-telegram-hint line-clamp-2 mb-2">
              {description}
            </p>
            
            {/* Business Info */}
            {businessInfo && (businessInfo.address || businessInfo.phone) && (
              <div className="flex items-center space-x-3 text-xs text-telegram-hint">
                {businessInfo.address && (
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate max-w-24">{businessInfo.address}</span>
                  </div>
                )}
                {businessInfo.phone && (
                  <div className="flex items-center space-x-1">
                    <Phone className="w-3 h-3" />
                    <span>{businessInfo.phone}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-col space-y-1 ml-2">
          <button
            onClick={openShopLink}
            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors"
            title="Open Shop Link"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowLinkManager(true)}
            className="p-2 text-telegram-button hover:text-telegram-button/80 hover:bg-telegram-button/10 rounded-lg transition-colors"
            title="Manage Shop Links"
          >
            <Link className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex space-x-1 ml-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit(shop)
            }}
            className="p-2 text-telegram-hint hover:text-telegram-button hover:bg-telegram-button/10 rounded-lg transition-colors"
            title="Edit Shop"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onSelect(shop)
            }}
            className="p-2 text-telegram-button hover:bg-telegram-button hover:text-telegram-button-text rounded-lg transition-colors"
            title="Manage Shop"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-4 gap-3 mb-3">
        <div className="text-center">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg mb-1 mx-auto">
            <Package className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-sm font-bold text-telegram-text">
            {stats.totalProducts || 0}
          </div>
          <div className="text-xs text-telegram-hint">Products</div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-lg mb-1 mx-auto">
            <ShoppingCart className="w-4 h-4 text-green-600" />
          </div>
          <div className="text-sm font-bold text-telegram-text">
            {stats.totalOrders || 0}
          </div>
          <div className="text-xs text-telegram-hint">Orders</div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center w-8 h-8 bg-yellow-100 rounded-lg mb-1 mx-auto">
            <DollarSign className="w-4 h-4 text-yellow-600" />
          </div>
          <div className="text-sm font-bold text-telegram-text">
            {formatCurrency(stats.totalRevenue || 0)}
          </div>
          <div className="text-xs text-telegram-hint">Revenue</div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-lg mb-1 mx-auto">
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-sm font-bold text-telegram-text">
            {stats.totalCustomers || 0}
          </div>
          <div className="text-xs text-telegram-hint">Customers</div>
        </div>
      </div>

      {/* Footer Section */}
      <div className="flex items-center justify-between pt-3 border-t border-telegram-hint/10">
        <div className="flex items-center space-x-3">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            shop.isActive 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            {shop.isActive ? 'Active' : 'Inactive'}
          </span>
          
          {businessHours && (
            <div className="flex items-center space-x-1 text-xs text-telegram-hint">
              <Clock className="w-3 h-3" />
              <span>
                {businessHours.open} - {businessHours.close}
              </span>
            </div>
          )}
          
          {/* Shop Link Display */}
          <div className="flex items-center space-x-1 text-xs text-telegram-hint">
            <Link className="w-3 h-3" />
            <span className="font-mono">
              t.me/{import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'bot'}?start={shop.id}
            </span>
          </div>
        </div>
        
        <button
          onClick={() => onSelect(shop)}
          className="bg-telegram-button text-telegram-button-text px-3 py-1.5 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
        >
          Manage
        </button>
      </div>

      {/* Shop Link Manager Modal */}
      {showLinkManager && (
        <ShopLinkManager
          shop={shop}
          onClose={() => setShowLinkManager(false)}
        />
      )}
    </div>
  )
}

export default ShopCard
