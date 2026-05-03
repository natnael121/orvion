import React, { useState, useEffect } from 'react'
import {
  X,
  Mail,
  Phone,
  User,
  Tag,
  MessageCircle,
  ShoppingBag,
  DollarSign,
  Calendar,
  Save,
  Plus
} from 'lucide-react'
import { CRMContact, CRMTag } from '../../types'
import {
  updateContactTags,
  updateContactNotes,
  getTags,
  createTag
} from '../../services/crmService'

interface CRMContactDetailProps {
  contact: CRMContact
  onClose: () => void
  onSendMessage: (contact: CRMContact) => void
  onViewOrders?: (customerId: string) => void
  onUpdate: () => void
}

const CRMContactDetail: React.FC<CRMContactDetailProps> = ({
  contact,
  onClose,
  onSendMessage,
  onViewOrders,
  onUpdate
}) => {
  const [notes, setNotes] = useState(contact.notes || '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [availableTags, setAvailableTags] = useState<CRMTag[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>(contact.tags || [])
  const [showNewTag, setShowNewTag] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#3B82F6')

  useEffect(() => {
    loadTags()
  }, [contact.shopId])

  const loadTags = async () => {
    try {
      const tags = await getTags(contact.shopId)
      setAvailableTags(tags)
    } catch (error) {
      console.error('Error loading tags:', error)
    }
  }

  const handleSaveNotes = async () => {
    try {
      setSavingNotes(true)
      await updateContactNotes(contact.id, notes)
      onUpdate()
      alert('Notes saved successfully')
    } catch (error) {
      console.error('Error saving notes:', error)
      alert('Failed to save notes')
    } finally {
      setSavingNotes(false)
    }
  }

  const toggleTag = async (tagName: string) => {
    try {
      const newTags = selectedTags.includes(tagName)
        ? selectedTags.filter(t => t !== tagName)
        : [...selectedTags, tagName]

      setSelectedTags(newTags)
      await updateContactTags(contact.id, newTags)
      onUpdate()
    } catch (error) {
      console.error('Error updating tags:', error)
      alert('Failed to update tags')
    }
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return

    try {
      await createTag(contact.shopId, newTagName.trim(), newTagColor)
      await loadTags()
      setShowNewTag(false)
      setNewTagName('')
      setNewTagColor('#3B82F6')
    } catch (error) {
      console.error('Error creating tag:', error)
      alert('Failed to create tag')
    }
  }

  const characterCount = notes.length
  const maxChars = 500

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Contact Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-semibold">
              {contact.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900">
                {contact.name || 'Unknown User'}
              </h3>
              {contact.username && (
                <p className="text-gray-600">@{contact.username}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <span
                  className={`px-3 py-1 rounded-full text-sm ${
                    contact.activityStatus === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {contact.activityStatus === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contact.email && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Mail className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm font-medium text-gray-900">
                    {contact.email}
                  </p>
                </div>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Phone className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="text-sm font-medium text-gray-900">
                    {contact.phone}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingBag className="h-5 w-5 text-blue-600" />
                <span className="text-xs text-gray-600">Total Orders</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {contact.totalOrders}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <span className="text-xs text-gray-600">Total Spent</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                ${contact.totalSpent.toFixed(2)}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-5 w-5 text-purple-600" />
                <span className="text-xs text-gray-600">Avg Order</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                ${contact.averageOrderValue.toFixed(2)}
              </p>
            </div>
          </div>

          {contact.lastOrderDate && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              Last order: {contact.lastOrderDate.toLocaleDateString()}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Tag className="h-4 w-4" />
                Tags
              </label>
              <button
                onClick={() => setShowNewTag(!showNewTag)}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
              >
                <Plus className="h-4 w-4" />
                New Tag
              </button>
            </div>

            {showNewTag && (
              <div className="mb-3 p-3 bg-gray-50 rounded-lg space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Tag name"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <input
                    type="color"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="w-12 h-10 rounded-lg border border-gray-300"
                  />
                  <button
                    onClick={handleCreateTag}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    Create
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {availableTags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.name)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedTags.includes(tag.name)
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={{
                    backgroundColor: selectedTags.includes(tag.name)
                      ? tag.color
                      : undefined
                  }}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={maxChars}
              placeholder="Add notes about this customer..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={4}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-500">
                {characterCount}/{maxChars} characters
              </span>
              <button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                <Save className="h-4 w-4" />
                {savingNotes ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => onSendMessage(contact)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <MessageCircle className="h-5 w-5" />
              Send Message
            </button>
            {onViewOrders && (
              <button
                onClick={() => onViewOrders(contact.id)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <ShoppingBag className="h-5 w-5" />
                View Orders
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CRMContactDetail
