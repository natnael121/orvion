import React, { useEffect, useState } from 'react'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { useFirebase } from '../contexts/FirebaseContext'
import { useTelegram } from '../contexts/TelegramContext'
import { Shop, Product, Category, OrderItem } from '../types'
import ProductDetails from './ProductDetails'
import { 
  ArrowLeft, 
  Package, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Star, 
  MapPin, 
  Phone, 
  Globe, 
  Clock,
  Share2,
  ExternalLink
} from 'lucide-react'

interface ShopCatalogProps {
  shop: Shop
  onBack: () => void
  deepLinkedProductId?: string | null
}

const ShopCatalog: React.FC<ShopCatalogProps> = ({ shop, onBack, deepLinkedProductId }) => {
  const { db } = useFirebase()
  const { webApp } = useTelegram()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cart, setCart] = useState<OrderItem[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showCart, setShowCart] = useState(false)

  useEffect(() => {
    loadShopData()
  }, [shop.id])

  useEffect(() => {
    if (deepLinkedProductId && products.length > 0) {
      const product = products.find(p => p.id === deepLinkedProductId)
      if (product) {
        console.log('Opening deep-linked product:', product)
        setSelectedProduct(product)

        setTimeout(() => {
          const productElement = document.getElementById(`product-${deepLinkedProductId}`)
          if (productElement) {
            productElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 300)
      }
    }
  }, [deepLinkedProductId, products])

  const loadShopData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Load categories
      const categoriesRef = collection(db, 'categories')
      const categoriesQuery = query(
        categoriesRef,
        where('shopId', '==', shop.id),
        where('isActive', '==', true),
        orderBy('order', 'asc')
      )
      const categoriesSnapshot = await getDocs(categoriesQuery)
      
      const categoriesList: Category[] = []
      categoriesSnapshot.forEach((doc) => {
        const data = doc.data()
        categoriesList.push({
          id: doc.id,
          userId: data.userId,
          shopId: data.shopId,
          name: data.name,
          description: data.description,
          image: data.image,
          color: data.color,
          icon: data.icon,
          order: data.order || 0,
          isActive: data.isActive !== false,
          productCount: data.productCount || 0,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        })
      })
      
      setCategories(categoriesList)
      
      // Load products
      const productsRef = collection(db, 'products')
      const productsQuery = query(
        productsRef,
        where('shopId', '==', shop.id),
        where('isActive', '==', true),
        orderBy('name', 'asc')
      )
      const productsSnapshot = await getDocs(productsQuery)
      
      const productsList: Product[] = []
      productsSnapshot.forEach((doc) => {
        const data = doc.data()
        productsList.push({
          id: doc.id,
          shopId: data.shopId,
          name: data.name,
          description: data.description,
          price: data.price,
          stock: data.stock || 0,
          category: data.category,
          subcategory: data.subcategory,
          images: data.images || [],
          sku: data.sku,
          isActive: data.isActive !== false,
          lowStockAlert: data.lowStockAlert || 0,
          tags: data.tags || [],
          featured: data.featured || false,
          costPrice: data.costPrice,
          weight: data.weight,
          dimensions: data.dimensions,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        })
      })
      
      setProducts(productsList)
    } catch (error) {
      console.error('Error loading shop data:', error)
      setError('Failed to load shop catalog. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(product => product.category === selectedCategory)

  const addToCart = (product: Product, quantity: number = 1) => {
    const existingItem = cart.find(item => item.productId === product.id)
    if (existingItem) {
      setCart(cart.map(item => 
        item.productId === product.id 
          ? { ...item, quantity: item.quantity + quantity, total: (item.quantity + quantity) * item.price }
          : item
      ))
    } else {
      const newItem: OrderItem = {
        productId: product.id,
        productName: product.name,
        quantity,
        price: product.price,
        total: product.price * quantity,
        productImage: product.images?.[0],
        productSku: product.sku
      }
      setCart([...cart, newItem])
    }
  }

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(cart.filter(item => item.productId !== productId))
    } else {
      setCart(cart.map(item => 
        item.productId === productId 
          ? { ...item, quantity, total: quantity * item.price }
          : item
      ))
    }
  }

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + item.total, 0)
  }

  const getCartItemCount = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0)
  }

  const shareShop = () => {
    const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'YourBot'
    const shareUrl = `https://t.me/${botUsername}?startapp=${shop.id}`
    const shareText = `Check out ${shop.name}! 🛍️\n\n${shop.description}\n\n${shareUrl}`

    if (webApp?.openTelegramLink) {
      webApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`)
    } else if (navigator.share) {
      navigator.share({
        title: shop.name,
        text: shareText,
        url: shareUrl
      })
    } else {
      navigator.clipboard.writeText(shareText).then(() => {
        if (webApp?.showAlert) {
          webApp.showAlert('Shop link copied to clipboard!')
        } else {
          alert('Shop link copied to clipboard!')
        }
      })
    }
  }

  const getOperatingStatus = () => {
    if (!shop.settings?.businessHours) return 'Unknown'
    
    const now = new Date()
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'lowercase' })
    const currentTime = now.toTimeString().slice(0, 5)
    
    const { open, close, days } = shop.settings.businessHours
    
    if (!days.includes(currentDay)) return 'Closed'
    if (currentTime >= open && currentTime <= close) return 'Open'
    return 'Closed'
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-telegram-secondary-bg rounded w-3/4"></div>
          <div className="h-32 bg-telegram-secondary-bg rounded"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-telegram-secondary-bg rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-center py-12">
          <Package className="w-16 h-16 mx-auto text-telegram-hint mb-4" />
          <h3 className="text-lg font-medium text-telegram-text mb-2">Error Loading Catalog</h3>
          <p className="text-telegram-hint mb-4">{error}</p>
          <button
            onClick={loadShopData}
            className="bg-telegram-button text-telegram-button-text px-4 py-2 rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (showCart) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center space-x-3 mb-4">
          <button
            onClick={() => setShowCart(false)}
            className="p-2 rounded-lg bg-telegram-secondary-bg"
          >
            <ArrowLeft className="w-5 h-5 text-telegram-text" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-telegram-text">Shopping Cart</h2>
            <p className="text-sm text-telegram-hint">
              {cart.length} item{cart.length !== 1 ? 's' : ''} • ${getCartTotal().toFixed(2)}
            </p>
          </div>
        </div>

        {cart.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="w-16 h-16 mx-auto text-telegram-hint mb-4" />
            <h3 className="text-lg font-medium text-telegram-text mb-2">Your cart is empty</h3>
            <p className="text-telegram-hint">Add some products to get started!</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.productId} className="bg-telegram-secondary-bg rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-telegram-text">{item.productName}</h3>
                      <p className="text-sm text-telegram-hint">${item.price.toFixed(2)} each</p>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}
                          className="w-8 h-8 rounded-full bg-telegram-button text-telegram-button-text flex items-center justify-center"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="text-telegram-text font-medium w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                          className="w-8 h-8 rounded-full bg-telegram-button text-telegram-button-text flex items-center justify-center"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="text-right">
                        <div className="font-bold text-telegram-text">${item.total.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Order Summary */}
            <div className="bg-telegram-secondary-bg rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-telegram-text">
                <span>Subtotal:</span>
                <span>${getCartTotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-telegram-text">
                <span>Tax (10%):</span>
                <span>${(getCartTotal() * 0.1).toFixed(2)}</span>
              </div>
              <hr className="border-telegram-hint/20" />
              <div className="flex justify-between font-bold text-lg text-telegram-text">
                <span>Total:</span>
                <span>${(getCartTotal() * 1.1).toFixed(2)}</span>
              </div>
            </div>
            
            {/* Contact Shop Button */}
            <button
              onClick={() => {
                const message = `Hi! I'd like to place an order from ${shop.name}:\n\n${cart.map(item => `• ${item.productName} x${item.quantity} - $${item.total.toFixed(2)}`).join('\n')}\n\nTotal: $${(getCartTotal() * 1.1).toFixed(2)}`
                
                if (shop.businessInfo?.phone) {
                  window.open(`https://wa.me/${shop.businessInfo.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank')
                } else if (webApp?.openTelegramLink) {
                  webApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(message)}`)
                }
              }}
              className="w-full bg-telegram-button text-telegram-button-text py-3 rounded-lg font-semibold"
            >
              Contact Shop to Order
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-telegram-secondary-bg p-4">
        <div className="flex items-center space-x-3 mb-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg bg-telegram-bg"
          >
            <ArrowLeft className="w-5 h-5 text-telegram-text" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-telegram-text">{shop.name}</h1>
            <div className="flex items-center space-x-2 mt-1">
              <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                getOperatingStatus() === 'Open' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-orange-100 text-orange-700'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  getOperatingStatus() === 'Open' ? 'bg-green-500' : 'bg-orange-500'
                }`} />
                <span>{getOperatingStatus()}</span>
              </div>
              <button
                onClick={shareShop}
                className="p-1 text-telegram-button hover:bg-telegram-button hover:text-telegram-button-text rounded"
                title="Share Shop"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {cart.length > 0 && (
            <button
              onClick={() => setShowCart(true)}
              className="relative p-2 rounded-lg bg-telegram-button text-telegram-button-text"
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {getCartItemCount()}
              </span>
            </button>
          )}
        </div>
        
        <p className="text-telegram-hint text-sm mb-3">{shop.description}</p>
        
        {/* Business Info */}
        {shop.businessInfo && (
          <div className="flex flex-wrap gap-3 text-xs text-telegram-hint">
            {shop.businessInfo.address && (
              <div className="flex items-center space-x-1">
                <MapPin className="w-3 h-3" />
                <span>{shop.businessInfo.address}</span>
              </div>
            )}
            {shop.businessInfo.phone && (
              <div className="flex items-center space-x-1">
                <Phone className="w-3 h-3" />
                <span>{shop.businessInfo.phone}</span>
              </div>
            )}
            {shop.businessInfo.website && (
              <a 
                href={shop.businessInfo.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center space-x-1 text-telegram-button"
              >
                <Globe className="w-3 h-3" />
                <span>Website</span>
                <ExternalLink className="w-2 h-2" />
              </a>
            )}
            {shop.settings?.businessHours && (
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>
                  {shop.settings.businessHours.open} - {shop.settings.businessHours.close}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Category Filters */}
      <div className="px-3 py-2 sticky top-0 bg-telegram-bg z-10 border-b border-telegram-hint/10">
        <div className="flex space-x-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-telegram-button text-telegram-button-text shadow-md'
                : 'bg-telegram-secondary-bg text-telegram-text'
            }`}
          >
            All ({products.length})
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.name)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap flex items-center space-x-1.5 transition-all ${
                selectedCategory === category.name
                  ? 'bg-telegram-button text-telegram-button-text shadow-md'
                  : 'bg-telegram-secondary-bg text-telegram-text'
              }`}
            >
              <span>{category.icon}</span>
              <span>{category.name}</span>
              <span className="text-xs opacity-70">({products.filter(p => p.category === category.name).length})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="px-3 py-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredProducts.map((product) => {
            const cartItem = cart.find(item => item.productId === product.id)
            const isOutOfStock = product.stock === 0

            return (
              <div
                key={product.id}
                id={`product-${product.id}`}
                className="bg-telegram-secondary-bg rounded-lg overflow-hidden flex flex-col shadow-sm"
              >
                <div
                  className="relative w-full pt-[100%] bg-gray-300 cursor-pointer overflow-hidden"
                  onClick={() => setSelectedProduct(product)}
                >
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="absolute top-0 left-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
                      <Package className="w-10 h-10 text-telegram-hint" />
                    </div>
                  )}
                  {product.featured && (
                    <div className="absolute top-1.5 right-1.5 bg-yellow-500 rounded-full p-1">
                      <Star className="w-3 h-3 text-white fill-current" />
                    </div>
                  )}
                  {isOutOfStock && (
                    <div className="absolute top-1.5 left-1.5 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                      Out
                    </div>
                  )}
                </div>

                <div className="p-2 flex flex-col flex-1">
                  <h3
                    className="font-semibold text-telegram-text text-xs line-clamp-2 cursor-pointer mb-1 min-h-[2rem]"
                    onClick={() => setSelectedProduct(product)}
                  >
                    {product.name}
                  </h3>

                  <div className="mt-auto space-y-1.5">
                    <div className="text-base font-bold text-telegram-button">
                      ${product.price.toFixed(2)}
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => setSelectedProduct(product)}
                        className="flex-1 bg-telegram-secondary-bg text-telegram-text px-2 py-1.5 rounded-lg text-xs font-medium hover:bg-telegram-hint hover:bg-opacity-10 transition-colors"
                      >
                        Details
                      </button>

                      {!isOutOfStock ? (
                        cartItem ? (
                          <div className="flex items-center bg-telegram-bg rounded-lg">
                            <button
                              onClick={() => updateCartQuantity(product.id, cartItem.quantity - 1)}
                              className="w-7 h-7 rounded-l-lg bg-telegram-button text-telegram-button-text flex items-center justify-center"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-telegram-text font-medium text-xs px-2">{cartItem.quantity}</span>
                            <button
                              onClick={() => updateCartQuantity(product.id, cartItem.quantity + 1)}
                              className="w-7 h-7 rounded-r-lg bg-telegram-button text-telegram-button-text flex items-center justify-center"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(product)}
                            className="w-7 h-7 rounded-lg bg-telegram-button text-telegram-button-text flex items-center justify-center"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )
                      ) : (
                        <button
                          disabled
                          className="w-7 h-7 rounded-lg bg-gray-300 text-gray-500 flex items-center justify-center cursor-not-allowed"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      
      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-16 h-16 mx-auto text-telegram-hint mb-4" />
          <h3 className="text-lg font-medium text-telegram-text mb-2">No Products Found</h3>
          <p className="text-telegram-hint">
            {selectedCategory === 'all' 
              ? 'This shop has no products yet.' 
              : `No products found in the ${selectedCategory} category.`
            }
          </p>
        </div>
      )} 

      {/* Product Details Modal */}
      {selectedProduct && (
        <ProductDetails
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={addToCart}
          cartItem={cart.find(item => item.productId === selectedProduct.id)}
          onUpdateCartQuantity={updateCartQuantity}
          shopId={shop.id}
          shopName={shop.name}
          onCheckout={() => {
            setSelectedProduct(null)
            setShowCart(true)
          }}
        />
      )}
    </div>
  )
}

export default ShopCatalog