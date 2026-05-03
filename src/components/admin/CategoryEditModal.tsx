import React, { useState } from 'react'
import { Category } from '../../types'
import { X, Save, Tag, FileText } from 'lucide-react'

interface CategoryEditModalProps {
  category?: Category
  userId: string
  shopId: string
  onSave: (category: any) => void
  onCancel: () => void
}

const CategoryEditModal: React.FC<CategoryEditModalProps> = ({ 
  category, 
  userId, 
  shopId, 
  onSave, 
  onCancel 
}) => {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    description: category?.description || '',
    icon: category?.icon || '📦',
    color: category?.color || '#3b82f6',
    order: category?.order ?? 0,
    isActive: category?.isActive ?? true,
    userId: userId,
    shopId: shopId
  })

  const predefinedIcons = [
    '📦', '🍕', '🍔', '☕', '🥗', '🍰', '👕', '📱',
    '💻', '🎮', '📚', '🏠', '🚗', '⚽', '🎵', '🎨'
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (category) {
      onSave({ ...category, ...formData })
    } else {
      onSave(formData)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-telegram-bg rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-telegram-text">
            {category ? 'Edit Category' : 'Add Category'}
          </h3>
          <button onClick={onCancel} className="text-telegram-hint">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-telegram-text mb-1">
                <Tag className="w-4 h-4 inline mr-1" />
                Category Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
                required
                placeholder="Enter category name"
              />
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
                placeholder="Optional category description"
              />
            </div>

            {/* Icon Selection */}
            <div>
              <label className="block text-sm font-medium text-telegram-text mb-2">
                Category Icon
              </label>
              <div className="flex items-center space-x-3 mb-3">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl border bg-telegram-button/10"
                >
                  {formData.icon}
                </div>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({...formData, icon: e.target.value})}
                  className="flex-1 p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
                  placeholder="📦"
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
                Category is active
              </label>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-4">
            <h4 className="font-medium text-telegram-text border-b pb-2">Preview</h4>

            <div className="bg-telegram-secondary-bg rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-xl bg-telegram-button/10"
                >
                  {formData.icon}
                </div>
                <div>
                  <h4 className="font-medium text-telegram-text">
                    {formData.name || 'Category Name'}
                  </h4>
                  {formData.description && (
                    <p className="text-sm text-telegram-hint mt-1">{formData.description}</p>
                  )}
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
              <span>{category ? 'Update' : 'Add'} Category</span>
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

export default CategoryEditModal