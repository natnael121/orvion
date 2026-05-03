import React, { useState } from 'react'
import { Shop } from '../../types'
import { X, Save, Store, FileText, Image } from 'lucide-react'
import ImageUpload from '../common/ImageUpload'

interface ShopEditModalProps {
  shop: Shop
  onSave: (shop: Shop) => void
  onCancel: () => void
}

const ShopEditModal: React.FC<ShopEditModalProps> = ({ shop, onSave, onCancel }) => {
  const [formData, setFormData] = useState(shop)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-telegram-bg rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-telegram-text">Edit Shop</h3>
          <button onClick={onCancel} className="text-telegram-hint">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-telegram-text mb-1">
                  <Store className="w-4 h-4 inline mr-1" />
                  Shop Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-telegram-text mb-1">
                  Slug
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({...formData, slug: e.target.value})}
                  className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-telegram-text mb-1">
                <FileText className="w-4 h-4 inline mr-1" />
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-telegram-text mb-1">
                <Image className="w-4 h-4 inline mr-1" />
                Shop Logo
              </label>
              <ImageUpload
                value={formData.logo || ''}
                onChange={(url) => setFormData({...formData, logo: url})}
                placeholder="Upload shop logo"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                className="mr-2"
              />
              <label htmlFor="isActive" className="text-sm text-telegram-text">
                Shop is active
              </label>
            </div>
          </div>

          <div className="flex space-x-3 pt-4 border-t">
            <button
              type="submit"
              className="flex-1 bg-telegram-button text-telegram-button-text py-3 rounded-lg flex items-center justify-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
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

export default ShopEditModal