import React, { useState, useEffect } from 'react'
import { Plus, FileEdit as Edit, Trash2, Tag, X, Save, TestTube } from 'lucide-react'
import { CRMAutoTagRule, CRMTag } from '../../types'
import {
  getAutoTagRules,
  createAutoTagRule,
  updateAutoTagRule,
  deleteAutoTagRule,
  applyAutoTagRules,
  getTags
} from '../../services/crmService'

interface AutoTagRulesManagerProps {
  shopId: string
}

const AutoTagRulesManager: React.FC<AutoTagRulesManagerProps> = ({
  shopId
}) => {
  const [rules, setRules] = useState<CRMAutoTagRule[]>([])
  const [availableTags, setAvailableTags] = useState<CRMTag[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingRule, setEditingRule] = useState<CRMAutoTagRule | null>(null)
  const [formData, setFormData] = useState({
    pattern: '',
    tags: [] as string[],
    description: '',
    isActive: true
  })
  const [saving, setSaving] = useState(false)
  const [testPattern, setTestPattern] = useState('')
  const [testResult, setTestResult] = useState<string[]>([])
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    loadData()
  }, [shopId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [rulesData, tagsData] = await Promise.all([
        getAutoTagRules(shopId),
        getTags(shopId)
      ])
      setRules(rulesData)
      setAvailableTags(tagsData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNew = () => {
    setEditingRule(null)
    setFormData({
      pattern: '',
      tags: [],
      description: '',
      isActive: true
    })
    setShowModal(true)
  }

  const handleEdit = (rule: CRMAutoTagRule) => {
    setEditingRule(rule)
    setFormData({
      pattern: rule.pattern,
      tags: rule.tags,
      description: rule.description || '',
      isActive: rule.isActive
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formData.pattern.trim() || formData.tags.length === 0) {
      alert('Please fill in pattern and select at least one tag')
      return
    }

    try {
      setSaving(true)

      if (editingRule) {
        await updateAutoTagRule(editingRule.id, {
          pattern: formData.pattern,
          tags: formData.tags,
          description: formData.description,
          isActive: formData.isActive
        })
      } else {
        await createAutoTagRule(
          shopId,
          formData.pattern,
          formData.tags,
          formData.description
        )
      }

      await loadData()
      setShowModal(false)
    } catch (error) {
      console.error('Error saving rule:', error)
      alert('Failed to save rule')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (ruleId: string, pattern: string) => {
    if (!confirm(`Are you sure you want to delete rule "${pattern}"?`)) {
      return
    }

    try {
      await deleteAutoTagRule(ruleId)
      await loadData()
    } catch (error) {
      console.error('Error deleting rule:', error)
      alert('Failed to delete rule')
    }
  }

  const toggleTag = (tagName: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tagName)
        ? prev.tags.filter(t => t !== tagName)
        : [...prev.tags, tagName]
    }))
  }

  const handleTest = async () => {
    if (!testPattern.trim()) {
      alert('Please enter a test pattern')
      return
    }

    try {
      setTesting(true)
      const tags = await applyAutoTagRules(shopId, testPattern)
      setTestResult(tags)
    } catch (error) {
      console.error('Error testing pattern:', error)
      alert('Failed to test pattern')
    } finally {
      setTesting(false)
    }
  }

  const toggleRuleStatus = async (rule: CRMAutoTagRule) => {
    try {
      await updateAutoTagRule(rule.id, {
        isActive: !rule.isActive
      })
      await loadData()
    } catch (error) {
      console.error('Error toggling rule status:', error)
      alert('Failed to update rule status')
    }
  }

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
        <h3 className="text-lg font-semibold text-telegram-text">Auto-Tag Rules</h3>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 px-4 py-2 bg-telegram-button text-telegram-button-text rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          New Rule
        </button>
      </div>

      <div className="bg-telegram-secondary-bg border border-telegram-hint/20 rounded-lg p-4">
        <h4 className="font-medium text-telegram-text mb-2">Test Rules</h4>
        <div className="flex gap-2">
          <input
            type="text"
            value={testPattern}
            onChange={(e) => setTestPattern(e.target.value)}
            placeholder="Enter a start_param to test (e.g., promo_summer)"
            className="flex-1 px-4 py-2 bg-telegram-bg border border-telegram-hint/20 rounded-lg text-telegram-text placeholder-telegram-hint focus:ring-2 focus:ring-telegram-button focus:border-transparent"
          />
          <button
            onClick={handleTest}
            disabled={testing}
            className="flex items-center gap-2 px-4 py-2 bg-telegram-button text-telegram-button-text rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <TestTube className="h-4 w-4" />
            {testing ? 'Testing...' : 'Test'}
          </button>
        </div>
        {testResult.length > 0 && (
          <div className="mt-3">
            <p className="text-sm text-telegram-text mb-2">
              Tags that would be applied:
            </p>
            <div className="flex flex-wrap gap-2">
              {testResult.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-telegram-button/10 text-telegram-button rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
        {testResult.length === 0 && testPattern && !testing && (
          <p className="text-sm text-telegram-hint mt-3">
            No tags would be applied for this pattern
          </p>
        )}
      </div>

      {rules.length === 0 ? (
        <div className="text-center py-12 bg-telegram-secondary-bg rounded-xl border border-telegram-hint/20">
          <Tag className="h-12 w-12 mx-auto mb-3 text-telegram-hint" />
          <p className="text-telegram-text">No auto-tag rules yet</p>
          <p className="text-sm text-telegram-hint mt-1">
            Create rules to automatically tag customers based on their entry link
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {rules.map(rule => (
            <div
              key={rule.id}
              className={`bg-telegram-secondary-bg p-4 rounded-xl border border-telegram-hint/20 hover:bg-telegram-bg transition-colors ${
                !rule.isActive && 'opacity-60'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-telegram-text">
                      {rule.pattern}
                    </h4>
                    <button
                      onClick={() => toggleRuleStatus(rule)}
                      className={`px-2 py-1 text-xs rounded ${
                        rule.isActive
                          ? 'bg-green-500/20 text-green-600'
                          : 'bg-telegram-hint/20 text-telegram-hint'
                      }`}
                    >
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                  {rule.description && (
                    <p className="text-sm text-telegram-hint">{rule.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(rule)}
                    className="p-2 text-telegram-hint hover:text-telegram-button transition-colors"
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id, rule.pattern)}
                    className="p-2 text-telegram-hint hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {rule.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-telegram-button/10 text-telegram-button text-sm rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-telegram-bg rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-telegram-bg border-b border-telegram-hint/20 p-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-telegram-text">
                {editingRule ? 'Edit Rule' : 'New Rule'}
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
                  Pattern
                </label>
                <input
                  type="text"
                  value={formData.pattern}
                  onChange={(e) =>
                    setFormData({ ...formData, pattern: e.target.value })
                  }
                  placeholder="e.g., promo_* or discount_summer"
                  className="w-full px-4 py-2 bg-telegram-secondary-bg border border-telegram-hint/20 rounded-lg text-telegram-text placeholder-telegram-hint focus:ring-2 focus:ring-telegram-button focus:border-transparent"
                />
                <p className="text-xs text-telegram-hint mt-1">
                  Use * as wildcard. Example: promo_* matches promo_summer,
                  promo_winter, etc.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-telegram-text mb-2">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="e.g., Tag for summer promotion campaign"
                  className="w-full px-4 py-2 bg-telegram-secondary-bg border border-telegram-hint/20 rounded-lg text-telegram-text placeholder-telegram-hint focus:ring-2 focus:ring-telegram-button focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-telegram-text mb-2">
                  Tags to Apply
                </label>
                {availableTags.length === 0 ? (
                  <p className="text-sm text-telegram-hint">
                    No tags available. Create tags in the contact detail modal
                    first.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map(tag => (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(tag.name)}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          formData.tags.includes(tag.name)
                            ? 'text-white'
                            : 'bg-telegram-secondary-bg text-telegram-text hover:bg-telegram-hint/20'
                        }`}
                        style={{
                          backgroundColor: formData.tags.includes(tag.name)
                            ? tag.color
                            : undefined
                        }}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="w-4 h-4 text-telegram-button border-telegram-hint/20 rounded focus:ring-telegram-button"
                />
                <label htmlFor="isActive" className="text-sm text-telegram-text">
                  Active (rule will be applied to new contacts)
                </label>
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
                  {saving ? 'Saving...' : 'Save Rule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AutoTagRulesManager
