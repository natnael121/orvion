import React, { useState } from 'react'
import { Shop } from '../../types'
import { 
  Link, 
  Copy, 
  QrCode, 
  Share2, 
  ExternalLink, 
  MessageCircle, 
  Download,
  Eye,
  X
} from 'lucide-react'
import { shopLinkUtils } from '../../utils/shopLinks'

interface ShopLinkManagerProps {
  shop: Shop
  onClose: () => void
}

const ShopLinkManager: React.FC<ShopLinkManagerProps> = ({ shop, onClose }) => {
  const [activeTab, setActiveTab] = useState<'link' | 'qr' | 'share'>('link')
  const [customMessage, setCustomMessage] = useState('')
  const [includeDescription, setIncludeDescription] = useState(true)

  const shopLink = shopLinkUtils.generateShopLink(shop.id)
  const qrCodeUrl = shopLinkUtils.generateQRCodeUrl(shop.id)
  const shareMessage = shopLinkUtils.generateShareMessage(shop, {
    includeDescription,
    customMessage: customMessage.trim()
  })

  const handleCopyLink = async () => {
    try {
      await shopLinkUtils.copyShopLinkToClipboard(shop.id, shop.name)
    } catch (error) {
      console.error('Error copying link:', error)
    }
  }

  const handleCopyShareMessage = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareMessage)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = shareMessage
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      
      if (window.Telegram?.WebApp?.showAlert) {
        window.Telegram.WebApp.showAlert('Share message copied to clipboard!')
      } else {
        alert('Share message copied to clipboard!')
      }
    } catch (error) {
      console.error('Error copying share message:', error)
    }
  }

  const handleShareViatelegram = () => {
    const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(shopLink)}&text=${encodeURIComponent(shareMessage)}`
    
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(telegramShareUrl)
    } else {
      window.open(telegramShareUrl, '_blank')
    }
  }

  const downloadQRCode = () => {
    const link = document.createElement('a')
    link.href = qrCodeUrl
    link.download = `${shop.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_qr_code.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-telegram-bg rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-telegram-hint/20">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-telegram-text">Shop Link Manager</h2>
            <button 
              onClick={onClose} 
              className="text-telegram-hint hover:text-telegram-text"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-sm text-telegram-hint mt-1">
            Manage and share your shop's Mini App link
          </p>
        </div>

        {/* Shop Info */}
        <div className="p-4 bg-telegram-secondary-bg border-b border-telegram-hint/20">
          <div className="flex items-center space-x-3">
            {shop.logo ? (
              <img src={shop.logo} alt={shop.name} className="w-12 h-12 rounded-lg object-cover" />
            ) : (
              <div className="w-12 h-12 bg-telegram-button/10 rounded-lg flex items-center justify-center">
                <Link className="w-6 h-6 text-telegram-button" />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-telegram-text">{shop.name}</h3>
              <p className="text-sm text-telegram-hint">{shop.description}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-telegram-secondary-bg border-b border-telegram-hint/20">
          {[
            { id: 'link', label: 'Direct Link', icon: Link },
            { id: 'qr', label: 'QR Code', icon: QrCode },
            { id: 'share', label: 'Share Message', icon: Share2 }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3 px-4 flex items-center justify-center space-x-2 transition-colors ${
                activeTab === tab.id
                  ? 'text-telegram-button border-b-2 border-telegram-button'
                  : 'text-telegram-hint hover:text-telegram-text'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="p-4">
          {/* Direct Link Tab */}
          {activeTab === 'link' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-telegram-text mb-2">
                  Shop Mini App Link
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={shopLink}
                    readOnly
                    className="flex-1 px-3 py-2 bg-telegram-secondary-bg border border-telegram-hint/30 rounded-lg text-telegram-text font-mono text-sm"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="p-2 bg-telegram-button text-telegram-button-text rounded-lg hover:opacity-80"
                    title="Copy Link"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => window.open(shopLink, '_blank')}
                    className="p-2 bg-telegram-hint text-white rounded-lg hover:opacity-80"
                    title="Open Link"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="bg-telegram-button/10 border border-telegram-button/20 rounded-lg p-4">
                <h4 className="font-medium text-telegram-text mb-2">How to use this link:</h4>
                <ul className="text-sm text-telegram-hint space-y-1 list-disc list-inside">
                  <li>Share this link with customers to give them direct access to your shop</li>
                  <li>When customers click the link, they'll open the Mini App directly to your shop's catalog</li>
                  <li>The link works in any Telegram chat, group, or channel</li>
                  <li>You can also use this link in your bio, website, or other marketing materials</li>
                </ul>
              </div>
            </div>
          )}

          {/* QR Code Tab */}
          {activeTab === 'qr' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="inline-block p-4 bg-white rounded-lg border border-telegram-hint/20">
                  <img
                    src={qrCodeUrl}
                    alt={`QR Code for ${shop.name}`}
                    className="w-48 h-48 mx-auto"
                  />
                </div>
                <p className="text-sm text-telegram-hint mt-2">
                  Customers can scan this QR code to access your shop
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={downloadQRCode}
                  className="flex-1 bg-telegram-button text-telegram-button-text py-3 rounded-lg flex items-center justify-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download QR Code</span>
                </button>
                <button
                  onClick={handleCopyLink}
                  className="flex-1 bg-telegram-hint text-white py-3 rounded-lg flex items-center justify-center space-x-2"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy Link</span>
                </button>
              </div>

              <div className="bg-telegram-button/10 border border-telegram-button/20 rounded-lg p-4">
                <h4 className="font-medium text-telegram-text mb-2">QR Code Usage:</h4>
                <ul className="text-sm text-telegram-hint space-y-1 list-disc list-inside">
                  <li>Print the QR code on business cards, flyers, or storefront</li>
                  <li>Add it to your website or social media profiles</li>
                  <li>Include it in email signatures or marketing materials</li>
                  <li>Customers can scan with any QR code reader or Telegram camera</li>
                </ul>
              </div>
            </div>
          )}

          {/* Share Message Tab */}
          {activeTab === 'share' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-telegram-text mb-2">
                  Customize Share Message
                </label>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="includeDescription"
                      checked={includeDescription}
                      onChange={(e) => setIncludeDescription(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="includeDescription" className="text-sm text-telegram-text">
                      Include shop description
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-telegram-text mb-1">
                      Custom Message (Optional)
                    </label>
                    <textarea
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      className="w-full px-3 py-2 border border-telegram-hint/30 rounded-lg bg-telegram-secondary-bg text-telegram-text"
                      rows={3}
                      placeholder="Add a custom message to make your share more engaging..."
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-telegram-text mb-2">
                  Preview Message
                </label>
                <div className="bg-telegram-secondary-bg border border-telegram-hint/20 rounded-lg p-4">
                  <pre className="text-sm text-telegram-text whitespace-pre-wrap font-sans">
                    {shareMessage}
                  </pre>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleCopyShareMessage}
                  className="flex-1 bg-telegram-button text-telegram-button-text py-3 rounded-lg flex items-center justify-center space-x-2"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy Message</span>
                </button>
                <button
                  onClick={handleShareViaTelegram}
                  className="flex-1 bg-telegram-hint text-white py-3 rounded-lg flex items-center justify-center space-x-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Share via Telegram</span>
                </button>
              </div>

              <div className="bg-telegram-button/10 border border-telegram-button/20 rounded-lg p-4">
                <h4 className="font-medium text-telegram-text mb-2">Share Tips:</h4>
                <ul className="text-sm text-telegram-hint space-y-1 list-disc list-inside">
                  <li>Share in your Telegram groups or channels</li>
                  <li>Post on social media platforms</li>
                  <li>Send to individual customers via direct message</li>
                  <li>Include in email newsletters or marketing campaigns</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ShopLinkManager