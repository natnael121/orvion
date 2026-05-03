import React, { useState, useEffect } from 'react'
import { Department } from '../../types'
import { X, MessageCircle } from 'lucide-react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { useFirebase } from '../../contexts/FirebaseContext'
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
  const { db } = useFirebase()
  const [employees, setEmployees] = useState<any[]>([])
  const [formData, setFormData] = useState({
    name: department?.name || '',
    description: department?.description || '',
    type: department?.type || 'fiber',
    supervisorId: department?.supervisorId || '',
    supervisorName: department?.supervisorName || '',
    telegramChatId: department?.telegramChatId || '',
    adminChatId: department?.adminChatId || '',
    role: department?.role || 'field',
    order: department?.order || 0,
    icon: department?.icon || '👷',
    isActive: department?.isActive ?? true,
    zone: department?.zone || '',
    notificationTypes: department?.notificationTypes || [],
    userId: userId,
    shopId: shopId
  })
  const [botToken, setBotToken] = useState('')

  useEffect(() => {
    fetchEmployees()
    const token = propBotToken || import.meta.env.VITE_TELEGRAM_BOT_TOKEN
    if (token) setBotToken(token)
  }, [propBotToken])

  const fetchEmployees = async () => {
    try {
      const q = query(collection(db, 'shop_customers'), where('shopId', '==', shopId))
      const snap = await getDocs(q)
      setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (e) {
      console.error(e)
    }
  }

  const teamTypes = [
    { value: 'fiber', label: 'Fiber Installation', icon: '🧵' },
    { value: 'civil', label: 'Civil Works', icon: '🏗️' },
    { value: 'fixer', label: 'Maintenance/Fixer', icon: '🛠️' },
    { value: 'survey', label: 'Survey/Recon', icon: '📏' },
    { value: 'warehouse', label: 'Warehouse', icon: '📦' },
    { value: 'admin', label: 'Operations Admin', icon: '🏢' },
  ]

  const notificationTypes = [
    'task_assigned',
    'task_completed',
    'issue_reported',
    'material_requested',
    'attendance_alert',
    'status_update'
  ]

  const predefinedIcons = [
    '👷', '🧵', '🏗️', '🛠️', '📏', '📦', '🏢', '⚡',
    '📡', '🚜', '💻', '📋', '📁', '🗺️', '🎯', '🚩'
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const supervisor = employees.find(emp => emp.id === formData.supervisorId)
    const finalData = {
      ...formData,
      supervisorName: supervisor?.displayName || supervisor?.name || ''
    }
    if (department) {
      onSave({ ...department, ...finalData })
    } else {
      onSave(finalData)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-black text-gray-800 dark:text-white">
              {department ? 'Update Team' : 'New Operational Team'}
            </h3>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Configure work group & supervisor</p>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Team / Department Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-4 bg-gray-50 dark:bg-gray-900 border-0 rounded-2xl text-gray-800 dark:text-white font-bold"
                placeholder="e.g. Fiber Team Alpha"
              />
            </div>

            <div className="col-span-2">
              <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Team Mission / Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-4 bg-gray-50 dark:bg-gray-900 border-0 rounded-2xl text-gray-800 dark:text-white text-sm"
                placeholder="What does this team handle?"
                rows={2}
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Operation Type</label>
              <select
                value={formData.type}
                onChange={(e) => {
                  const type = e.target.value
                  const icon = teamTypes.find(t => t.value === type)?.icon || '👷'
                  setFormData({ ...formData, type: type as any, icon })
                }}
                className="w-full p-4 bg-gray-50 dark:bg-gray-900 border-0 rounded-2xl font-bold"
              >
                {teamTypes.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Team Supervisor</label>
              <select
                value={formData.supervisorId}
                onChange={(e) => setFormData({ ...formData, supervisorId: e.target.value })}
                className="w-full p-4 bg-gray-50 dark:bg-gray-900 border-0 rounded-2xl font-bold"
              >
                <option value="">No Supervisor Assigned</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.displayName || emp.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Operational Zone / Region</label>
              <input
                type="text"
                value={formData.zone}
                onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                className="w-full p-4 bg-gray-50 dark:bg-gray-900 border-0 rounded-2xl font-bold"
                placeholder="e.g. Zone A, North Sector"
              />
            </div>
          </div>

          <div className="space-y-4 bg-blue-50 dark:bg-blue-900/10 p-5 rounded-3xl">
            <h4 className="font-black text-blue-600 dark:text-blue-400 text-sm flex items-center">
              <MessageCircle className="w-4 h-4 mr-2" /> Live Comms (Telegram)
            </h4>

            <div className="space-y-4">
              <TelegramChatInput
                value={formData.telegramChatId}
                onChange={(chatId) => setFormData({ ...formData, telegramChatId: chatId })}
                label="Team Operation Group ID"
                placeholder="@fiber_team_group"
                required
                botToken={botToken}
                showValidation={true}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Team Icon</label>
              <div className="flex flex-wrap gap-2">
                {predefinedIcons.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon })}
                    className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${formData.icon === icon
                      ? 'bg-blue-600 text-white scale-110 shadow-lg'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Live Notifications</label>
              <div className="space-y-1 max-h-32 overflow-y-auto pr-2">
                {notificationTypes.map((type) => (
                  <label key={type} className="flex items-center p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.notificationTypes.includes(type)}
                      onChange={() => {
                        const newTypes = formData.notificationTypes.includes(type)
                          ? formData.notificationTypes.filter(t => t !== type)
                          : [...formData.notificationTypes, type]
                        setFormData({ ...formData, notificationTypes: newTypes })
                      }}
                      className="mr-3 w-4 h-4 rounded border-gray-300 text-blue-600"
                    />
                    <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase">
                      {type.replace('_', ' ')}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t dark:border-gray-700">
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-500/20"
            >
              {department ? 'Update Team Configuration' : 'Create Squad'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-8 py-4 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 rounded-2xl font-bold"
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