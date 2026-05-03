import React from 'react'
import { Department } from '../../types'
import { FileEdit as Edit, Trash2, MessageCircle } from 'lucide-react'

interface DepartmentCardProps {
  department: Department
  onEdit: (department: Department) => void
  onDelete: (departmentId: string) => void
}

const DepartmentCard: React.FC<DepartmentCardProps> = ({ department, onEdit, onDelete }) => {
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'kitchen': return 'bg-orange-100 text-orange-800'
      case 'cashier': return 'bg-green-100 text-green-800'
      case 'admin': return 'bg-purple-100 text-purple-800'
      case 'delivery': return 'bg-blue-100 text-blue-800'
      case 'sales': return 'bg-pink-100 text-pink-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="bg-telegram-secondary-bg rounded-2xl p-4 active:scale-[0.99] transition-transform">
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 bg-telegram-button/10 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
          {department.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-bold text-telegram-text truncate">{department.name}</h4>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ml-2 ${
              department.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {department.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs px-2.5 py-1 rounded-full capitalize font-medium ${getRoleColor(department.role)}`}>
              {department.role}
            </span>
            <div className="flex items-center gap-1 text-xs text-telegram-hint">
              <MessageCircle className="w-3 h-3" />
              <span className="truncate">{department.telegramChatId}</span>
            </div>
          </div>
          <div className="flex justify-end gap-1">
            <button
              onClick={() => onEdit(department)}
              className="p-2 text-telegram-hint hover:text-telegram-button hover:bg-telegram-button/10 rounded-lg transition-colors"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(department.id)}
              className="p-2 text-telegram-hint hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DepartmentCard