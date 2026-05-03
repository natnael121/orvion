import React, { useState } from 'react'
import { Product, Category } from '../../types'
import { X, Save, Package, FileText, DollarSign, Image, Plus, Trash2, Tag } from 'lucide-react'
import MultiImageUpload from '../common/MultiImageUpload'

interface ProductEditModalProps {
  product?: Product
  shopId: string
  categories: Category[]
  onSave: (product: any) => void
  onCancel: () => void
}

const ProductEditModal: React.FC<ProductEditModalProps> = ({ 
  product, 
  shopId, 
  categories, 
  onSave, 
  onCancel 
}) => {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || 0,
    stock: product?.stock || 0,
    category: product?.category || '',
    images: product?.images || [''],
    sku: product?.sku || '',
    isActive: product?.isActive ?? true,
    lowStockAlert: product?.lowStockAlert || 5,
    tags: product?.tags || [],
    featured: product?.featured || false,
    costPrice: product?.costPrice || 0,
    shopId: shopId
  })

  const [newTag, setNewTag] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Clean up empty images
    const cleanImages = formData.images.filter(img => img.trim() !== '')
    
    const productData = {
      ...formData,
      images: cleanImages.length > 0 ? cleanImages : ['']
    }

    if (product) {
      onSave({ ...product, ...productData })
    } else {
      onSave(productData)
    }
  }

  const addImageField = () => {
    setFormData({...formData, images: [...formData.images, '']})
  }

  const updateImage = (index: number, value: string) => {
    const newImages = [...formData.images]
    newImages[index] = value
    setFormData({...formData, images: newImages})
  }

  const removeImage = (index: number) => {
    const newImages = formData.images.filter((_, i) => i !== index)
    setFormData({...formData, images: newImages.length > 0 ? newImages : ['']})
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()]
      })
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-telegram-bg rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-telegram-text">
            {product ? 'Edit Product' : 'Add Product'}
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
                  <Package className="w-4 h-4 inline mr-1" />
                  Product Name *
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
                  SKU
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({...formData, sku: e.target.value})}
                  className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
                  placeholder="Product SKU"
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
                placeholder="Product description..."
              />
            </div>
          </div>

          {/* Pricing & Inventory */}
          <div className="space-y-4">
            <h4 className="font-medium text-telegram-text border-b pb-2">Pricing & Inventory</h4>
            
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-telegram-text mb-1">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Price *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                  className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-telegram-text mb-1">
                  Cost Price
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.costPrice}
                  onChange={(e) => setFormData({...formData, costPrice: parseFloat(e.target.value) || 0})}
                  className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-telegram-text mb-1">
                  Stock *
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => setFormData({...formData, stock: parseInt(e.target.value) || 0})}
                  className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-telegram-text mb-1">
                  Low Stock Alert
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.lowStockAlert}
                  onChange={(e) => setFormData({...formData, lowStockAlert: parseInt(e.target.value) || 0})}
                  className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
                />
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-4">
            <h4 className="font-medium text-telegram-text border-b pb-2">Categories</h4>

            <div>
              <label className="block text-sm font-medium text-telegram-text mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Images */}
          <div className="space-y-4">
            <h4 className="font-medium text-telegram-text border-b pb-2">
              <Image className="w-4 h-4 inline mr-1" />
              Product Images
            </h4>
            
            <MultiImageUpload
              value={formData.images.filter(img => img.trim() !== '')}
              onChange={(urls) => setFormData({...formData, images: urls})}
              maxImages={5}
            />
          </div>

          {/* Tags */}
          <div className="space-y-4">
            <h4 className="font-medium text-telegram-text border-b pb-2">
              <Tag className="w-4 h-4 inline mr-1" />
              Tags
            </h4>
            
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags.map((tag, index) => (
                <span
                  key={index}
                  className="bg-telegram-button bg-opacity-10 text-telegram-button px-3 py-1 rounded-full text-sm flex items-center space-x-1"
                >
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-telegram-button hover:text-red-500"
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
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                className="flex-1 p-3 border rounded-lg bg-telegram-secondary-bg text-telegram-text"
                placeholder="Add a tag..."
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-3 bg-telegram-button text-telegram-button-text rounded-lg"
              >
                Add
              </button>
            </div>
          </div>

          {/* Status Options */}
          <div className="space-y-4">
            <h4 className="font-medium text-telegram-text border-b pb-2">Status</h4>
            
            <div className="flex items-center space-x-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                  className="mr-2"
                />
                <label htmlFor="isActive" className="text-sm text-telegram-text">
                  Product is active
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="featured"
                  checked={formData.featured}
                  onChange={(e) => setFormData({...formData, featured: e.target.checked})}
                  className="mr-2"
                />
                <label htmlFor="featured" className="text-sm text-telegram-text">
                  Featured product
                </label>
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
              <span>{product ? 'Update' : 'Add'} Product</span>
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

export default ProductEditModal