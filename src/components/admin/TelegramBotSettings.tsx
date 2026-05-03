import React, { useState, useEffect } from 'react'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { useFirebase } from '../../contexts/FirebaseContext'
import { useTelegram } from '../../contexts/TelegramContext'
import { MessageCircle, Save, Eye, EyeOff, TestTube, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { TelegramApiService } from '../../services/telegramApi'


interface TelegramBotSettingsProps {
  userId: string
  onTokenUpdate?: (token: string) => void
}

const TelegramBotSettings: React.FC<TelegramBotSettingsProps> = ({ userId, onTokenUpdate }) => {
  const { db } = useFirebase()
  const { user } = useTelegram()
  const [botToken, setBotToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadBotToken()
  }, [userId])

  const loadBotToken = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId))
      if (userDoc.exists()) {
        const userData = userDoc.data()
        setBotToken(userData.telegramBotToken || '')
      }
    } catch (error) {
      console.error('Error loading bot token:', error)
    }
  }

  const saveBotToken = async () => {
    if (!botToken.trim()) {
      setError('Bot token is required')
      return
    }

    // Validate token format
    if (!botToken.match(/^\d+:[A-Za-z0-9_-]{35}$/)) {
      setError('Invalid bot token format. Should be like: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const userRef = doc(db, 'users', userId)
      await updateDoc(userRef, {
        telegramBotToken: botToken.trim(),
        updatedAt: new Date()
      })

      if (onTokenUpdate) {
        onTokenUpdate(botToken.trim())
      }

      setTestResult(null)
    } catch (error) {
      console.error('Error saving bot token:', error)
      setError('Failed to save bot token. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const testBotToken = async () => {
    if (!botToken.trim()) {
      setError('Please enter a bot token first')
      return
    }

    setTesting(true)
    setTestResult(null)
    setError(null)

    try {
      const proxyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-proxy`

      // Test by getting bot info through proxy
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          botToken: botToken.trim(),
          method: 'getMe',
          params: {}
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      // Check if the edge function returned successfully and if Telegram API returned ok
      if (result.ok) {
        setTestResult('success')
        setError(null)
      } else {
        setTestResult('error')
        setError(result.description || 'Invalid bot token')
      }
    } catch (error: any) {
      console.error('Error testing bot token:', error)
      setTestResult('error')
      setError(error.message || 'Failed to test bot token. Please try again.')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="bg-telegram-secondary-bg rounded-lg p-4 space-y-4">
      <div className="flex items-center space-x-2">
        <MessageCircle className="w-5 h-5 text-telegram-button" />
        <h3 className="text-lg font-semibold text-telegram-text">Telegram Bot Settings</h3>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-telegram-text mb-2">
            Bot Token *
          </label>
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              className="w-full pl-3 pr-20 py-2 border border-telegram-hint/30 rounded-lg bg-telegram-bg text-telegram-text focus:border-telegram-button focus:outline-none"
              placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
            />
            <div className="absolute inset-y-0 right-0 flex items-center space-x-1 pr-2">
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="p-1 text-telegram-hint hover:text-telegram-text"
                title={showToken ? 'Hide token' : 'Show token'}
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={testBotToken}
                disabled={testing || !botToken.trim()}
                className="p-1 text-telegram-button hover:text-telegram-button/80 disabled:opacity-50"
                title="Test bot token"
              >
                {testing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <TestTube className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Test Result */}
        {testResult && (
          <div className={`flex items-center space-x-2 text-sm ${
            testResult === 'success' ? 'text-green-600' : 'text-red-600'
          }`}>
            {testResult === 'success' ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            <span>
              {testResult === 'success' 
                ? 'Bot token is valid and working!' 
                : 'Bot token test failed'
              }
            </span>
          </div>
        )}

        {error && (
          <div className="text-red-600 text-sm flex items-center space-x-1">
            <XCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex space-x-3">
          <button
            onClick={saveBotToken}
            disabled={saving || !botToken.trim()}
            className="flex items-center space-x-2 bg-telegram-button text-telegram-button-text px-4 py-2 rounded-lg hover:opacity-80 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saving ? 'Saving...' : 'Save Token'}</span>
          </button>
        </div>

        {/* Instructions */}
        <div className="bg-telegram-button/10 border border-telegram-button/20 rounded-lg p-3">
          <h4 className="font-medium text-telegram-text mb-2">How to get your Bot Token:</h4>
          <ol className="text-sm text-telegram-hint space-y-1 list-decimal list-inside">
            <li>Open Telegram and search for @BotFather</li>
            <li>Send /newbot command to create a new bot</li>
            <li>Follow the instructions to set up your bot</li>
            <li>Copy the bot token provided by BotFather</li>
            <li>Paste it here and click "Save Token"</li>
          </ol>
          <p className="text-xs text-telegram-hint mt-2">
            The bot token is used to send promotional messages and notifications to your Telegram channels/groups.
          </p>
        </div>
      </div>
    </div>
  )
}

export default TelegramBotSettings