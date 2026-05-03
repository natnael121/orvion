import React, { useState, useEffect } from 'react'
import { MessageCircle, Check, X, Loader2, AlertCircle, Info } from 'lucide-react'
import { TelegramApiService, telegramUtils } from '../../services/telegramApi'

interface TelegramChatInputProps {
  value: string
  onChange: (chatId: string) => void
  label?: string
  placeholder?: string
  required?: boolean
  botToken?: string
  showValidation?: boolean
  className?: string
}

const TelegramChatInput: React.FC<TelegramChatInputProps> = ({
  value,
  onChange,
  label = "Telegram Chat",
  placeholder = "Enter @username or chat ID",
  required = false,
  botToken,
  showValidation = true,
  className = ""
}) => {
  const [inputValue, setInputValue] = useState('')
  const [validating, setValidating] = useState(false)
  const [validationStatus, setValidationStatus] = useState<'idle' | 'valid' | 'invalid' | 'error'>('idle')
  const [validationMessage, setValidationMessage] = useState('')
  const [chatInfo, setChatInfo] = useState<any>(null)

  // Initialize input value from prop
  useEffect(() => {
    if (value && !inputValue) {
      setInputValue(value)
    }
  }, [value])

  const validateInput = async (input: string) => {
    if (!input.trim()) {
      setValidationStatus('idle')
      setValidationMessage('')
      setChatInfo(null)
      return
    }

    if (!botToken) {
      setValidationStatus('error')
      setValidationMessage('Bot token not configured')
      return
    }

    setValidating(true)
    setValidationStatus('idle')
    
    try {
      const telegramApi = new TelegramApiService(botToken)
      const inputType = telegramUtils.getInputType(input)
      
      if (inputType === 'invalid') {
        setValidationStatus('invalid')
        setValidationMessage('Invalid format. Use @username or numeric chat ID')
        setChatInfo(null)
        return
      }

      let chatId: number | null = null
      
      if (inputType === 'username') {
        const cleanUsername = telegramUtils.cleanUsername(input)
        if (cleanUsername) {
          chatId = await telegramApi.getUserIdByUsername(cleanUsername)
          if (!chatId) {
            setValidationStatus('invalid')
            setValidationMessage('Username not found or not accessible')
            setChatInfo(null)
            return
          }
        }
      } else if (inputType === 'chatId') {
        chatId = telegramUtils.parseChatId(input)
      }

      if (chatId) {
        // Validate chat exists and is accessible
        const chat = await telegramApi.getChatById(chatId)
        if (chat) {
          setValidationStatus('valid')
          setValidationMessage(`✓ ${chat.title || chat.username || 'Chat'} (${telegramUtils.getChatTypeDescription(chatId)})`)
          setChatInfo(chat)
          
          // Update parent component with chat ID
          onChange(chatId.toString())
        } else {
          setValidationStatus('invalid')
          setValidationMessage('Chat not found or bot has no access')
          setChatInfo(null)
        }
      }
    } catch (error) {
      console.error('Validation error:', error)
      setValidationStatus('error')
      setValidationMessage('Error validating chat. Please try again.')
      setChatInfo(null)
    } finally {
      setValidating(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    
    // Debounce validation
    const timeoutId = setTimeout(() => {
      if (showValidation) {
        validateInput(newValue)
      } else {
        // Just update parent without validation
        onChange(newValue)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }

  const getValidationIcon = () => {
    if (validating) return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
    if (validationStatus === 'valid') return <Check className="w-4 h-4 text-green-500" />
    if (validationStatus === 'invalid') return <X className="w-4 h-4 text-red-500" />
    if (validationStatus === 'error') return <AlertCircle className="w-4 h-4 text-red-500" />
    return <MessageCircle className="w-4 h-4 text-telegram-hint" />
  }

  const getInputBorderColor = () => {
    if (validationStatus === 'valid') return 'border-green-500 focus:border-green-500'
    if (validationStatus === 'invalid' || validationStatus === 'error') return 'border-red-500 focus:border-red-500'
    return 'border-telegram-hint/30 focus:border-telegram-button'
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-telegram-text">
        <MessageCircle className="w-4 h-4 inline mr-1" />
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          className={`w-full pl-3 pr-10 py-2 border rounded-lg bg-telegram-secondary-bg text-telegram-text focus:outline-none transition-colors ${getInputBorderColor()}`}
          placeholder={placeholder}
          required={required}
        />
        
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {getValidationIcon()}
        </div>
      </div>

      {/* Validation Message */}
      {validationMessage && (
        <div className={`text-sm flex items-start space-x-1 ${
          validationStatus === 'valid' ? 'text-green-600' : 
          validationStatus === 'invalid' || validationStatus === 'error' ? 'text-red-600' : 
          'text-telegram-hint'
        }`}>
          <span>{validationMessage}</span>
        </div>
      )}

      {/* Chat Info Display */}
      {chatInfo && validationStatus === 'valid' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center space-x-2 text-sm">
            <Check className="w-4 h-4 text-green-500" />
            <div>
              <div className="font-medium text-green-800">
                {chatInfo.title || chatInfo.username || 'Chat Verified'}
              </div>
              <div className="text-green-600">
                ID: {chatInfo.id} • Type: {telegramUtils.getChatTypeDescription(chatInfo.id)}
              </div>
              {chatInfo.username && (
                <div className="text-green-600">
                  Username: @{chatInfo.username}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="text-xs text-telegram-hint flex items-start space-x-1">
        <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
        <div>
          <p>You can enter:</p>
          <ul className="list-disc list-inside ml-2 space-y-1">
            <li><strong>Username:</strong> @username or username</li>
            <li><strong>Chat ID:</strong> Numeric ID (positive for users, negative for groups)</li>
            <li><strong>Group/Channel:</strong> Add the bot as admin first</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default TelegramChatInput