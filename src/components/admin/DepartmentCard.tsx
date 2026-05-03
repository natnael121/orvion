import React from 'react'
import { Department } from '../../types'
import { Edit3 as Edit, Trash2, Users, Shield, Activity } from 'lucide-react'

interface DepartmentCardProps {
  department: Department
  onEdit: (department: Department) => void
  onDelete: (departmentId: string) => void
}

const DepartmentCard: React.FC<DepartmentCardProps> = ({ department, onEdit, onDelete }) => {
  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'fiber': return { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', label: 'Fiber Squad' }
      case 'civil': return { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100', label: 'Civil Works' }
      case 'fixer': return { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', label: 'Maintenance' }
      case 'survey': return { color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100', label: 'Survey' }
      case 'warehouse': return { color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-100', label: 'Logistics' }
      case 'admin': return { color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-100', label: 'Ops Admin' }
      default: return { color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-100', label: 'Support' }
    }
  }

  const styles = getTypeStyles(department.type)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
      {/* Type Ribbon */}
      <div className={`absolute top-0 right-0 px-4 py-1 rounded-bl-2xl text-[10px] font-black uppercase tracking-tight ${styles.bg} ${styles.color}`}>
        {styles.label}
      </div>

      <div className="flex items-start gap-4">
        {/* Team Avatar */}
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 shadow-inner ${styles.bg} ${styles.border} border`}>
          {department.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mt-1">
            <h4 className="font-black text-gray-800 dark:text-gray-100 text-lg truncate pr-16">{department.name}</h4>
          </div>

          <p className="text-xs text-gray-500 font-medium line-clamp-1 mb-3">
            {department.description || "Field operation unit responsible for general tasks."}
          </p>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-gray-400 uppercase">Supervisor</span>
              <div className="flex items-center space-x-1 mt-0.5">
                <Shield size={12} className="text-blue-500" />
                <span className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate">
                  {department.supervisorName || "Unassigned"}
                </span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-gray-400 uppercase">Comms</span>
              <div className="flex items-center space-x-1 mt-0.5">
                <Activity size={12} className="text-emerald-500" />
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 truncate">
                  {department.telegramChatId || "N/A"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-gray-50 dark:border-gray-700 pt-3">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className={`w-7 h-7 rounded-full border-2 border-white dark:border-gray-800 ${styles.bg} flex items-center justify-center text-[10px] font-bold`}>
                  {i === 3 ? '+' : <Users size={12} className={styles.color} />}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(department)}
                className="p-2.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-xl transition-colors"
                title="Edit Team"
              >
                <Edit size={18} />
              </button>
              <button
                onClick={() => onDelete(department.id)}
                className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors"
                title="Delete Team"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DepartmentCard