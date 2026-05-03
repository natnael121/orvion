import React, { useState } from 'react'
import { Product, OrderItem } from '../types'
import {
  X,
  Star,
  Package,
  ShoppingCart,
  Plus,
  Minus,
  ArrowLeft,
  ArrowRight,
  Heart,
  Info,
  Truck,
  Shield,
  Clock,
  Share2
} from 'lucide-react'
import { shopLinkUtils } from '../utils/shopLinks'

interface ProductDetailsProps {
  product: Product
  onClose: () => void
  onAddToCart: (product: Product, quantity: number) => void
  cartItem?: OrderItem
  onUpdateCartQuantity?: (productId: string, quantity: number) => void
  shopId?: string
  shopName?: string
  onCheckout?: () => void
}

const ProductDetails: React.FC<ProductDetailsProps> = ({
  product,
  onClose,
  onAddToCart,
  cartItem,
  onUpdateCartQuantity,
  shopId,
  shopName,
  onCheckout
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [quantity, setQuantity] = useState(cartItem?.quantity || 1)
  const [showFullDescription, setShowFullDescription] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'specs' | 'reviews'>('details')

  const images = product.images && product.images.length > 0 ? product.images : ['/placeholder-product.jpg']
  const isLowStock = product.stock <= product.lowStockAlert
  const isOutOfStock = product.stock === 0

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity < 1) return
    if (newQuantity > product.stock) return
    
    setQuantity(newQuantity)
    
    if (cartItem && onUpdateCartQuantity) {
      onUpdateCartQuantity(product.id, newQuantity)
    }
  }

  const handleAddToCart = () => {
    if (!isOutOfStock) {
      onAddToCart(product, quantity)
    }
  }

  const handleCheckout = () => {
    if (onCheckout) {
      onCheckout()
    }
  }

  const nextImage = () => {
    setSelectedImageIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setSelectedImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`
  }

  const calculateSavings = () => {
    if (product.costPrice && product.costPrice > 0) {
      const savings = ((product.costPrice - product.price) / product.costPrice * 100)
      return savings > 0 ? savings.toFixed(0) : null
    }
    return null
  }

  const handleShareProduct = async () => {
    if (!shopId || !shopName) return

    const productLink = shopLinkUtils.generateShopLink(shopId, { productId: product.id })
    const shareMessage = shopLinkUtils.generateProductShareMessage(product, { id: shopId, name: shopName }, {})
    const productImage = product.images && product.images.length > 0 ? product.images[0] : null

    if (window.Telegram?.WebApp) {
      if (window.Telegram.WebApp.openTelegramLink) {
        const messageToShare = productImage
          ? `${productImage}\n\n${shareMessage}`
          : shareMessage

        window.Telegram.WebApp.openTelegramLink(
          `https://t.me/share/url?url=${encodeURIComponent(productLink)}&text=${encodeURIComponent(messageToShare)}`
        )
      } else {
        const fullMessage = productImage
          ? `${productImage}\n\n${shareMessage}`
          : shareMessage

        await navigator.clipboard.writeText(fullMessage)

        if (window.Telegram.WebApp.showAlert) {
          window.Telegram.WebApp.showAlert('Product info copied! Paste in any chat to share.')
        }
      }
    } else if (navigator.share) {
      try {
        const shareData: any = {
          title: product.name,
          text: shareMessage
        }

        if (productImage) {
          try {
            const response = await fetch(productImage)
            const blob = await response.blob()
            const file = new File([blob], 'product.jpg', { type: blob.type })
            shareData.files = [file]
          } catch (err) {
            console.log('Could not fetch image for sharing:', err)
          }
        }

        await navigator.share(shareData)
      } catch (err) {
        console.log('Share cancelled or failed:', err)
      }
    } else {
      const fullMessage = productImage
        ? `${productImage}\n\n${shareMessage}`
        : shareMessage

      await navigator.clipboard.writeText(fullMessage)
      alert('Product info copied to clipboard!')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center">
      <div className="bg-telegram-bg rounded-t-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-telegram-bg border-b border-telegram-hint/20 p-4 flex items-center justify-between z-10">
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-telegram-secondary-bg"
          >
            <X className="w-5 h-5 text-telegram-text" />
          </button>
          
          <div className="flex items-center space-x-2">
            <button className="p-2 rounded-full bg-telegram-secondary-bg">
              <Heart className="w-5 h-5 text-telegram-hint" />
            </button>
            {shopId && shopName && (
              <button
                onClick={handleShareProduct}
                className="p-2 rounded-full bg-telegram-secondary-bg hover:bg-telegram-button hover:text-telegram-button-text transition-colors"
                title="Share Product"
              >
                <Share2 className="w-5 h-5 text-telegram-button" />
              </button>
            )}
          </div>
        </div>

        {/* Image Gallery */}
        <div className="relative">
          <div className="aspect-square bg-gray-100 relative overflow-hidden">
            <img
              src={images[selectedImageIndex]}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = '/placeholder-product.jpg'
              }}
            />
            
            {/* Image Navigation */}
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full bg-black bg-opacity-50 text-white"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full bg-black bg-opacity-50 text-white"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
                
                {/* Image Indicators */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`w-2 h-2 rounded-full ${
                        index === selectedImageIndex ? 'bg-white' : 'bg-white bg-opacity-50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-col space-y-2">
              {product.featured && (
                <span className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center">
                  <Star className="w-3 h-3 mr-1 fill-current" />
                  Featured
                </span>
              )}
              {isLowStock && !isOutOfStock && (
                <span className="bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                  Low Stock
                </span>
              )}
              {isOutOfStock && (
                <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                  Out of Stock
                </span>
              )}
              {calculateSavings() && (
                <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                  {calculateSavings()}% OFF
                </span>
              )}
            </div>
          </div>

          {/* Thumbnail Strip */}
          {images.length > 1 && (
            <div className="flex space-x-2 p-4 overflow-x-auto">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${
                    index === selectedImageIndex ? 'border-telegram-button' : 'border-transparent'
                  }`}
                >
                  <img
                    src={image}
                    alt={`${product.name} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="p-4 space-y-4">
          {/* Title and Price */}
          <div>
            <div className="flex items-start justify-between mb-2">
              <h1 className="text-xl font-bold text-telegram-text flex-1 pr-2">
                {product.name}
              </h1>
              <div className="text-right">
                <div className="text-2xl font-bold text-telegram-button">
                  {formatPrice(product.price)}
                </div>
                {product.costPrice && product.costPrice > product.price && (
                  <div className="text-sm text-telegram-hint line-through">
                    {formatPrice(product.costPrice)}
                  </div>
                )}
              </div>
            </div>
            
            {/* Category and SKU */}
            <div className="flex items-center space-x-4 text-sm text-telegram-hint">
              <span className="capitalize">{product.category}</span>
              {product.sku && (
                <>
                  <span>•</span>
                  <span>SKU: {product.sku}</span>
                </>
              )}
            </div>
          </div>

          {/* Stock Status */}
          <div className="flex items-center space-x-2">
            <Package className="w-4 h-4 text-telegram-hint" />
            <span className={`text-sm font-medium ${
              isOutOfStock ? 'text-red-500' : 
              isLowStock ? 'text-orange-500' : 'text-green-500'
            }`}>
              {isOutOfStock ? 'Out of Stock' : 
               isLowStock ? `Only ${product.stock} left` : 
               `${product.stock} in stock`}
            </span>
          </div>

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.tags.map((tag, index) => (
                <span
                  key={index}
                  className="bg-telegram-button bg-opacity-10 text-telegram-button px-2 py-1 rounded-full text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-telegram-hint/20">
            <div className="flex space-x-6">
              {[
                { id: 'details', label: 'Details' },
                { id: 'specs', label: 'Specs' },
                { id: 'reviews', label: 'Reviews' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-telegram-button text-telegram-button'
                      : 'border-transparent text-telegram-hint'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="min-h-[100px]">
            {activeTab === 'details' && (
              <div className="space-y-3">
                <div>
                  <h3 className="font-medium text-telegram-text mb-2 flex items-center">
                    <Info className="w-4 h-4 mr-2" />
                    Description
                  </h3>
                  <div className="text-telegram-hint text-sm">
                    {showFullDescription ? (
                      <p>{product.description}</p>
                    ) : (
                      <p>
                        {product.description.length > 150
                          ? `${product.description.substring(0, 150)}...`
                          : product.description}
                      </p>
                    )}
                    {product.description.length > 150 && (
                      <button
                        onClick={() => setShowFullDescription(!showFullDescription)}
                        className="text-telegram-button text-sm mt-1 hover:underline"
                      >
                        {showFullDescription ? 'Show Less' : 'Read More'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Features */}
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center space-x-3 p-3 bg-telegram-secondary-bg rounded-lg">
                    <Truck className="w-5 h-5 text-telegram-button" />
                    <div>
                      <p className="text-sm font-medium text-telegram-text">Free Delivery</p>
                      <p className="text-xs text-telegram-hint">On orders over $50</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 bg-telegram-secondary-bg rounded-lg">
                    <Shield className="w-5 h-5 text-telegram-button" />
                    <div>
                      <p className="text-sm font-medium text-telegram-text">Quality Guarantee</p>
                      <p className="text-xs text-telegram-hint">30-day return policy</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 bg-telegram-secondary-bg rounded-lg">
                    <Clock className="w-5 h-5 text-telegram-button" />
                    <div>
                      <p className="text-sm font-medium text-telegram-text">Fast Processing</p>
                      <p className="text-xs text-telegram-hint">Ships within 24 hours</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'specs' && (
              <div className="space-y-3">
                <h3 className="font-medium text-telegram-text mb-3">Specifications</h3>
                <div className="space-y-2">
                  {product.weight && product.weight > 0 && (
                    <div className="flex justify-between py-2 border-b border-telegram-hint/10">
                      <span className="text-telegram-hint">Weight</span>
                      <span className="text-telegram-text">{product.weight} kg</span>
                    </div>
                  )}
                  
                  {product.dimensions && (
                    <>
                      {product.dimensions.length > 0 && (
                        <div className="flex justify-between py-2 border-b border-telegram-hint/10">
                          <span className="text-telegram-hint">Length</span>
                          <span className="text-telegram-text">{product.dimensions.length} cm</span>
                        </div>
                      )}
                      {product.dimensions.width > 0 && (
                        <div className="flex justify-between py-2 border-b border-telegram-hint/10">
                          <span className="text-telegram-hint">Width</span>
                          <span className="text-telegram-text">{product.dimensions.width} cm</span>
                        </div>
                      )}
                      {product.dimensions.height > 0 && (
                        <div className="flex justify-between py-2 border-b border-telegram-hint/10">
                          <span className="text-telegram-hint">Height</span>
                          <span className="text-telegram-text">{product.dimensions.height} cm</span>
                        </div>
                      )}
                    </>
                  )}
                  
                  <div className="flex justify-between py-2 border-b border-telegram-hint/10">
                    <span className="text-telegram-hint">Category</span>
                    <span className="text-telegram-text capitalize">{product.category}</span>
                  </div>
                  
                  {product.subcategory && (
                    <div className="flex justify-between py-2 border-b border-telegram-hint/10">
                      <span className="text-telegram-hint">Subcategory</span>
                      <span className="text-telegram-text capitalize">{product.subcategory}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-3">
                <div className="text-center py-8">
                  <Star className="w-12 h-12 mx-auto text-telegram-hint mb-3" />
                  <h3 className="font-medium text-telegram-text mb-2">No Reviews Yet</h3>
                  <p className="text-sm text-telegram-hint">Be the first to review this product!</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="sticky bottom-0 bg-telegram-bg border-t border-telegram-hint/20 p-4">
          <div className="flex items-center space-x-4">
            {/* Quantity Selector */}
            {!isOutOfStock && (
              <div className="flex items-center space-x-2 bg-telegram-secondary-bg rounded-lg p-1">
                <button
                  onClick={() => handleQuantityChange(quantity - 1)}
                  disabled={quantity <= 1}
                  className="p-2 rounded-lg hover:bg-telegram-hint hover:bg-opacity-20 disabled:opacity-50"
                >
                  <Minus className="w-4 h-4 text-telegram-text" />
                </button>
                <span className="px-3 py-1 text-telegram-text font-medium min-w-[2rem] text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => handleQuantityChange(quantity + 1)}
                  disabled={quantity >= product.stock}
                  className="p-2 rounded-lg hover:bg-telegram-hint hover:bg-opacity-20 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4 text-telegram-text" />
                </button>
              </div>
            )}

            {/* Add to Cart / Checkout Buttons */}
            {cartItem ? (
              <button
                onClick={handleCheckout}
                disabled={!onCheckout}
                className="flex-1 py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-700 active:scale-95 transition-all"
              >
                <ShoppingCart className="w-5 h-5" />
                <span>Checkout • {formatPrice(product.price * quantity)}</span>
              </button>
            ) : (
              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className={`flex-1 py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 active:scale-95 transition-all ${
                  isOutOfStock
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-telegram-button text-telegram-button-text hover:opacity-90'
                }`}
              >
                <ShoppingCart className="w-5 h-5" />
                <span>
                  {isOutOfStock
                    ? 'Out of Stock'
                    : `Add to Cart • ${formatPrice(product.price * quantity)}`
                  }
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductDetails