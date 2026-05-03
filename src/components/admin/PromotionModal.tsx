import React, { useState } from 'react'
import { X, Upload, Calendar, Clock, Image as ImageIcon, Trash2, Send, Eye, MessageCircle } from 'lucide-react'
import { Product, Department } from '../../types'
import { imgbbService } from '../../services/imgbb'
import { telegramService } from '../../services/telegram'
import { useTelegram } from '../../contexts/TelegramContext'
import { useNotification } from '../../contexts/NotificationContext'
import TelegramChatInput from '../common/TelegramChatInput'

interface PromotionModalProps {
  product: Product
  departments: Department[]
  botToken?: string
  onClose: () => void
  onPromote: (promotionData: {
    product: Product
    customMessage?: string
    promotionImages?: string[]
    scheduledDate?: Date
    isScheduled: boolean
    promotionTitle?: string
    discountPercentage?: number
    validUntil?: Date
    tags?: string[]
    selectedDepartments?: string[]
  }) => Promise<void>
}

export const PromotionModal: React.FC<PromotionModalProps> = ({
  product,
  departments,
  botToken: propBotToken,
  onClose,
  onPromote,
}) => {
  const { webApp } = useTelegram()
  const { success, error: showError } = useNotification()
  const [customMessage, setCustomMessage] = useState('')
  const [promotionTitle, setPromotionTitle] = useState(`🔥 Special Offer: ${product.name}`)
  const [discountPercentage, setDiscountPercentage] = useState<number>(0)
  const [validUntil, setValidUntil] = useState<string>('')
  const [tags, setTags] = useState<string[]>(['#special', '#offer'])
  const [newTag, setNewTag] = useState('')
  const [promotionImages, setPromotionImages] = useState<string[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduledDate, setScheduledDate] = useState<string>('')
  const [scheduledTime, setScheduledTime] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  // Custom chat input for additional recipients
  const [customChatId, setCustomChatId] = useState('')
  const [botToken, setBotToken] = useState('')

  // Get bot token from props or environment variable
  React.useEffect(() => {
    const token = propBotToken || import.meta.env.VITE_TELEGRAM_BOT_TOKEN
    if (token) {
      setBotToken(token)
    }
  }, [propBotToken])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingImages(true)
    setError(null)
    
    try {
      const uploadPromises = Array.from(files).map(file => 
        imgbbService.uploadImage(file, `promotion-${product.name}-${Date.now()}`)
      )
      
      const uploadedUrls = await Promise.all(uploadPromises)
      setPromotionImages(prev => [...prev, ...uploadedUrls])

      success('Images uploaded successfully!')
    } catch (error) {
      console.error('Error uploading images:', error)
      setError('Failed to upload images. Please try again.')
      showError('Failed to upload images. Please try again.')
    } finally {
      setUploadingImages(false)
    }
  }

  const removeImage = (index: number) => {
    setPromotionImages(prev => prev.filter((_, i) => i !== index))
  }

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      const formattedTag = newTag.trim().startsWith('#') ? newTag.trim() : `#${newTag.trim()}`
      setTags(prev => [...prev, formattedTag])
      setNewTag('')
    }
  }

  const removeTag = (index: number) => {
    setTags(prev => prev.filter((_, i) => i !== index))
  }

  const toggleDepartment = (departmentId: string) => {
    setSelectedDepartments(prev => 
      prev.includes(departmentId)
        ? prev.filter(id => id !== departmentId)
        : [...prev, departmentId]
    )
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      const promotionData = {
        product,
        customMessage: customMessage.trim(),
        promotionImages,
        promotionTitle: promotionTitle.trim(),
        discountPercentage: discountPercentage > 0 ? discountPercentage : undefined,
        validUntil: validUntil ? new Date(validUntil) : undefined,
        tags,
        isScheduled,
        scheduledDate: isScheduled && scheduledDate && scheduledTime
          ? new Date(`${scheduledDate}T${scheduledTime}`)
          : undefined,
        selectedDepartments
      }

      await onPromote(promotionData)

      success(
        isScheduled
          ? 'Promotion scheduled successfully!'
          : 'Promotion sent successfully!'
      )

      onClose()
    } catch (error: any) {
      console.error('Error promoting product:', error)
      const errorMessage = error.message || 'Failed to promote product. Please try again.'
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const generatePreviewMessage = () => {
    const discountText = discountPercentage > 0 ? `\n💥 <b>${discountPercentage}% OFF!</b>` : ''
    const originalPrice = discountPercentage > 0 ? `\n~~$${product.price.toFixed(2)}~~ ` : ''
    const discountedPrice = discountPercentage > 0 ? `<b>$${(product.price * (1 - discountPercentage / 100)).toFixed(2)}</b>` : `<b>$${product.price.toFixed(2)}</b>`
    const validUntilText = validUntil ? `\n⏰ <b>Valid until:</b> ${new Date(validUntil).toLocaleDateString()}` : ''
    const tagsText = tags.length > 0 ? `\n\n${tags.join(' ')}` : ''

    const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'YourBot'
    const productLink = `https://t.me/${botUsername}?startapp=${product.shopId}_product_${product.id}`

    return `
🔥 <b>${promotionTitle}</b>${discountText}

🛍️ <b>${product.name}</b>

${customMessage || product.description}

💰 <b>Price:</b> ${originalPrice}${discountedPrice}
📦 <b>Available:</b> ${product.stock} in stock
${product.sku ? `🏷️ <b>SKU:</b> ${product.sku}` : ''}${validUntilText}

🛒 <b>Order Now!</b> Don't miss this amazing deal!${tagsText}

👉 <a href="${productLink}">View Product</a>

<i>🚀 Limited time offer - Order today!</i>
    `.trim()
  }

  if (previewMode) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-telegram-bg rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="p-4 border-b border-telegram-hint/20">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-telegram-text">Promotion Preview</h2>
              <button 
                onClick={() => setPreviewMode(false)} 
                className="text-telegram-hint hover:text-telegram-text"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="p-4">
            {/* Preview Images */}
            {(promotionImages.length > 0 || product.images.length > 0) && (
              <div className="mb-4">
                <img
                  src={promotionImages[0] || product.images[0]}
                  alt={product.name}
                  className="w-full h-48 object-cover rounded-lg border border-telegram-hint/20"
                />
              </div>
            )}

            {/* Preview Message */}
            <div className="bg-telegram-secondary-bg p-4 rounded-lg border border-telegram-hint/20">
              <div 
                className="text-sm whitespace-pre-line text-telegram-text"
                dangerouslySetInnerHTML={{ 
                  __html: generatePreviewMessage()
                    .replace(/<b>/g, '<strong>')
                    .replace(/<\/b>/g, '</strong>')
                    .replace(/<i>/g, '<em>')
                    .replace(/<\/i>/g, '</em>')
                    .replace(/~~(.+?)~~/g, '<del>$1</del>')
                }}
              />
            </div>

            {/* Selected Departments */}
            {selectedDepartments.length > 0 && (
              <div className="mt-4 p-3 bg-telegram-button bg-opacity-10 border border-telegram-button/20 rounded-lg">
                <p className="text-sm text-telegram-text font-medium mb-2">
                  <MessageCircle className="w-4 h-4 inline mr-1" />
                  Will be sent to:
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedDepartments.map(deptId => {
                    const dept = departments.find(d => d.id === deptId)
                    return dept ? (
                      <span key={deptId} className="text-xs bg-telegram-button text-telegram-button-text px-2 py-1 rounded-full">
                        {dept.icon} {dept.name}
                      </span>
                    ) : null
                  })}
                </div>
              </div>
            )}

            {isScheduled && scheduledDate && scheduledTime && (
              <div className="mt-4 p-3 bg-blue-100 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Scheduled for: {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-telegram-hint/20 bg-telegram-secondary-bg">
            <div className="flex space-x-3">
              <button
                onClick={() => setPreviewMode(false)}
                className="flex-1 bg-telegram-hint text-white py-3 rounded-lg font-medium hover:opacity-80 transition-opacity"
              >
                Edit
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 bg-telegram-button text-telegram-button-text py-3 rounded-lg font-medium hover:opacity-80 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-telegram-button-text border-t-transparent rounded-full animate-spin" />
                    {isScheduled ? 'Scheduling...' : 'Promoting...'}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {isScheduled ? 'Schedule Promotion' : 'Promote Now'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-telegram-bg rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-telegram-hint/20">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-telegram-text">Promote Product</h2>
            <button 
              onClick={onClose} 
              className="text-telegram-hint hover:text-telegram-text"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-telegram-hint text-sm mt-1">Create an engaging promotion for {product.name}</p>
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Product Info */}
          <div className="bg-telegram-secondary-bg p-3 rounded-lg">
            <div className="flex items-center space-x-3">
              {product.images && product.images.length > 0 ? (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-12 h-12 object-cover rounded-lg"
                />
              ) : (
                <div className="w-12 h-12 bg-telegram-hint/20 rounded-lg flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-telegram-hint" />
                </div>
              )}
              <div>
                <h3 className="font-medium text-telegram-text">{product.name}</h3>
                <p className="text-sm text-telegram-hint">${product.price.toFixed(2)} • {product.stock} in stock</p>
                <p className="text-xs text-telegram-hint">{product.category}</p>
              </div>
            </div>
          </div>

          {/* Promotion Title */}
          <div>
            <label className="block text-sm font-medium text-telegram-text mb-1">
              Promotion Title *
            </label>
            <input
              type="text"
              value={promotionTitle}
              onChange={(e) => setPromotionTitle(e.target.value)}
              className="w-full px-3 py-2 border border-telegram-hint/30 rounded-lg bg-telegram-secondary-bg text-telegram-text focus:border-telegram-button focus:outline-none"
              placeholder="🔥 Special Offer: Amazing Product"
            />
          </div>

          {/* Discount */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-telegram-text mb-1">
                Discount Percentage (Optional)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={discountPercentage}
                onChange={(e) => setDiscountPercentage(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-telegram-hint/30 rounded-lg bg-telegram-secondary-bg text-telegram-text focus:border-telegram-button focus:outline-none"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-telegram-text mb-1">
                Valid Until (Optional)
              </label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full px-3 py-2 border border-telegram-hint/30 rounded-lg bg-telegram-secondary-bg text-telegram-text focus:border-telegram-button focus:outline-none"
              />
            </div>
          </div>

          {/* Custom Message */}
          <div>
            <label className="block text-sm font-medium text-telegram-text mb-1">
              Custom Message (Optional)
            </label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-telegram-hint/30 rounded-lg bg-telegram-secondary-bg text-telegram-text focus:border-telegram-button focus:outline-none"
              placeholder="Add a custom message to make your promotion more engaging..."
            />
            <p className="text-xs text-telegram-hint mt-1">
              Leave empty to use the product description
            </p>
          </div>

          {/* Promotion Images */}
          <div>
            <label className="block text-sm font-medium text-telegram-text mb-2">
              Promotion Images (Optional)
            </label>
            
            <div className="border-2 border-dashed border-telegram-hint/30 rounded-lg p-4 text-center hover:border-telegram-button/50 transition-colors">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="promotion-image-upload"
                disabled={uploadingImages}
              />
              <label
                htmlFor="promotion-image-upload"
                className="cursor-pointer flex flex-col items-center space-y-2"
              >
                {uploadingImages ? (
                  <div className="w-6 h-6 border-2 border-telegram-button border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Upload className="h-6 w-6 text-telegram-hint" />
                )}
                <span className="text-sm text-telegram-text">
                  {uploadingImages ? 'Uploading images...' : 'Click to upload promotion images'}
                </span>
                <span className="text-xs text-telegram-hint">PNG, JPG, GIF up to 32MB each</span>
              </label>
            </div>

            {promotionImages.length > 0 && (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                {promotionImages.map((imageUrl, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={imageUrl}
                      alt={`Promotion ${index + 1}`}
                      className="w-full h-20 object-cover rounded-lg border border-telegram-hint/20"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-telegram-hint mt-2">
              If no promotion images are uploaded, the product's main image will be used
            </p>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-telegram-text mb-2">
              Hashtags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 bg-telegram-button bg-opacity-10 text-telegram-button rounded-full text-sm"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(index)}
                    className="ml-1 text-telegram-button hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTag()}
                className="flex-1 px-3 py-2 border border-telegram-hint/30 rounded-lg bg-telegram-secondary-bg text-telegram-text focus:border-telegram-button focus:outline-none"
                placeholder="Add hashtag (e.g., special, offer)"
              />
              <button
                onClick={addTag}
                className="px-3 py-2 bg-telegram-button text-telegram-button-text rounded-lg hover:opacity-80 transition-opacity"
              >
                Add
              </button>
            </div>
          </div>

          {/* Department Selection */}
          {departments.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-telegram-text mb-2">
                <MessageCircle className="w-4 h-4 inline mr-1" />
                Send to Departments (Optional)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {departments.filter(dept => dept.isActive).map((department) => (
                  <div key={department.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`dept-${department.id}`}
                      checked={selectedDepartments.includes(department.id)}
                      onChange={() => toggleDepartment(department.id)}
                      className="rounded border-telegram-hint/30"
                    />
                    <label htmlFor={`dept-${department.id}`} className="text-sm text-telegram-text flex items-center space-x-1">
                      <span>{department.icon}</span>
                      <span>{department.name}</span>
                    </label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-telegram-hint mt-1">
                Select departments to send the promotion to their Telegram chats
              </p>
            </div>
          )}

          {/* Custom Chat Input */}
          <div>
            <label className="block text-sm font-medium text-telegram-text mb-2">
              <MessageCircle className="w-4 h-4 inline mr-1" />
              Additional Recipient (Optional)
            </label>
            <TelegramChatInput
              value={customChatId}
              onChange={setCustomChatId}
              placeholder="Enter @username or chat ID for additional recipient"
              botToken={botToken}
              showValidation={true}
            />
            <p className="text-xs text-telegram-hint mt-1">
              Send promotion to an additional chat besides selected departments
            </p>
          </div>

          {/* Schedule Options */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <input
                type="checkbox"
                id="schedule-promotion"
                checked={isScheduled}
                onChange={(e) => setIsScheduled(e.target.checked)}
                className="rounded border-telegram-hint/30"
              />
              <label htmlFor="schedule-promotion" className="text-sm font-medium text-telegram-text">
                Schedule promotion for later
              </label>
            </div>

            {isScheduled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-telegram-button bg-opacity-10 rounded-lg border border-telegram-button/20">
                <div>
                  <label className="block text-sm font-medium text-telegram-text mb-1">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Date
                  </label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-telegram-button/30 rounded-lg bg-telegram-bg text-telegram-text focus:border-telegram-button focus:outline-none"
                    required={isScheduled}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-telegram-text mb-1">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Time
                  </label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-3 py-2 border border-telegram-button/30 rounded-lg bg-telegram-bg text-telegram-text focus:border-telegram-button focus:outline-none"
                    required={isScheduled}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-telegram-hint/20 bg-telegram-secondary-bg">
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 bg-telegram-hint text-white py-3 rounded-lg font-medium hover:opacity-80 transition-opacity"
            >
              Cancel
            </button>
            <button
              onClick={() => setPreviewMode(true)}
              className="flex-1 bg-telegram-button text-telegram-button-text py-3 rounded-lg font-medium hover:opacity-80 transition-opacity flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}