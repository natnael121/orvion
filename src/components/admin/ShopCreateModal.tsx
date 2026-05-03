import React, { useState } from 'react'
import { X, Save, Store, FileText, Image } from 'lucide-react'
import ImageUpload from '../common/ImageUpload'

interface ShopCreateModalProps {
  userId: string
  onSave: (shop: any) => void
  onCancel: () => void
}

const ShopCreateModal: React.FC<ShopCreateModalProps> = ({ userId, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    logo: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const slug = formData.slug || formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    if (!formData.name.trim()) {
      alert('Shop name is required')
      return
    }

    if (!formData.description.trim()) {
      alert('Shop description is required')
      return
    }

    const shopData = {
      name: formData.name.trim(),
      slug,
      description: formData.description.trim(),
      logo: formData.logo || '',
      ownerId: userId,
      isActive: true,
      businessInfo: {
        name: '',
        description: '',
        address: '',
        phone: '',
        email: '',
        website: ''
      },
      settings: {
        currency: 'USD',
        taxRate: 0,
        businessHours: {
          open: '09:00',
          close: '18:00',
          days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
        },
        orderSettings: {
          autoConfirm: false,
          requirePayment: false,
          allowCancellation: true
        }
      },
      stats: {
        totalProducts: 0,
        totalOrders: 0,
        totalRevenue: 0,
        totalCustomers: 0
      }
    }

    console.log('Creating shop with data:', shopData)

    onSave(shopData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-telegram-bg rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-telegram-text">Create New Shop</h3>
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
                  Shop Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text focus:border-telegram-button focus:outline-none"
                  required
                  placeholder="Enter shop name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-telegram-text mb-1">
                  Shop URL Slug
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({...formData, slug: e.target.value})}
                  className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text focus:border-telegram-button focus:outline-none"
                  placeholder="my-shop (auto-generated if empty)"
                />
                <p className="text-xs text-telegram-hint mt-1">
                  Used in URLs. Leave empty to auto-generate from shop name.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-telegram-text mb-1">
                <FileText className="w-4 h-4 inline mr-1" />
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text focus:border-telegram-button focus:outline-none"
                rows={3}
                required
                placeholder="Describe your shop..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-telegram-text mb-1">
                <Image className="w-4 h-4 inline mr-1" />
                Shop Logo
              </label>
              <ImageUpload
                value={formData.logo}
                onChange={(url) => setFormData({...formData, logo: url})}
                placeholder="Upload shop logo"
              />
            </div>
          </div>

          <div className="flex space-x-3 pt-4 border-t">
            <button
              type="submit"
              className="flex-1 bg-telegram-button text-telegram-button-text py-3 rounded-lg flex items-center justify-center space-x-2 font-medium"
            >
              <Save className="w-4 h-4" />
              <span>Create Shop</span>
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border border-telegram-hint text-telegram-hint rounded-lg font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ShopCreateModal