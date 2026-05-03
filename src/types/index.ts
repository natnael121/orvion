export interface User {
  id: string
  firstName: string
  lastName: string
  username: string
  languageCode: string
  telegramId?: number
}

export interface UserData {
  uid: string
  id?: string // Add optional id field for compatibility
  email: string
  displayName?: string
  phone?: string
  bio?: string
  role: 'shop_owner' | 'admin'
  telegramId?: number
  telegram_id?: number // Add for compatibility with different field names
  telegramBotToken?: string
  telegramBotToken?: string
  profileCompleted?: boolean
  settings: {
    notifications: {
      email: boolean
      push: boolean
      telegram: boolean
    }
    telegram: {
      chatId: string
      username: string
      enableNotifications: boolean
    }
    theme: 'light' | 'dark' | 'auto'
    language: string
    timezone: string
  }
  businessInfo?: {
    name: string
    logo?: string
    description?: string
    address?: string
    phone?: string
    email?: string
    website?: string
    socialMedia?: {
      facebook?: string
      instagram?: string
      twitter?: string
      tiktok?: string
      youtube?: string
      whatsapp?: string
    }
    operatingHours?: {
      monday?: string
      tuesday?: string
      wednesday?: string
      thursday?: string
      friday?: string
      saturday?: string
      sunday?: string
    }
    features?: string[]
    specialMessage?: string
  }
  createdAt: Date
  updatedAt: Date
}

export interface ShopOwner {
  telegram_id: number
  first_name: string
  last_name: string
  username: string
  created_at: string
  updated_at: Date
  last_shop_id: string
  shops: {
    [shopId: string]: {
      last_interacted: Date
    }
  }
}

export interface Category {
  id: string
  userId: string
  shopId: string
  name: string
  description?: string
  image?: string
  color: string
  icon: string
  order: number
  isActive: boolean
  productCount?: number
  createdAt: Date
  updatedAt: Date
}

export interface Department {
  id: string
  userId: string
  shopId?: string
  name: string
  telegramChatId: string
  adminChatId?: string
  role: 'admin' | 'shop' | 'delivery'
  order: number
  icon: string
  isActive: boolean
  notificationTypes?: string[]
  createdAt: Date
  updatedAt: Date
}

export interface Shop {
  id: string
  ownerId: string
  name: string
  slug: string
  description: string
  logo?: string
  isActive: boolean
  businessInfo?: {
    name: string
    logo?: string
    description?: string
    address?: string
    phone?: string
    email?: string
    website?: string
    socialMedia?: {
      facebook?: string
      instagram?: string
      twitter?: string
      tiktok?: string
      youtube?: string
      whatsapp?: string
    }
    operatingHours?: {
      monday?: string
      tuesday?: string
      wednesday?: string
      thursday?: string
      friday?: string
      saturday?: string
      sunday?: string
    }
    features?: string[]
    specialMessage?: string
  }
  settings?: {
    currency: string
    taxRate: number
    businessHours: {
      open: string
      close: string
      days: string[]
    }
    orderSettings: {
      autoConfirm: boolean
      requirePayment: boolean
      allowCancellation: boolean
    }
  }
  stats?: {
    totalProducts: number
    totalOrders: number
    totalRevenue: number
    totalCustomers: number
  }
  createdAt: Date
  updatedAt: Date
}

export interface Product {
  id: string
  shopId: string
  name: string
  description: string
  price: number
  stock: number
  category: string
  subcategory?: string
  images: string[]
  sku?: string
  isActive: boolean
  lowStockAlert: number
  tags?: string[]
  featured?: boolean
  costPrice?: number
  weight?: number
  dimensions?: {
    length?: number
    width?: number
    height?: number
  }
  createdAt: Date
  updatedAt: Date
}

export interface OrderItem {
  productId: string
  productName: string
  quantity: number
  price: number
  total: number
  productImage?: string
  productSku?: string
}

export interface Order {
  id: string
  shopId: string
  customerId: string
  customerName: string
  customerPhone?: string
  customerEmail?: string
  items: OrderItem[]
  subtotal: number
  tax: number
  total: number
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered'
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'confirmation_required' | 'cancelled'
  deliveryMethod: 'pickup' | 'delivery'
  deliveryAddress?: string
  deliveryFee?: number
  estimatedDeliveryTime?: Date
  paymentPreference?: string
  paymentPhotoUrl?: string
  requiresPaymentConfirmation?: boolean
  customerNotes?: string
  source: 'web' | 'telegram'
  tableNumber?: string
  telegramId?: string
  telegramUsername?: string
  trackingNumber?: string
  createdAt: Date
  updatedAt: Date
  confirmedAt?: Date
  shippedAt?: Date
  deliveredAt?: Date
}

export type CustomerTag = 'VIP' | 'Wholesale' | 'Regular' | 'New'

export interface Customer {
  id: string
  shopId: string
  name: string
  email?: string
  phone?: string
  telegramId?: string
  telegramUsername?: string
  source: 'web' | 'telegram'
  tags: CustomerTag[]
  totalOrders: number
  totalSpent: number
  averageOrderValue: number
  lastOrderDate?: Date
  preferredDeliveryMethod?: 'pickup' | 'delivery'
  preferredPaymentMethod?: string
  deliveryAddresses?: string[]
  loyaltyPoints?: number
  loyaltyTier?: 'bronze' | 'silver' | 'gold' | 'platinum'
  createdAt: Date
  updatedAt: Date
}

export interface ShopCustomer {
  id: string
  customerId: string
  telegramId?: number
  shopId: string
  role: 'admin' | 'customer'
  createdAt: Date
  updatedAt: Date
}

export interface CRMContact {
  id: string
  shopId: string
  telegramId: number
  name: string
  username?: string
  phone?: string
  email?: string
  tags: string[]
  notes: string
  customFields: Record<string, any>
  lastContactedDate?: Date
  lastOrderDate?: Date
  activityStatus: 'active' | 'inactive'
  sourceLink?: string
  totalOrders: number
  totalSpent: number
  averageOrderValue: number
  createdAt: Date
  updatedAt: Date
  lastNoteUpdate?: Date
}

export interface CRMTag {
  id: string
  shopId: string
  name: string
  color: string
  description?: string
  createdAt: Date
  updatedAt: Date
}

export interface CRMMessageTemplate {
  id: string
  shopId: string
  name: string
  category?: string
  content: string
  variables: string[]
  createdAt: Date
  updatedAt: Date
}

export interface CRMAutoTagRule {
  id: string
  shopId: string
  pattern: string
  tags: string[]
  description?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CRMStats {
  totalCustomers: number
  activeThisWeek: number
  inactive30Plus: number
  topTags: Array<{ tag: string; count: number }>
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void
        expand: () => void
        close: () => void
        setHeaderColor: (color: string) => void
        setBackgroundColor: (color: string) => void
        MainButton: {
          text: string
          color: string
          textColor: string
          isVisible: boolean
          isActive: boolean
          show: () => void
          hide: () => void
          onClick: (callback: () => void) => void
          offClick: (callback: () => void) => void
        }
        BackButton: {
          isVisible: boolean
          show: () => void
          hide: () => void
          onClick: (callback: () => void) => void
          offClick: (callback: () => void) => void
        }
        initDataUnsafe?: {
          user?: {
            id: number
            first_name: string
            last_name?: string
            username?: string
            language_code?: string
          }
        }
      }
    }
  }
}