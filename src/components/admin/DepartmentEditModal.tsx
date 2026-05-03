import React, { useState } from 'react'
import { Department } from '../../types'
import { X, Save, Users, MessageCircle, Settings } from 'lucide-react'
import TelegramChatInput from '../common/TelegramChatInput'

interface DepartmentEditModalProps {
  department?: Department
  userId: string
  shopId: string
  botToken?: string
  onSave: (department: any) => void
  onCancel: () => void
}

const DepartmentEditModal: React.FC<DepartmentEditModalProps> = ({ 
  department, 
  userId, 
  shopId, 
  botToken: propBotToken,
  onSave, 
  onCancel 
}) => {
  const [formData, setFormData] = useState({
    name: department?.name || '',
    telegramChatId: department?.telegramChatId || '',
    adminChatId: department?.adminChatId || '',
    role: department?.role || 'shop',
    order: department?.order || 0,
    icon: department?.icon || '👥',
    isActive: department?.isActive ?? true,
    notificationTypes: department?.notificationTypes || [],
    userId: userId,
    shopId: shopId
  })
  const [botToken, setBotToken] = useState('')

  // Load bot token from props or environment variable
  React.useEffect(() => {
    const token = propBotToken || import.meta.env.VITE_TELEGRAM_BOT_TOKEN
    if (token) {
      setBotToken(token)
    }
  }, [propBotToken])

  const roles = [
    { value: 'admin', label: 'Admin', description: 'Receives all notifications and manages operations' },
    { value: 'shop', label: 'Shop', description: 'Receives shop and order notifications' },
    { value: 'delivery', label: 'Delivery', description: 'Handles delivery and shipping notifications' }
  ]

  const notificationTypes = [
    'new_order',
    'order_confirmed',
    'order_ready',
    'order_shipped',
    'payment_received',
    'low_stock',
    'promotions',
    'order_cancelled'
  ]

  const predefinedIcons = [
    '👥', '🍳', '💰', '👨‍💼', '🚚', '📞', '📋', '⚙️',
    '🔔', '📊', '💼', '🏪', '📦', '🛒', '💳', '📱'
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (department) {
      onSave({ ...department, ...formData })
    } else {
      onSave(formData)
    }
  }

  const toggleNotificationType = (type: string) => {
    const newTypes = formData.notificationTypes.includes(type)
      ? formData.notificationTypes.filter(t => t !== type)
      : [...formData.notificationTypes, type]
    
    setFormData({ ...formData, notificationTypes: newTypes })
  }


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-telegram-bg rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-telegram-text">
            {department ? 'Edit Department' : 'Add Department'}
          </h3>
          <button onClick={onCancel} className="text-telegram-hint">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="font-medium text-telegram-text border-b pb-2">Basic Information</h4>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-telegram-text mb-1">
                  <Users className="w-4 h-4 inline mr-1" />
                  Department Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
                  required
                  placeholder="Enter department name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-telegram-text mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.order}
                  onChange={(e) => setFormData({...formData, order: parseInt(e.target.value) || 0})}
                  className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-telegram-text mb-1">
                Department Role *
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value as any})}
                className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
                required
              >
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label} - {role.description}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Telegram Configuration */}
          <div className="space-y-4">
            <h4 className="font-medium text-telegram-text border-b pb-2">
              <MessageCircle className="w-4 h-4 inline mr-1" />
              Telegram Configuration
            </h4>
            
            <div className="space-y-4">
              <TelegramChatInput
                value={formData.telegramChatId}
                onChange={(chatId) => setFormData({...formData, telegramChatId: chatId})}
                label="Primary Telegram Chat *"
                placeholder="Enter @username or chat ID"
                required
                botToken={botToken}
                showValidation={true}
              />
              <p className="text-xs text-telegram-hint -mt-2">
                The main Telegram chat/group where notifications will be sent
              </p>

              <TelegramChatInput
                value={formData.adminChatId}
                onChange={(chatId) => setFormData({...formData, adminChatId: chatId})}
                label="Admin Chat (Optional)"
                placeholder="Enter @username or chat ID"
                botToken={botToken}
                showValidation={true}
              />
              <p className="text-xs text-telegram-hint -mt-2">
                Optional admin chat for escalated notifications and management
              </p>
            </div>
          </div>

          {/* Icon Selection */}
          <div className="space-y-4">
            <h4 className="font-medium text-telegram-text border-b pb-2">Visual Settings</h4>
            
            <div>
              <label className="block text-sm font-medium text-telegram-text mb-2">
                Department Icon
              </label>
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-12 h-12 rounded-lg bg-telegram-button bg-opacity-10 flex items-center justify-center text-2xl">
                  {formData.icon}
                </div>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({...formData, icon: e.target.value})}
                  className="flex-1 p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
                  placeholder="👥"
                />
              </div>
              
              <div className="grid grid-cols-8 gap-2">
                {predefinedIcons.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setFormData({...formData, icon})}
                    className={`w-10 h-10 rounded border text-xl flex items-center justify-center ${
                      formData.icon === icon 
                        ? 'border-telegram-button bg-telegram-button bg-opacity-10' 
                        : 'border-gray-300 hover:border-telegram-button'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="space-y-4">
            <h4 className="font-medium text-telegram-text border-b pb-2">
              <Settings className="w-4 h-4 inline mr-1" />
              Notification Settings
            </h4>
            
            <div className="grid md:grid-cols-2 gap-3">
              {notificationTypes.map((type) => (
                <div key={type} className="flex items-center">
                  <input
                    type="checkbox"
                    id={type}
                    checked={formData.notificationTypes.includes(type)}
                    onChange={() => toggleNotificationType(type)}
                    className="mr-2"
                  />
                  <label htmlFor={type} className="text-sm text-telegram-text capitalize">
                    {type.replace('_', ' ')}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="space-y-4">
            <h4 className="font-medium text-telegram-text border-b pb-2">Status</h4>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                className="mr-2"
              />
              <label htmlFor="isActive" className="text-sm text-telegram-text">
                Department is active
              </label>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-4">
            <h4 className="font-medium text-telegram-text border-b pb-2">Preview</h4>
            
            <div className="bg-telegram-secondary-bg rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">{formData.icon}</div>
                <div>
                  <h4 className="font-medium text-telegram-text">
                    {formData.name || 'Department Name'}
                  </h4>
                  <p className="text-sm text-telegram-hint capitalize">{formData.role}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4 border-t">
            <button
              type="submit"
              className="flex-1 bg-telegram-button text-telegram-button-text py-3 rounded-lg flex items-center justify-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{department ? 'Update' : 'Add'} Department</span>
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border border-telegram-hint text-telegram-hint rounded-lg"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default DepartmentEditModal