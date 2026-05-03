import React, { useState, useEffect } from 'react'
import { Plus, FileEdit as Edit, Trash2, Copy, FileText, X, Save } from 'lucide-react'
import { CRMMessageTemplate } from '../../types'
import {
  getMessageTemplates,
  createMessageTemplate,
  updateMessageTemplate,
  deleteMessageTemplate
} from '../../services/crmService'

interface MessageTemplatesManagerProps {
  shopId: string
}

const MessageTemplatesManager: React.FC<MessageTemplatesManagerProps> = ({
  shopId
}) => {
  const [templates, setTemplates] = useState<CRMMessageTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<CRMMessageTemplate | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    category: 'General',
    content: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadTemplates()
  }, [shopId])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const data = await getMessageTemplates(shopId)
      setTemplates(data)
    } catch (error) {
      console.error('Error loading templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNew = () => {
    setEditingTemplate(null)
    setFormData({
      name: '',
      category: 'General',
      content: ''
    })
    setShowModal(true)
  }

  const handleEdit = (template: CRMMessageTemplate) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      category: template.category || 'General',
      content: template.content
    })
    setShowModal(true)
  }

  const handleDuplicate = (template: CRMMessageTemplate) => {
    setEditingTemplate(null)
    setFormData({
      name: `${template.name} (Copy)`,
      category: template.category || 'General',
      content: template.content
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.content.trim()) {
      alert('Please fill in all required fields')
      return
    }

    try {
      setSaving(true)

      if (editingTemplate) {
        await updateMessageTemplate(editingTemplate.id, {
          name: formData.name,
          category: formData.category,
          content: formData.content
        })
      } else {
        await createMessageTemplate(
          shopId,
          formData.name,
          formData.content,
          formData.category
        )
      }

      await loadTemplates()
      setShowModal(false)
    } catch (error) {
      console.error('Error saving template:', error)
      alert('Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (templateId: string, templateName: string) => {
    if (!confirm(`Are you sure you want to delete "${templateName}"?`)) {
      return
    }

    try {
      await deleteMessageTemplate(templateId)
      await loadTemplates()
    } catch (error) {
      console.error('Error deleting template:', error)
      alert('Failed to delete template')
    }
  }

  const insertVariable = (variable: string) => {
    setFormData(prev => ({
      ...prev,
      content: prev.content + `{{${variable}}}`
    }))
  }

  const categories = Array.from(new Set(templates.map(t => t.category || 'General')))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-telegram-button"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-telegram-text">Message Templates</h3>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 px-4 py-2 bg-telegram-button text-telegram-button-text rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          New Template
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-12 bg-telegram-secondary-bg rounded-xl border border-telegram-hint/20">
          <FileText className="h-12 w-12 mx-auto mb-3 text-telegram-hint" />
          <p className="text-telegram-text">No templates yet</p>
          <p className="text-sm text-telegram-hint mt-1">
            Create your first message template to save time
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {templates.map(template => (
            <div
              key={template.id}
              className="bg-telegram-secondary-bg p-4 rounded-xl border border-telegram-hint/20 hover:bg-telegram-bg transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-telegram-text">{template.name}</h4>
                  <span className="text-xs text-telegram-hint">
                    {template.category || 'General'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDuplicate(template)}
                    className="p-2 text-telegram-hint hover:text-telegram-button transition-colors"
                    title="Duplicate"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(template)}
                    className="p-2 text-telegram-hint hover:text-telegram-button transition-colors"
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(template.id, template.name)}
                    className="p-2 text-telegram-hint hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-telegram-text whitespace-pre-wrap line-clamp-3">
                {template.content}
              </p>
              {template.variables && template.variables.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {template.variables.map((variable, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-telegram-button/10 text-telegram-button text-xs rounded"
                    >
                      {`{{${variable}}}`}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-telegram-bg rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-telegram-bg border-b border-telegram-hint/20 p-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-telegram-text">
                {editingTemplate ? 'Edit Template' : 'New Template'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-telegram-secondary-bg rounded-lg transition-colors"
              >
                <X className="h-6 w-6 text-telegram-hint" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-telegram-text mb-2">
                  Template Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Welcome Message"
                  className="w-full px-4 py-2 bg-telegram-secondary-bg border border-telegram-hint/20 rounded-lg text-telegram-text placeholder-telegram-hint focus:ring-2 focus:ring-telegram-button focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-telegram-text mb-2">
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  placeholder="e.g., General, Promotions, Follow-up"
                  list="categories"
                  className="w-full px-4 py-2 bg-telegram-secondary-bg border border-telegram-hint/20 rounded-lg text-telegram-text placeholder-telegram-hint focus:ring-2 focus:ring-telegram-button focus:border-transparent"
                />
                <datalist id="categories">
                  {categories.map((cat, idx) => (
                    <option key={idx} value={cat} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-telegram-text mb-2">
                  Message Content
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  placeholder="Type your message template here..."
                  className="w-full px-4 py-3 bg-telegram-secondary-bg border border-telegram-hint/20 rounded-lg text-telegram-text placeholder-telegram-hint focus:ring-2 focus:ring-telegram-button focus:border-transparent resize-none"
                  rows={8}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-telegram-text mb-2">
                  Insert Variables
                </label>
                <div className="flex flex-wrap gap-2">
                  {['name', 'username', 'shop_name', 'total_orders', 'total_spent', 'last_order'].map(
                    (variable) => (
                      <button
                        key={variable}
                        onClick={() => insertVariable(variable)}
                        className="px-3 py-1 bg-telegram-secondary-bg text-telegram-text text-sm rounded hover:bg-telegram-hint/20 transition-colors border border-telegram-hint/20"
                      >
                        {`{{${variable}}}`}
                      </button>
                    )
                  )}
                </div>
                <p className="text-xs text-telegram-hint mt-2">
                  Variables will be replaced with actual customer data when sending
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 bg-telegram-secondary-bg text-telegram-text rounded-lg hover:bg-telegram-hint/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-telegram-button text-telegram-button-text rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                >
                  <Save className="h-5 w-5" />
                  {saving ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MessageTemplatesManager
