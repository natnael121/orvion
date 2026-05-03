import React from 'react'
import { Product } from '../../types'
import { Package, FileEdit as Edit, Trash2, Star, AlertTriangle, Megaphone, Share2 } from 'lucide-react'

interface ProductCardProps {
  product: Product
  onEdit: (product: Product) => void
  onDelete: (productId: string) => void
  onPromote?: (product: Product) => void
  onShare: (product: Product) => void
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onEdit, onDelete, onPromote, onShare }) => {
  const isLowStock = product.stock <= product.lowStockAlert

  return (
    <div className="bg-telegram-secondary-bg rounded-2xl p-4 active:scale-[0.99] transition-transform">
      <div className="flex gap-3">
        <div className="flex-shrink-0">
          {product.images && product.images[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-20 h-20 rounded-xl object-cover"
            />
          ) : (
            <div className="w-20 h-20 bg-telegram-button/10 rounded-xl flex items-center justify-center">
              <Package className="w-10 h-10 text-telegram-button" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-1">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-bold text-telegram-text truncate">{product.name}</h4>
                {product.featured && (
                  <Star className="w-4 h-4 text-amber-500 fill-current flex-shrink-0" />
                )}
                {isLowStock && (
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                )}
              </div>
              <p className="text-sm text-telegram-hint line-clamp-2">{product.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-lg font-bold text-telegram-button">
              ${product.price.toFixed(2)}
            </span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              product.stock > product.lowStockAlert
                ? 'bg-green-100 text-green-700'
                : product.stock > 0
                ? 'bg-amber-100 text-amber-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {product.stock} left
            </span>
            {product.sku && (
              <span className="text-xs text-telegram-hint">
                SKU: {product.sku}
              </span>
            )}
          </div>

          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {product.tags.slice(0, 2).map((tag, index) => (
                <span key={index} className="text-xs bg-telegram-button/10 text-telegram-button px-2 py-1 rounded-full font-medium">
                  {tag}
                </span>
              ))}
              {product.tags.length > 2 && (
                <span className="text-xs text-telegram-hint">+{product.tags.length - 2}</span>
              )}
            </div>
          )}

          <div className="flex items-center gap-1.5 mt-3">
            {onPromote && (
              <button
                onClick={() => onPromote(product)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-green-50 text-green-700 rounded-lg font-medium text-sm active:scale-95 transition-transform"
                title="Promote Product"
              >
                <Megaphone className="w-4 h-4" />
                <span>promote</span>
              </button>
            )}
            <button
              onClick={() => onShare(product)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-50 text-blue-700 rounded-lg font-medium text-sm active:scale-95 transition-transform"
              title="Share Product"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>
            <button
              onClick={() => onEdit(product)}
              className="p-2 text-telegram-hint hover:text-telegram-button hover:bg-telegram-button/10 rounded-lg transition-colors"
            >
              <Edit className="w-5 h-5" />
            </button>
            <button
              onClick={() => onDelete(product.id)}
              className="p-2 text-telegram-hint hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductCard