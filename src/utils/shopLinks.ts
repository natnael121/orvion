/**
 * Utility functions for generating and handling shop-specific Mini App links
 */

export interface ShopLinkOptions {
  botUsername?: string
  includeDescription?: boolean
  customMessage?: string
  productId?: string
}

export const shopLinkUtils = {
  /**
   * Generate a shop-specific Mini App link
   * @param shopId - The shop ID
   * @param options - Additional options for link generation
   * @returns The complete Telegram Mini App link
   */
  generateShopLink(shopId: string, options: ShopLinkOptions = {}): string {
    const botUsername = options.botUsername || import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'YourBot'
    const startParam = options.productId ? `${shopId}_${options.productId}` : shopId
    return `https://t.me/${botUsername}?startapp=${startParam}`
  },

  /**
   * Generate a shareable message for a shop
   * @param shop - The shop object
   * @param options - Additional options for message generation
   * @returns The formatted share message
   */
  generateShareMessage(shop: any, options: ShopLinkOptions = {}): string {
    const link = this.generateShopLink(shop.id, options)
    const customMessage = options.customMessage || ''
    
    let message = `🛍️ **${shop.name}**\n\n`
    
    if (options.includeDescription && shop.description) {
      message += `${shop.description}\n\n`
    }
    
    if (customMessage) {
      message += `${customMessage}\n\n`
    }
    
    // Add business info if available
    if (shop.businessInfo) {
      if (shop.businessInfo.address) {
        message += `📍 ${shop.businessInfo.address}\n`
      }
      if (shop.businessInfo.phone) {
        message += `📞 ${shop.businessInfo.phone}\n`
      }
      if (shop.businessInfo.website) {
        message += `🌐 ${shop.businessInfo.website}\n`
      }
      message += '\n'
    }
    
    // Add operating hours if available
    if (shop.settings?.businessHours) {
      const { open, close, days } = shop.settings.businessHours
      if (days && days.length > 0) {
        message += `🕒 Open: ${open} - ${close}\n`
        message += `📅 Days: ${days.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')}\n\n`
      }
    }
    
    message += `🚀 Browse our catalog: ${link}`
    
    return message
  },

  /**
   * Parse shop ID and optional product ID from a Mini App link
   * @param link - The Telegram Mini App link
   * @returns Object with shopId and optional productId
   */
  parseIdsFromLink(link: string): { shopId: string | null; productId: string | null } {
    try {
      const url = new URL(link)
      const startParam = url.searchParams.get('startapp') || url.searchParams.get('start')

      if (!startParam) {
        return { shopId: null, productId: null }
      }

      const parts = startParam.split('_')
      return {
        shopId: parts[0],
        productId: parts[1] || null
      }
    } catch (error) {
      console.error('Error parsing shop link:', error)
      return { shopId: null, productId: null }
    }
  },

  /**
   * Validate if a link is a valid shop Mini App link
   * @param link - The link to validate
   * @returns True if valid, false otherwise
   */
  isValidShopLink(link: string): boolean {
    try {
      const url = new URL(link)
      return url.hostname === 't.me' && (url.searchParams.has('startapp') || url.searchParams.has('start'))
    } catch (error) {
      return false
    }
  },

  /**
   * Generate QR code URL for a shop link (using a free QR service)
   * @param shopId - The shop ID
   * @param options - Additional options including optional productId
   * @returns QR code image URL
   */
  generateQRCodeUrl(shopId: string, options: ShopLinkOptions = {}): string {
    const link = this.generateShopLink(shopId, options)
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}`
  },

  /**
   * Copy shop link to clipboard with fallback
   * @param shopId - The shop ID
   * @param shopName - The shop name for success message
   * @param options - Additional options including optional productId
   */
  async copyShopLinkToClipboard(shopId: string, shopName: string, options: ShopLinkOptions = {}): Promise<void> {
    const link = this.generateShopLink(shopId, options)
    const itemType = options.productId ? 'Product link' : `${shopName} link`

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(link)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = link
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }

      if (window.Telegram?.WebApp?.showAlert) {
        window.Telegram.WebApp.showAlert(`${itemType} copied to clipboard!`)
      } else {
        alert(`${itemType} copied to clipboard!`)
      }
    } catch (error) {
      console.error('Error copying to clipboard:', error)
      throw error
    }
  },

  /**
   * Generate shareable message for a product
   * @param product - The product object
   * @param shop - The shop object
   * @param options - Additional options
   * @returns The formatted share message
   */
  generateProductShareMessage(product: any, shop: any, options: ShopLinkOptions = {}): string {
    const link = this.generateShopLink(shop.id, { ...options, productId: product.id })
    const customMessage = options.customMessage || ''

    let message = `🛍️ ${product.name}\n\n`

    if (product.description) {
      const shortDesc = product.description.length > 100
        ? `${product.description.substring(0, 100)}...`
        : product.description
      message += `${shortDesc}\n\n`
    }

    message += `💰 Price: $${product.price.toFixed(2)}\n`

    if (product.stock > 0) {
      message += `📦 In Stock\n`
    } else {
      message += `❌ Out of Stock\n`
    }

    message += `\n🏪 From: ${shop.name}\n`

    if (customMessage) {
      message += `\n${customMessage}\n`
    }

    message += `\n${link}`

    return message
  }
}