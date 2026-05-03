import React, { useState } from 'react'
import { Store, Mail, Lock, User, Eye, EyeOff, MessageCircle, Info, ExternalLink } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export default function AuthForm() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showTelegramHelp, setShowTelegramHelp] = useState(false)
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    telegramId: ''
  })

  const { signIn, signUp } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isSignUp) {
        await signUp(formData.email, formData.password, formData.displayName, formData.telegramId)
      } else {
        await signIn(formData.email, formData.password)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const openTelegramBot = () => {
    window.open('https://t.me/userinfobot', '_blank')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-telegram-button/10 via-telegram-bg to-telegram-secondary-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="h-16 w-16 bg-telegram-button rounded-2xl flex items-center justify-center">
              <Store className="h-8 w-8 text-telegram-button-text" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-telegram-text">
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </h2>
          <p className="mt-2 text-sm text-telegram-hint">
            {isSignUp ? 'Start managing your shops today' : 'Access your shop management dashboard'}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {isSignUp && (
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-telegram-text mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-telegram-hint" />
                  </div>
                  <input
                    id="displayName"
                    name="displayName"
                    type="text"
                    required={isSignUp}
                    value={formData.displayName}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-3 py-3 border border-telegram-hint/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram-button focus:border-transparent transition-colors duration-200 bg-telegram-secondary-bg text-telegram-text"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>
            )}

            {isSignUp && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="telegramId" className="block text-sm font-medium text-telegram-text">
                    Telegram ID (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowTelegramHelp(!showTelegramHelp)}
                    className="text-telegram-button hover:text-telegram-button/80 transition-colors"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MessageCircle className="h-5 w-5 text-telegram-hint" />
                  </div>
                  <input
                    id="telegramId"
                    name="telegramId"
                    type="number"
                    value={formData.telegramId}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-3 py-3 border border-telegram-hint/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram-button focus:border-transparent transition-colors duration-200 bg-telegram-secondary-bg text-telegram-text"
                    placeholder="Enter your Telegram ID (optional)"
                  />
                </div>
                
                {showTelegramHelp && (
                  <div className="mt-3 p-4 bg-telegram-button/10 border border-telegram-button/20 rounded-lg">
                    <h4 className="text-sm font-medium text-telegram-text mb-2">How to get your Telegram ID:</h4>
                    <ol className="text-xs text-telegram-hint space-y-1 list-decimal list-inside">
                      <li>Open Telegram and search for @userinfobot</li>
                      <li>Start a chat with the bot</li>
                      <li>Send any message to the bot</li>
                      <li>The bot will reply with your user information including your ID</li>
                      <li>Copy the ID number and paste it here</li>
                    </ol>
                    <button
                      type="button"
                      onClick={openTelegramBot}
                      className="mt-3 inline-flex items-center space-x-1 text-telegram-button hover:text-telegram-button/80 transition-colors text-sm"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>Open @userinfobot</span>
                    </button>
                  </div>
                )}
                
                <p className="mt-1 text-xs text-telegram-hint">
                  Adding your Telegram ID enables notifications and better integration
                </p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-telegram-text mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-telegram-hint" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="block w-full pl-10 pr-3 py-3 border border-telegram-hint/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram-button focus:border-transparent transition-colors duration-200 bg-telegram-secondary-bg text-telegram-text"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-telegram-text mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-telegram-hint" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="block w-full pl-10 pr-10 py-3 border border-telegram-hint/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram-button focus:border-transparent transition-colors duration-200 bg-telegram-secondary-bg text-telegram-text"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-telegram-hint" />
                  ) : (
                    <Eye className="h-5 w-5 text-telegram-hint" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-telegram-button-text bg-telegram-button hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-telegram-button disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-telegram-button-text border-t-transparent rounded-full animate-spin" />
            ) : (
              isSignUp ? 'Create Account' : 'Sign In'
            )}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-telegram-button hover:opacity-80 font-medium transition-opacity"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}