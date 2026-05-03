import React, { useEffect, useState } from 'react'
import { collection, getDocs, query, where, orderBy, doc, getDoc, addDoc } from 'firebase/firestore'
import { useFirebase } from '../contexts/FirebaseContext'
import { useTelegram } from '../contexts/TelegramContext'
import { Shop, Product, UserData, Order, OrderItem, Category } from '../types'
import { Store, Star, Package, ArrowLeft, ShoppingCart, Plus, Minus, CheckCircle, Trash2, X } from 'lucide-react'
import ProductDetails from './ProductDetails'
import { shopCustomerService } from '../services/shopCustomerService'

const ShopList: React.FC = () => {
  const { db } = useFirebase()
  const { user, startParam } = useTelegram()
  const [shops, setShops] = useState<Shop[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userData, setUserData] = useState<any>(null)
  const [currentView, setCurrentView] = useState<'shops' | 'products' | 'cart'>('shops')
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [cart, setCart] = useState<OrderItem[]>([])
  const [orderPlacing, setOrderPlacing] = useState(false)
  const [showOrderSuccess, setShowOrderSuccess] = useState(false)
  const [linkProcessed, setLinkProcessed] = useState(false)
  const [deletingShopId, setDeletingShopId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [shopToDelete, setShopToDelete] = useState<Shop | null>(null)
  const [showUndoNotification, setShowUndoNotification] = useState(false)
  const [undoTimeLeft, setUndoTimeLeft] = useState(10)
  const [deletedShopData, setDeletedShopData] = useState<{ shop: Shop; record: any } | null>(null)
  const [deleteMessage, setDeleteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (user?.id) {
      fetchUserData()
    } else {
      setLoading(false)
      setError('Please open this app from Telegram to see your shops.')
    }
  }, [user])

  useEffect(() => {
    if (user?.id && startParam && !linkProcessed) {
      handleShopLink()
    }
  }, [user, startParam, linkProcessed])

  const handleShopLink = async () => {
    if (!user?.id || !startParam || linkProcessed) return

    try {
      setLinkProcessed(true)
      setLoading(true)

      const displayName = user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`.trim()
        : user.firstName || 'Customer'

      const result = await shopCustomerService.handleShopLinkAccess(
        db,
        startParam,
        parseInt(user.id),
        displayName
      )

      if (result.success && result.shopId) {
        await fetchAllActiveShops()

        const shopRef = doc(db, 'shops', result.shopId)
        const shopDoc = await getDoc(shopRef)

        if (shopDoc.exists()) {
          const shopData = shopDoc.data()
          const shop: Shop = {
            id: shopDoc.id,
            ownerId: shopData.ownerId,
            name: shopData.name,
            slug: shopData.slug,
            description: shopData.description,
            logo: shopData.logo,
            isActive: shopData.isActive,
            businessInfo: shopData.businessInfo,
            settings: shopData.settings,
            stats: shopData.stats,
            createdAt: shopData.createdAt?.toDate() || new Date(),
            updatedAt: shopData.updatedAt?.toDate() || new Date()
          }

          setSelectedShop(shop)
          setCurrentView('products')
          await fetchShopData(result.shopId)

          if (result.productId) {
            const productRef = doc(db, 'products', result.productId)
            const productDoc = await getDoc(productRef)

            if (productDoc.exists()) {
              const productData = productDoc.data()
              setSelectedProduct(createProductFromData(productDoc.id, productData))
            }
          }
        }
      } else {
        setError(result.error || 'Failed to access shop')
      }
    } catch (error) {
      console.error('Error handling shop link:', error)
      setError('Failed to process shop link')
    } finally {
      setLoading(false)
    }
  }

  const fetchUserData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (!user?.id) {
        setError('No user information available')
        return
      }

      // Query users collection by telegramId
      const usersRef = collection(db, 'users')
      const userQuery = query(usersRef, where('telegram_id', '==', parseInt(user.id)))
      const userSnapshot = await getDocs(userQuery)
      
      if (userSnapshot.empty) {
        // For demo purposes, show all active shops if user not found
        console.log('User not found in database, showing all active shops')
        await fetchAllActiveShops()
        setLoading(false)
        return
      }

      const userDoc = userSnapshot.docs[0]
      const userData = userDoc.data() as UserData
      setUserData(userData)

      // Fetch all active shops for browsing
      await fetchAllActiveShops()
    } catch (error) {
      console.error('Error fetching user data:', error)
      setError('Failed to load your shop data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fetchAllActiveShops = async () => {
    try {
      if (!user?.id) {
        setError('User information not available')
        return
      }

      const shopCustomersRef = collection(db, 'shop_customers')
      const customerQuery = query(
        shopCustomersRef,
        where('telegramId', '==', parseInt(user.id))
      )
      const customerSnapshot = await getDocs(customerQuery)

      if (customerSnapshot.empty) {
        setError('No shops assigned to you.')
        return
      }

      const shopIds = customerSnapshot.docs.map(doc => doc.data().shopId)

      const allShops: Shop[] = []
      for (const shopId of shopIds) {
        const shopRef = doc(db, 'shops', shopId)
        const shopDoc = await getDoc(shopRef)

        if (shopDoc.exists()) {
          const data = shopDoc.data()
          if (data.isActive) {
            const shop: Shop = {
              id: shopDoc.id,
              ownerId: data.ownerId,
              name: data.name,
              slug: data.slug,
              description: data.description,
              logo: data.logo,
              isActive: data.isActive,
              businessInfo: data.businessInfo,
              settings: data.settings,
              stats: data.stats,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date()
            }
            allShops.push(shop)
          }
        }
      }

      allShops.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())

      if (allShops.length === 0) {
        setError('No active shops found.')
        return
      }

      setShops(allShops)
    } catch (error) {
      console.error('Error fetching all active shops:', error)
      setError('Failed to load shops. Please try again.')
    }
  }


  const fetchShopData = async (shopId: string) => {
    try {
      setLoading(true)
      setError(null)

      // Load categories
      const categoriesRef = collection(db, 'categories')
      const categoriesQuery = query(
        categoriesRef,
        where('shopId', '==', shopId),
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

      // Load all products
      const productsRef = collection(db, 'products')
      const productsQuery = query(
        productsRef,
        where('shopId', '==', shopId),
        where('isActive', '==', true),
        orderBy('name', 'asc')
      )
      const productsSnapshot = await getDocs(productsQuery)

      const productsList: Product[] = []
      productsSnapshot.forEach((doc) => {
        const data = doc.data()
        productsList.push(createProductFromData(doc.id, data))
      })

      setProducts(productsList)
    } catch (error) {
      console.error('Error fetching shop data:', error)
      setError('Failed to load shop catalog. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(product => product.category === selectedCategory)


  const createProductFromData = (id: string, data: any): Product => {
    return {
      id,
      shopId: data.shopId,
      name: data.name || 'Unnamed Product',
      description: data.description || 'No description available',
      price: data.price || 0,
      stock: data.stock || 0,
      category: data.category || 'other',
      subcategory: data.subcategory,
      images: data.images || [],
      sku: data.sku,
      isActive: data.isActive !== false,
      lowStockAlert: data.lowStockAlert || 0,
      tags: data.tags,
      featured: data.featured,
      costPrice: data.costPrice,
      weight: data.weight,
      dimensions: data.dimensions,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date()
    }
  }

  const handleShopClick = (shop: Shop) => {
    setSelectedShop(shop)
    setCurrentView('products')
    setSelectedCategory('all')
    setError(null)
    fetchShopData(shop.id)
  }

  const handleBackToShops = () => {
    setCurrentView('shops')
    setSelectedShop(null)
    setSelectedCategory('all')
    setCategories([])
    setProducts([])
    setError(null)
  }

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.productId === product.id)
    if (existingItem) {
      setCart(cart.map(item => 
        item.productId === product.id 
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
          : item
      ))
    } else {
      const newItem: OrderItem = {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        price: product.price,
        total: product.price,
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

  const placeOrder = async () => {
    if (!selectedShop || !user || cart.length === 0) {
      console.warn("Cannot place order. Missing data:", { selectedShop, user, cart })
      setError("Cannot place order: missing information or empty cart.")
      return
    }

    try {
      setOrderPlacing(true)
      setError(null)

      const subtotal = getCartTotal()
      const tax = subtotal * 0.1
      const total = subtotal + tax

      const telegramIdNum = parseInt(user.id)

      const orderData = {
        shopId: selectedShop.id,
        customerId: user.id,
        customerName: `${user.firstName} ${user.lastName}`.trim() || 'Customer',
        items: cart,
        subtotal,
        tax,
        total,
        status: 'pending',
        paymentStatus: 'pending',
        deliveryMethod: 'pickup',
        source: 'web',
        telegramId: telegramIdNum,
        telegramUsername: user.username || '',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const ordersRef = collection(db, 'orders')
      await addDoc(ordersRef, orderData)

      setCart([])
      setShowOrderSuccess(true)
      setTimeout(() => {
        setShowOrderSuccess(false)
        setCurrentView('products')
      }, 3000)
    } catch (error) {
      console.error('Error placing order:', error)
      setError('Failed to place order. Please try again.')
    } finally {
      setOrderPlacing(false)
    }
  }

  const handleViewCart = () => {
    setCurrentView('cart')
    setError(null)
  }

  const handleBackToProducts = () => {
    setCurrentView('products')
    setError(null)
  }

  const handleDeleteClick = (e: React.MouseEvent, shop: Shop) => {
    e.stopPropagation()

    if (!user?.id) return

    // Skip owner check - let the service handle it
    setShopToDelete(shop)
    setShowDeleteConfirm(true)
  }

  const executeDelete = async () => {
    if (!shopToDelete || !user?.id) return

    try {
      setDeletingShopId(shopToDelete.id)
      setShowDeleteConfirm(false)

      console.log('Attempting to remove shop:', {
        shopId: shopToDelete.id,
        shopName: shopToDelete.name,
        telegramId: parseInt(user.id),
        userId: user.id
      })

      const result = await shopCustomerService.removeCustomerFromShop(
        db,
        shopToDelete.id,
        parseInt(user.id)
      )

      console.log('Remove shop result:', result)

      if (result.success) {
        setDeletedShopData({
          shop: shopToDelete,
          record: result.deletedRecord
        })

        setShops(prevShops => prevShops.filter(s => s.id !== shopToDelete.id))

        setShowUndoNotification(true)
        setUndoTimeLeft(10)

        const interval = setInterval(() => {
          setUndoTimeLeft(prev => {
            if (prev <= 1) {
              clearInterval(interval)
              setShowUndoNotification(false)
              setDeletedShopData(null)
              return 0
            }
            return prev - 1
          })
        }, 1000)

        setDeleteMessage({
          type: 'success',
          text: `${shopToDelete.name} removed from your list`
        })
        setTimeout(() => setDeleteMessage(null), 3000)
      } else {
        setDeleteMessage({
          type: 'error',
          text: result.error || 'Failed to remove shop'
        })
        setTimeout(() => setDeleteMessage(null), 3000)
      }
    } catch (error) {
      console.error('Error deleting shop:', error)
      setDeleteMessage({
        type: 'error',
        text: 'An error occurred while removing the shop'
      })
      setTimeout(() => setDeleteMessage(null), 3000)
    } finally {
      setDeletingShopId(null)
      setShopToDelete(null)
    }
  }

  const handleUndo = async () => {
    if (!deletedShopData) return

    try {
      const result = await shopCustomerService.restoreCustomerToShop(
        db,
        deletedShopData.record
      )

      if (result.success) {
        setShops(prevShops => {
          const newShops = [...prevShops, deletedShopData.shop]
          return newShops.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        })

        setShowUndoNotification(false)
        setDeletedShopData(null)

        setDeleteMessage({
          type: 'success',
          text: `${deletedShopData.shop.name} restored successfully`
        })
        setTimeout(() => setDeleteMessage(null), 3000)
      } else {
        setDeleteMessage({
          type: 'error',
          text: result.error || 'Failed to restore shop'
        })
        setTimeout(() => setDeleteMessage(null), 3000)
      }
    } catch (error) {
      console.error('Error restoring shop:', error)
      setDeleteMessage({
        type: 'error',
        text: 'An error occurred while restoring the shop'
      })
      setTimeout(() => setDeleteMessage(null), 3000)
    }
  }

  const cancelDelete = () => {
    setShowDeleteConfirm(false)
    setShopToDelete(null)
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-telegram-secondary-bg rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="w-16 h-16 bg-gray-300 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded w-2/3"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-center py-12">
          <Package className="w-16 h-16 mx-auto text-telegram-hint mb-4" />
          <h3 className="text-lg font-medium text-telegram-text mb-2">
            {error.includes('No shops') ? 'No Shops Found' : 'Error Loading Data'}
          </h3>
          <p className="text-telegram-hint mb-4">{error}</p>
          {!error.includes('No shops') && (
            <button
              onClick={fetchUserData}
              className="bg-telegram-button text-telegram-button-text px-4 py-2 rounded-lg"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    )
  }

  // Render shops view
  if (currentView === 'shops') {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-telegram-text">Available Shops</h2>
            <p className="text-sm text-telegram-hint">
              {shops.length} shop{shops.length !== 1 ? 's' : ''} available
            </p>
          </div>
        </div>

        {deleteMessage && (
          <div className={`rounded-lg p-3 flex items-center space-x-2 ${
            deleteMessage.type === 'success'
              ? 'bg-green-100 border border-green-400 text-green-700'
              : 'bg-red-100 border border-red-400 text-red-700'
          }`}>
            {deleteMessage.type === 'success' ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <X className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="text-sm">{deleteMessage.text}</span>
          </div>
        )}

        {showUndoNotification && deletedShopData && (
          <div className="bg-telegram-secondary-bg border border-telegram-button rounded-lg p-3 flex items-center justify-between shadow-lg animate-slide-in-down">
            <div className="flex-1">
              <p className="text-sm text-telegram-text font-medium">
                {deletedShopData.shop.name} removed
              </p>
              <p className="text-xs text-telegram-hint">
                Undo available for {undoTimeLeft} seconds
              </p>
            </div>
            <button
              onClick={handleUndo}
              className="ml-3 bg-telegram-button text-telegram-button-text px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Undo
            </button>
          </div>
        )}

        {showDeleteConfirm && shopToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-telegram-bg rounded-lg p-6 max-w-sm w-full shadow-xl">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-telegram-text">Remove Shop</h3>
                  <p className="text-sm text-telegram-hint">This action can be undone</p>
                </div>
              </div>
              <p className="text-telegram-text mb-6">
                Are you sure you want to remove <span className="font-semibold">{shopToDelete.name}</span> from your list? Your order history will be preserved.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={cancelDelete}
                  className="flex-1 bg-telegram-secondary-bg text-telegram-text px-4 py-2 rounded-lg font-medium hover:bg-opacity-80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={executeDelete}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {shops.map((shop) => {
            const isOwner = userData?.uid === shop.ownerId
            const isDeleting = deletingShopId === shop.id

            return (
              <div
                key={shop.id}
                className={`bg-telegram-secondary-bg rounded-lg p-4 transition-all ${
                  isDeleting ? 'opacity-50 pointer-events-none' : 'hover:shadow-md'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div
                    onClick={() => !isDeleting && handleShopClick(shop)}
                    className="w-16 h-16 bg-gray-300 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer"
                  >
                    {shop.logo ? (
                      <img
                        src={shop.logo}
                        alt={shop.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : null}
                    {!shop.logo && <Store className="w-8 h-8 text-telegram-hint" />}
                  </div>

                  <div className="flex-1 min-w-0" onClick={() => !isDeleting && handleShopClick(shop)}>
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-telegram-text truncate pr-2 cursor-pointer">
                        {shop.name}
                      </h3>
                      <div className="flex items-center space-x-1 flex-shrink-0">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="text-sm font-medium text-telegram-text">
                          {(4.0 + Math.random()).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  
                    <p className="text-sm text-telegram-hint mt-1 line-clamp-2 cursor-pointer">
                      {shop.description}
                    </p>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs bg-telegram-button text-telegram-button-text px-2 py-1 rounded-full">
                          {shop.stats?.totalProducts || 0} Products
                        </span>
                        {isOwner && (
                          <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full">
                            Owner
                          </span>
                        )}
                      </div>

                      <span className="text-xs text-telegram-hint">
                        {shop.isActive ? 'Open' : 'Closed'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <button
                      onClick={(e) => handleDeleteClick(e, shop)}
                      disabled={isDeleting}
                      className={`p-2 rounded-lg transition-all ${
                        isOwner
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-red-600 hover:bg-red-50 active:scale-95'
                      }`}
                      title={isOwner ? 'Cannot delete your own shop' : 'Remove shop from list'}
                    >
                      {isDeleting ? (
                        <div className="w-5 h-5 border-2 border-gray-300 border-t-red-600 rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }


  // Render cart view
  if (currentView === 'cart') {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center space-x-3 mb-4">
          <button
            onClick={handleBackToProducts}
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

        {showOrderSuccess && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg flex items-center space-x-2 mb-4">
            <CheckCircle className="w-5 h-5" />
            <span>Order placed successfully!</span>
          </div>
        )}

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
            
            {/* Place Order Button */}
            <button
              onClick={placeOrder}
              disabled={orderPlacing}
              className="w-full bg-telegram-button text-telegram-button-text py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {orderPlacing ? 'Placing Order...' : 'Place Order'}
            </button>
          </>
        )}
      </div>
    )
  }

  // Render products view
  if (currentView === 'products') {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="bg-telegram-secondary-bg p-4">
          <div className="flex items-center space-x-3 mb-3">
            <button
              onClick={handleBackToShops}
              className="p-2 rounded-lg bg-telegram-bg"
            >
              <ArrowLeft className="w-5 h-5 text-telegram-text" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-telegram-text">{selectedShop?.name}</h1>
              <p className="text-sm text-telegram-hint">
                {products.length} product{products.length !== 1 ? 's' : ''}
              </p>
            </div>

            {cart.length > 0 && (
              <button
                onClick={handleViewCart}
                className="relative p-2 rounded-lg bg-telegram-button text-telegram-button-text"
              >
                <ShoppingCart className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {getCartItemCount()}
                </span>
              </button>
            )}
          </div>

          {selectedShop?.description && (
            <p className="text-telegram-hint text-sm">{selectedShop.description}</p>
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
            shopId={selectedShop?.id}
            shopName={selectedShop?.name}
          />
        )}
      </div>
    )
  }

  return null
}

export default ShopList