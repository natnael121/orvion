export interface TelegramBotConfig {
  botToken: string
  chatId: string
}

export interface PromotionMessage {
  text: string
  images?: string[]
  parseMode?: 'HTML' | 'Markdown'
  replyMarkup?: any
}

const TELEGRAM_PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-proxy`

async function callTelegramApi(botToken: string, method: string, params: any) {
  const response = await fetch(TELEGRAM_PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      botToken,
      method,
      params
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Edge function error:', errorText)
    throw new Error(`Edge function error! status: ${response.status}`)
  }

  const result = await response.json()

  // Return the result without throwing - let callers handle migration
  return result
}

export const telegramService = {
  async sendPromotionMessage(
    config: TelegramBotConfig,
    message: PromotionMessage
  ): Promise<boolean> {
    try {
      const { botToken, chatId } = config

      if (!botToken) {
        throw new Error('Bot token is required')
      }

      if (!chatId) {
        throw new Error('Chat ID is required')
      }

      console.log('Sending promotion message to:', chatId)

      // Convert username to chat ID if needed
      let finalChatId = chatId
      if (chatId.startsWith('@') || !/^-?\d+$/.test(chatId)) {
        console.log('Converting username to chat ID:', chatId)
        // This is a username, try to convert it
        const telegramApi = new (await import('./telegramApi')).TelegramApiService(botToken)
        const convertedId = await telegramApi.getUserIdByUsername(chatId)
        if (convertedId) {
          finalChatId = convertedId.toString()
          console.log('Converted to chat ID:', finalChatId)
        } else {
          const error = `Could not convert username to chat ID: ${chatId}. Make sure the bot has access to this chat.`
          console.error(error)
          throw new Error(error)
        }
      }

      if (message.images && message.images.length > 0) {
        // Send as media group if multiple images
        if (message.images.length > 1) {
          const media = message.images.map((url, index) => ({
            type: 'photo',
            media: url,
            caption: index === 0 ? message.text : undefined,
            parse_mode: message.parseMode || 'HTML'
          }))

          const result = await callTelegramApi(botToken, 'sendMediaGroup', {
            chat_id: finalChatId,
            media: media
          })
          if (!result.ok) {
            console.error('Telegram API error:', result)

            // Handle chat migration (group upgraded to supergroup)
            if (result.error_code === 400 && result.parameters?.migrate_to_chat_id) {
              const newChatId = result.parameters.migrate_to_chat_id
              console.log(`Chat migrated from ${finalChatId} to ${newChatId}, retrying...`)

              // Retry with new chat ID
              const retryResult = await callTelegramApi(botToken, 'sendMediaGroup', {
                chat_id: newChatId,
                media: media
              })

              if (!retryResult.ok) {
                throw new Error(retryResult.description || 'Failed to send media group after migration')
              }

              console.log(`Successfully sent to migrated chat: ${newChatId}`)
              console.warn(`IMPORTANT: Update your department chat ID from ${finalChatId} to ${newChatId}`)
              return true
            }

            throw new Error(result.description || 'Failed to send media group')
          }
          return true
        } else {
          // Send single photo with caption
          const result = await callTelegramApi(botToken, 'sendPhoto', {
            chat_id: finalChatId,
            photo: message.images[0],
            caption: message.text,
            parse_mode: message.parseMode || 'HTML',
            reply_markup: message.replyMarkup
          })
          if (!result.ok) {
            console.error('Telegram API error:', result)

            // Handle chat migration (group upgraded to supergroup)
            if (result.error_code === 400 && result.parameters?.migrate_to_chat_id) {
              const newChatId = result.parameters.migrate_to_chat_id
              console.log(`Chat migrated from ${finalChatId} to ${newChatId}, retrying...`)

              // Retry with new chat ID
              const retryResult = await callTelegramApi(botToken, 'sendPhoto', {
                chat_id: newChatId,
                photo: message.images[0],
                caption: message.text,
                parse_mode: message.parseMode || 'HTML',
                reply_markup: message.replyMarkup
              })

              if (!retryResult.ok) {
                throw new Error(retryResult.description || 'Failed to send photo after migration')
              }

              console.log(`Successfully sent to migrated chat: ${newChatId}`)
              console.warn(`IMPORTANT: Update your department chat ID from ${finalChatId} to ${newChatId}`)
              return true
            }

            throw new Error(result.description || 'Failed to send photo')
          }
          return true
        }
      } else {
        // Send text message only
        const result = await callTelegramApi(botToken, 'sendMessage', {
          chat_id: finalChatId,
          text: message.text,
          parse_mode: message.parseMode || 'HTML',
          reply_markup: message.replyMarkup
        })
        if (!result.ok) {
          console.error('Telegram API error:', result)

          // Handle chat migration (group upgraded to supergroup)
          if (result.error_code === 400 && result.parameters?.migrate_to_chat_id) {
            const newChatId = result.parameters.migrate_to_chat_id
            console.log(`Chat migrated from ${finalChatId} to ${newChatId}, retrying...`)

            // Retry with new chat ID
            const retryResult = await callTelegramApi(botToken, 'sendMessage', {
              chat_id: newChatId,
              text: message.text,
              parse_mode: message.parseMode || 'HTML',
              reply_markup: message.replyMarkup
            })

            if (!retryResult.ok) {
              throw new Error(retryResult.description || 'Failed to send message after migration')
            }

            console.log(`Successfully sent to migrated chat: ${newChatId}`)
            console.warn(`IMPORTANT: Update your department chat ID from ${finalChatId} to ${newChatId}`)
            return true
          }

          throw new Error(result.description || 'Failed to send message')
        }
        return true
      }
    } catch (error) {
      console.error('Error sending Telegram message:', error)
      throw error
    }
  },

  async scheduleMessage(
    config: TelegramBotConfig,
    message: PromotionMessage,
    scheduledDate: Date
  ): Promise<boolean> {
    // For now, we'll store scheduled messages in localStorage
    // In a real app, you'd want to use a proper scheduling service
    const scheduledMessages = JSON.parse(
      localStorage.getItem('scheduledPromotions') || '[]'
    )

    const scheduledPromotion = {
      id: Date.now().toString(),
      config,
      message,
      scheduledDate: scheduledDate.toISOString(),
      status: 'scheduled'
    }

    scheduledMessages.push(scheduledPromotion)
    localStorage.setItem('scheduledPromotions', JSON.stringify(scheduledMessages))

    // Set timeout for immediate scheduling (for demo purposes)
    const timeUntilSend = scheduledDate.getTime() - Date.now()
    if (timeUntilSend > 0 && timeUntilSend < 24 * 60 * 60 * 1000) { // Within 24 hours
      setTimeout(async () => {
        const success = await this.sendPromotionMessage(config, message)
        if (success) {
          // Update status in localStorage
          const updatedMessages = JSON.parse(
            localStorage.getItem('scheduledPromotions') || '[]'
          )
          const messageIndex = updatedMessages.findIndex(
            (m: any) => m.id === scheduledPromotion.id
          )
          if (messageIndex !== -1) {
            updatedMessages[messageIndex].status = 'sent'
            localStorage.setItem('scheduledPromotions', JSON.stringify(updatedMessages))
          }
        }
      }, timeUntilSend)
    }

    return true
  }
}
