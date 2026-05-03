import React, { useState, useEffect } from 'react'
import {
  X,
  Send,
  Users,
  FileText,
  Eye,
  Loader
} from 'lucide-react'
import { CRMContact, CRMMessageTemplate, Shop } from '../../types'
import {
  getMessageTemplates,
  replaceTemplateVariables,
  updateContactLastContacted
} from '../../services/crmService'
import { telegramService } from '../../services/telegram'

interface CRMMessageComposerProps {
  shopId: string
  shop?: Shop
  botToken: string
  mode: 'single' | 'multiple'
  contacts: CRMContact[]
  onClose: () => void
  onSent: () => void
}

const CRMMessageComposer: React.FC<CRMMessageComposerProps> = ({
  shopId,
  shop,
  botToken,
  mode,
  contacts,
  onClose,
  onSent
}) => {
  const [message, setMessage] = useState('')
  const [templates, setTemplates] = useState<CRMMessageTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [sending, setSending] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewIndex, setPreviewIndex] = useState(0)

  useEffect(() => {
    loadTemplates()
  }, [shopId])

  const loadTemplates = async () => {
    try {
      const data = await getMessageTemplates(shopId)
      setTemplates(data)
    } catch (error) {
      console.error('Error loading templates:', error)
    }
  }

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (template) {
      setMessage(template.content)
      setSelectedTemplate(templateId)
    }
  }

  const getPreviewMessage = (contact: CRMContact): string => {
    return replaceTemplateVariables(message, contact, shop?.name)
  }

  const handleSend = async () => {
    if (!message.trim() || !botToken) {
      alert('Please enter a message and ensure bot token is configured')
      return
    }

    try {
      setSending(true)
      let successCount = 0
      let failCount = 0

      for (const contact of contacts) {
        try {
          const personalizedMessage = replaceTemplateVariables(
            message,
            contact,
            shop?.name
          )

          const success = await telegramService.sendPromotionMessage(
            {
              botToken,
              chatId: contact.telegramId.toString()
            },
            {
              text: personalizedMessage,
              parseMode: 'HTML'
            }
          )

          if (success) {
            successCount++
            await updateContactLastContacted(contact.id)
          } else {
            failCount++
          }

          await new Promise(resolve => setTimeout(resolve, 100))
        } catch (error) {
          console.error(`Failed to send to ${contact.name}:`, error)
          failCount++
        }
      }

      alert(
        `Message sent!\nSuccess: ${successCount}\nFailed: ${failCount}`
      )

      onSent()
      onClose()
    } catch (error) {
      console.error('Error sending messages:', error)
      alert('Failed to send messages. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const previewContact = contacts[previewIndex]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {mode === 'single' ? 'Send Message' : 'Send Bulk Message'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Sending to {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-blue-900 mb-2">Recipients</h4>
                <div className="flex flex-wrap gap-2">
                  {contacts.slice(0, 5).map(contact => (
                    <span
                      key={contact.id}
                      className="px-3 py-1 bg-white text-blue-900 text-sm rounded-full"
                    >
                      {contact.name || contact.username || 'Unknown'}
                    </span>
                  ))}
                  {contacts.length > 5 && (
                    <span className="px-3 py-1 bg-white text-blue-900 text-sm rounded-full">
                      +{contacts.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {templates.length > 0 && (
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <FileText className="h-4 w-4" />
                Use Template (Optional)
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a template...</option>
                {templates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                    {template.category && ` - ${template.category}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={8}
            />
            <div className="mt-2 text-xs text-gray-500">
              <p className="font-medium mb-1">Available variables:</p>
              <div className="flex flex-wrap gap-2">
                <code className="px-2 py-1 bg-gray-100 rounded">
                  {'{{name}}'}
                </code>
                <code className="px-2 py-1 bg-gray-100 rounded">
                  {'{{username}}'}
                </code>
                <code className="px-2 py-1 bg-gray-100 rounded">
                  {'{{shop_name}}'}
                </code>
                <code className="px-2 py-1 bg-gray-100 rounded">
                  {'{{total_orders}}'}
                </code>
                <code className="px-2 py-1 bg-gray-100 rounded">
                  {'{{total_spent}}'}
                </code>
                <code className="px-2 py-1 bg-gray-100 rounded">
                  {'{{last_order}}'}
                </code>
              </div>
            </div>
          </div>

          {showPreview && previewContact && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">Message Preview</h4>
                {contacts.length > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setPreviewIndex(Math.max(0, previewIndex - 1))
                      }
                      disabled={previewIndex === 0}
                      className="px-2 py-1 text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400"
                    >
                      Prev
                    </button>
                    <span className="text-sm text-gray-600">
                      {previewIndex + 1} / {contacts.length}
                    </span>
                    <button
                      onClick={() =>
                        setPreviewIndex(
                          Math.min(contacts.length - 1, previewIndex + 1)
                        )
                      }
                      disabled={previewIndex === contacts.length - 1}
                      className="px-2 py-1 text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-2">
                To: {previewContact.name || previewContact.username || 'Unknown'}
              </p>
              <div className="bg-white p-3 rounded border border-gray-200 whitespace-pre-wrap text-sm">
                {getPreviewMessage(previewContact)}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Eye className="h-5 w-5" />
              {showPreview ? 'Hide' : 'Show'} Preview
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !message.trim() || !botToken}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  Send Message{mode === 'multiple' ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CRMMessageComposer
