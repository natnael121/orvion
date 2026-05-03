import React from 'react'
import { Category } from '../../types'
import { FileEdit as Edit, Trash2 } from 'lucide-react'

interface CategoryCardProps {
  category: Category
  onEdit: (category: Category) => void
  onDelete: (categoryId: string) => void
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category, onEdit, onDelete }) => {
  return (
    <div className="bg-telegram-secondary-bg rounded-2xl p-4 active:scale-[0.99] transition-transform">
      <div className="flex items-center gap-3">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 bg-telegram-button/10"
        >
          {category.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-bold text-telegram-text truncate">{category.name}</h4>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ml-2 ${
              category.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {category.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          {category.description && (
            <p className="text-sm text-telegram-hint line-clamp-1 mb-2">{category.description}</p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-telegram-hint">
              {category.productCount || 0} product{category.productCount !== 1 ? 's' : ''}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => onEdit(category)}
                className="p-2 text-telegram-hint hover:text-telegram-button hover:bg-telegram-button/10 rounded-lg transition-colors"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(category.id)}
                className="p-2 text-telegram-hint hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CategoryCard