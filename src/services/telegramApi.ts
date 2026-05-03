export interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  is_bot: boolean
}

export interface TelegramChat {
  id: number
  type: 'private' | 'group' | 'supergroup' | 'channel'
  title?: string
  username?: string
}

export class TelegramApiService {
  private botToken: string

  constructor(botToken: string) {
    this.botToken = botToken
  }

  private get baseUrl() {
    return `https://api.telegram.org/bot${this.botToken}`
  }

  /**
   * Convert Telegram username to chat ID
   * @param username - Username without @ symbol
   * @returns Promise<number | null> - Chat ID or null if not found
   */
  async getUserIdByUsername(username: string): Promise<number | null> {
    try {
      // Remove @ symbol if present
      const cleanUsername = username.replace('@', '')
      
      // Try to get chat info by username
      const response = await fetch(`${this.baseUrl}/getChat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: `@${cleanUsername}`
        })
      })

      const result = await response.json()
      
      if (result.ok && result.result) {
        return result.result.id
      }
      
      return null
    } catch (error) {
      console.error('Error getting user ID by username:', error)
      return null
    }
  }

  /**
   * Get chat information by ID
   * @param chatId - Telegram chat ID
   * @returns Promise<TelegramChat | null>
   */
  async getChatById(chatId: number): Promise<TelegramChat | null> {
    try {
      const response = await fetch(`${this.baseUrl}/getChat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId
        })
      })

      const result = await response.json()
      
      if (result.ok && result.result) {
        return result.result
      }
      
      return null
    } catch (error) {
      console.error('Error getting chat by ID:', error)
      return null
    }
  }

  /**
   * Validate if a chat ID exists and is accessible
   * @param chatId - Telegram chat ID
   * @returns Promise<boolean>
   */
  async validateChatId(chatId: number): Promise<boolean> {
    const chat = await this.getChatById(chatId)
    return chat !== null
  }

  /**
   * Send a test message to validate chat access
   * @param chatId - Telegram chat ID
   * @returns Promise<boolean>
   */
  async testChatAccess(chatId: number): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: '🤖 Bot connection test - This message confirms the bot can send messages to this chat.',
          disable_notification: true
        })
      })

      const result = await response.json()
      return result.ok
    } catch (error) {
      console.error('Error testing chat access:', error)
      return false
    }
  }
}

// Utility functions for username/ID conversion
export const telegramUtils = {
  /**
   * Check if input is a username or chat ID
   * @param input - User input (username or chat ID)
   * @returns 'username' | 'chatId' | 'invalid'
   */
  getInputType(input: string): 'username' | 'chatId' | 'invalid' {
    const trimmed = input.trim()
    
    // Check if it's a chat ID (number, can be negative for groups)
    if (/^-?\d+$/.test(trimmed)) {
      return 'chatId'
    }
    
    // Check if it's a username (starts with @ or just alphanumeric)
    if (/^@?[a-zA-Z0-9_]{5,32}$/.test(trimmed)) {
      return 'username'
    }
    
    return 'invalid'
  },

  /**
   * Clean username input (remove @ symbol, validate format)
   * @param username - Raw username input
   * @returns Cleaned username or null if invalid
   */
  cleanUsername(username: string): string | null {
    const trimmed = username.trim().replace('@', '')
    
    if (/^[a-zA-Z0-9_]{5,32}$/.test(trimmed)) {
      return trimmed
    }
    
    return null
  },

  /**
   * Parse chat ID from string
   * @param chatId - Chat ID as string
   * @returns Parsed chat ID or null if invalid
   */
  parseChatId(chatId: string): number | null {
    const trimmed = chatId.trim()
    const parsed = parseInt(trimmed, 10)
    
    if (!isNaN(parsed) && parsed.toString() === trimmed) {
      return parsed
    }
    
    return null
  },

  /**
   * Format chat ID for display
   * @param chatId - Telegram chat ID
   * @returns Formatted string
   */
  formatChatId(chatId: number): string {
    return chatId.toString()
  },

  /**
   * Get chat type description
   * @param chatId - Telegram chat ID
   * @returns Description of chat type
   */
  getChatTypeDescription(chatId: number): string {
    if (chatId > 0) {
      return 'Private Chat'
    } else if (chatId > -1000000000000) {
      return 'Group Chat'
    } else {
      return 'Supergroup/Channel'
    }
  }
}