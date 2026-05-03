import React, { useEffect, useState } from 'react'
import { collection, getDocs, query, where, orderBy, doc, updateDoc } from 'firebase/firestore'
import { useFirebase } from '../contexts/FirebaseContext'
import { User, UserData, Order, Shop } from '../types'
import { useTelegram } from '../contexts/TelegramContext'
import { User as UserIcon, ShoppingCart, Package, Clock, CheckCircle, XCircle, Truck, DollarSign, Calendar, ArrowRight, RefreshCw, X, Eye, Globe, MessageCircle, FileEdit as Edit, Save, Mail, Phone as PhoneIcon, FileText } from 'lucide-react'

interface UserProfileProps {
  user: User | null
  userData: UserData | null
}

// Order Detail Modal Component for User Profile
interface OrderDetailModalProps {
  order: Order
  onClose: () => void
}

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ 
  order, 
  onClose
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'payment_pending':
        return 'bg-orange-100 text-orange-800'
      case 'confirmed':
        return 'bg-blue-100 text-blue-800'
      case 'processing':
        return 'bg-purple-100 text-purple-800'
      case 'shipped':
        return 'bg-indigo-100 text-indigo-800'
      case 'delivered':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />
      case 'payment_pending':
        return <DollarSign className="w-4 h-4" />
      case 'confirmed':
      case 'processing':
        return <Package className="w-4 h-4" />
      case 'shipped':
        return <Truck className="w-4 h-4" />
      case 'delivered':
        return <CheckCircle className="w-4 h-4" />
      case 'cancelled':
        return <XCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-telegram-bg rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-telegram-hint/20">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-telegram-text">
              Order #{order.id.slice(-8)}
            </h2>
            <button 
              onClick={onClose} 
              className="text-telegram-hint hover:text-telegram-text p-2 rounded"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Order Status */}
          <div className="bg-telegram-secondary-bg rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-telegram-text">Order Status</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${getStatusColor(order.status)}`}>
                {getStatusIcon(order.status)}
                <span className="capitalize">{order.status.replace('_', ' ')}</span>
              </span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-telegram-hint">Order Date:</span>
                <span className="text-telegram-text">{order.createdAt.toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-telegram-hint">Payment Status:</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {order.paymentStatus}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-telegram-hint">Delivery Method:</span>
                <span className="text-telegram-text capitalize">{order.deliveryMethod}</span>
              </div>
              {order.trackingNumber && (
                <div className="flex justify-between">
                  <span className="text-telegram-hint">Tracking:</span>
                  <span className="text-telegram-text font-mono">{order.trackingNumber}</span>
                </div>
              )}
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-telegram-secondary-bg rounded-lg p-4">
            <h3 className="font-medium text-telegram-text mb-3">Items Ordered</h3>
            <div className="space-y-3">
              {order.items.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-telegram-text">{item.productName}</h4>
                    <p className="text-xs text-telegram-hint">
                      ${item.price.toFixed(2)} × {item.quantity}
                    </p>
                  </div>
                  <div className="text-sm font-medium text-telegram-text">
                    ${item.total.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="border-t border-telegram-hint/20 mt-3 pt-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-telegram-hint">Subtotal:</span>
                <span className="text-telegram-text">${order.subtotal.toFixed(2)}</span>
              </div>
              {order.tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-telegram-hint">Tax:</span>
                  <span className="text-telegram-text">${order.tax.toFixed(2)}</span>
                </div>
              )}
              {order.deliveryFee && order.deliveryFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-telegram-hint">Delivery Fee:</span>
                  <span className="text-telegram-text">${order.deliveryFee.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-medium text-telegram-text border-t border-telegram-hint/20 pt-1">
                <span>Total:</span>
                <span>${order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Customer Notes */}
          {order.customerNotes && (
            <div className="bg-telegram-secondary-bg rounded-lg p-4">
              <h3 className="font-medium text-telegram-text mb-2">Notes</h3>
              <p className="text-sm text-telegram-hint">{order.customerNotes}</p>
            </div>
          )}

          {/* Delivery Address */}
          {order.deliveryAddress && (
            <div className="bg-telegram-secondary-bg rounded-lg p-4">
              <h3 className="font-medium text-telegram-text mb-2">Delivery Address</h3>
              <p className="text-sm text-telegram-hint">{order.deliveryAddress}</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-telegram-hint/20">
          <button
            onClick={onClose}
            className="w-full bg-telegram-button text-telegram-button-text py-3 rounded-lg font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

const UserProfile: React.FC<UserProfileProps> = ({ user, userData }) => {
  const { webApp } = useTelegram()
  const { db } = useFirebase()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [shops, setShops] = useState<Shop[]>([])
  const [showOrders, setShowOrders] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    displayName: userData?.displayName || '',
    email: userData?.email || '',
    phone: userData?.phone || '',
    bio: userData?.bio || ''
  })
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [settings, setSettings] = useState({
    notifications: {
      orderUpdates: true,
      promotions: false,
      newsletter: false
    }
  })
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalSpent: 0,
    pendingOrders: 0,
    completedOrders: 0
  })

  useEffect(() => {
    if (user?.id && userData) {
      fetchUserOrders()
      setEditForm({
        displayName: userData.displayName || '',
        email: userData.email || '',
        phone: userData.phone || '',
        bio: userData.bio || ''
      })
    }
  }, [user, userData])

  const fetchUserOrders = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      setError(null)

      const ordersRef = collection(db, 'orders')
      const allOrdersQuery = query(ordersRef, orderBy('createdAt', 'desc'))
      const allOrdersSnapshot = await getDocs(allOrdersQuery)

      const userOrders: Order[] = []
      const telegramIdNum = parseInt(user.id)

      allOrdersSnapshot.forEach((doc) => {
        const data = doc.data()

        const matchesTelegramId =
          data.telegramId === user.id ||
          data.telegramId === telegramIdNum ||
          data.customerId === user.id ||
          data.customerId === user.id.toString()

        if (matchesTelegramId) {
          const order: Order = {
            id: doc.id,
            shopId: data.shopId || '',
            customerId: data.customerId || '',
            customerName: data.customerName || 'Unknown Customer',
            customerPhone: data.customerPhone,
            customerEmail: data.customerEmail,
            items: data.items || [],
            subtotal: data.subtotal || 0,
            tax: data.tax || 0,
            total: data.total || 0,
            status: data.status || 'pending',
            paymentStatus: data.paymentStatus || 'pending',
            deliveryMethod: data.deliveryMethod || 'pickup',
            deliveryAddress: data.deliveryAddress,
            deliveryFee: data.deliveryFee,
            estimatedDeliveryTime: data.estimatedDeliveryTime?.toDate(),
            paymentPreference: data.paymentPreference,
            paymentPhotoUrl: data.paymentPhotoUrl,
            requiresPaymentConfirmation: data.requiresPaymentConfirmation,
            customerNotes: data.customerNotes,
            source: data.source || 'web',
            tableNumber: data.tableNumber,
            telegramId: data.telegramId,
            telegramUsername: data.telegramUsername,
            trackingNumber: data.trackingNumber,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            confirmedAt: data.confirmedAt?.toDate(),
            shippedAt: data.shippedAt?.toDate(),
            deliveredAt: data.deliveredAt?.toDate()
          }
          userOrders.push(order)
        }
      })

      setOrders(userOrders)

      const totalOrders = userOrders.length
      const totalSpent = userOrders.reduce((sum, order) => sum + order.total, 0)
      const pendingOrders = userOrders.filter(order =>
        ['pending', 'payment_pending', 'confirmed', 'processing'].includes(order.status)
      ).length
      const completedOrders = userOrders.filter(order =>
        order.status === 'delivered'
      ).length

      setStats({
        totalOrders,
        totalSpent,
        pendingOrders,
        completedOrders
      })

    } catch (error) {
      console.error('Error fetching user orders:', error)
      setError('Failed to load your orders. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'payment_pending':
        return 'bg-orange-100 text-orange-800'
      case 'confirmed':
        return 'bg-blue-100 text-blue-800'
      case 'processing':
        return 'bg-purple-100 text-purple-800'
      case 'shipped':
        return 'bg-indigo-100 text-indigo-800'
      case 'delivered':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />
      case 'payment_pending':
        return <DollarSign className="w-4 h-4" />
      case 'confirmed':
      case 'processing':
        return <Package className="w-4 h-4" />
      case 'shipped':
        return <Truck className="w-4 h-4" />
      case 'delivered':
        return <CheckCircle className="w-4 h-4" />
      case 'cancelled':
        return <XCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const handleEditProfile = () => {
    setIsEditing(true)
    setSaveSuccess(false)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditForm({
      displayName: userData?.displayName || '',
      email: userData?.email || '',
      phone: userData?.phone || '',
      bio: userData?.bio || ''
    })
  }

  const handleSaveProfile = async () => {
    if (!userData?.uid) return

    try {
      setLoading(true)
      const userDocRef = doc(db, 'users', userData.uid)

      const isProfileComplete = !!(editForm.displayName && editForm.email && editForm.phone)

      await updateDoc(userDocRef, {
        displayName: editForm.displayName,
        email: editForm.email,
        phone: editForm.phone,
        bio: editForm.bio,
        profileCompleted: isProfileComplete,
        updatedAt: new Date()
      })

      setIsEditing(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)

      window.location.reload()
    } catch (error) {
      console.error('Error updating profile:', error)
      setError('Failed to update profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!user || !userData) {
    return (
      <div className="p-4">
        <div className="text-center py-12">
          <UserIcon className="w-16 h-16 mx-auto text-telegram-hint mb-4" />
          <h3 className="text-lg font-medium text-telegram-text mb-2">No user data</h3>
          <p className="text-telegram-hint">
            Please open this app from Telegram to see your profile.
          </p>
        </div>
      </div>
    )
  }

  // Show orders view
  if (showOrders) {
    return (
      <div className="p-4 space-y-4">
        {/* Orders Header */}
        <div className="flex items-center space-x-3 mb-4">
          <button
            onClick={() => setShowOrders(false)}
            className="p-2 rounded-lg bg-telegram-secondary-bg"
          >
            <ArrowRight className="w-5 h-5 text-telegram-text rotate-180" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-telegram-text">Your Orders</h2>
            <p className="text-sm text-telegram-hint">{orders.length} total orders</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-telegram-secondary-bg rounded-lg p-4 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-gray-300 rounded w-1/3"></div>
                    <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                  </div>
                  <div className="h-6 bg-gray-300 rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="w-16 h-16 mx-auto text-telegram-hint mb-4" />
            <h3 className="text-lg font-medium text-telegram-text mb-2">No Orders Yet</h3>
            <p className="text-telegram-hint">Start shopping to see your orders here!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className="bg-telegram-secondary-bg rounded-lg p-4 cursor-pointer hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-telegram-text">
                        Order #{order.id.slice(-8)}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        <span className="capitalize">{order.status.replace('_', ' ')}</span>
                      </span>
                      {order.source === 'telegram' && (
                        <MessageCircle className="w-4 h-4 text-telegram-button" />
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-telegram-hint">
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(order.createdAt)}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Package className="w-3 h-3" />
                        <span>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-telegram-text">
                      ${order.total.toFixed(2)}
                    </div>
                    <ArrowRight className="w-4 h-4 text-telegram-hint ml-auto mt-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Order Detail Modal */}
        {selectedOrder && (
          <OrderDetailModal
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
          />
        )}
      </div>
    )
  }
  
  if (selectedOrder) {
    return (
      <div className="p-4 space-y-4">
        {/* Order Details Header */}
        <div className="flex items-center space-x-3 mb-4">
          <button
            onClick={() => setSelectedOrder(null)}
            className="p-2 rounded-lg bg-telegram-secondary-bg"
          >
            <ArrowRight className="w-5 h-5 text-telegram-text rotate-180" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-telegram-text">Order Details</h2>
            <p className="text-sm text-telegram-hint">#{selectedOrder.id.slice(-8)}</p>
          </div>
        </div>

        {/* Order Status */}
        <div className="bg-telegram-secondary-bg rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-telegram-text">Order Status</h3>
            <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${getStatusColor(selectedOrder.status)}`}>
              {getStatusIcon(selectedOrder.status)}
              <span className="capitalize">{selectedOrder.status.replace('_', ' ')}</span>
            </span>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-telegram-hint">Order Date:</span>
              <span className="text-telegram-text">{formatDate(selectedOrder.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-telegram-hint">Payment Status:</span>
              <span className={`px-2 py-1 rounded text-xs ${
                selectedOrder.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {selectedOrder.paymentStatus}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-telegram-hint">Delivery Method:</span>
              <span className="text-telegram-text capitalize">{selectedOrder.deliveryMethod}</span>
            </div>
            {selectedOrder.trackingNumber && (
              <div className="flex justify-between">
                <span className="text-telegram-hint">Tracking:</span>
                <span className="text-telegram-text font-mono">{selectedOrder.trackingNumber}</span>
              </div>
            )}
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-telegram-secondary-bg rounded-lg p-4">
          <h3 className="font-medium text-telegram-text mb-3">Items Ordered</h3>
          <div className="space-y-3">
            {selectedOrder.items.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-telegram-text">{item.productName}</h4>
                  <p className="text-xs text-telegram-hint">
                    ${item.price.toFixed(2)} × {item.quantity}
                  </p>
                </div>
                <div className="text-sm font-medium text-telegram-text">
                  ${item.total.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
          
          <div className="border-t border-telegram-hint/20 mt-3 pt-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-telegram-hint">Subtotal:</span>
              <span className="text-telegram-text">${selectedOrder.subtotal.toFixed(2)}</span>
            </div>
            {selectedOrder.tax > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-telegram-hint">Tax:</span>
                <span className="text-telegram-text">${selectedOrder.tax.toFixed(2)}</span>
              </div>
            )}
            {selectedOrder.deliveryFee && selectedOrder.deliveryFee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-telegram-hint">Delivery Fee:</span>
                <span className="text-telegram-text">${selectedOrder.deliveryFee.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-medium text-telegram-text border-t border-telegram-hint/20 pt-1">
              <span>Total:</span>
              <span>${selectedOrder.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Customer Notes */}
        {selectedOrder.customerNotes && (
          <div className="bg-telegram-secondary-bg rounded-lg p-4">
            <h3 className="font-medium text-telegram-text mb-2">Notes</h3>
            <p className="text-sm text-telegram-hint">{selectedOrder.customerNotes}</p>
          </div>
        )}

        {/* Delivery Address */}
        {selectedOrder.deliveryAddress && (
          <div className="bg-telegram-secondary-bg rounded-lg p-4">
            <h3 className="font-medium text-telegram-text mb-2">Delivery Address</h3>
            <p className="text-sm text-telegram-hint">{selectedOrder.deliveryAddress}</p>
          </div>
        )}
      </div>
    )
  }
  
  return (
    <div className="p-4 space-y-6">
      {/* User Info Card */}
      <div className="bg-telegram-secondary-bg rounded-lg p-6">
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-16 h-16 bg-telegram-button rounded-full flex items-center justify-center">
            <UserIcon className="w-8 h-8 text-telegram-button-text" />
          </div>

          <div className="flex-1">
            <h2 className="text-xl font-bold text-telegram-text">
              {user.firstName} {user.lastName}
            </h2>
            {user.username && (
              <p className="text-telegram-hint">@{user.username}</p>
            )}
            <div className="flex items-center space-x-1 mt-2">
              <Globe className="w-4 h-4 text-telegram-hint" />
              <span className="text-sm text-telegram-hint">
                {user.languageCode.toUpperCase()}
              </span>
            </div>
          </div>

          {!isEditing && (
            <button
              onClick={handleEditProfile}
              className="p-2 bg-telegram-button text-telegram-button-text rounded-lg hover:opacity-80 transition-opacity"
            >
              <Edit className="w-5 h-5" />
            </button>
          )}
        </div>

        {saveSuccess && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded-lg text-sm mb-4">
            Profile updated successfully!
          </div>
        )}

        {isEditing ? (
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-telegram-text mb-2">
                <div className="flex items-center space-x-2">
                  <UserIcon className="w-4 h-4" />
                  <span>Display Name</span>
                </div>
              </label>
              <input
                type="text"
                value={editForm.displayName}
                onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                className="w-full px-4 py-2 bg-telegram-bg border border-telegram-hint/20 rounded-lg text-telegram-text focus:outline-none focus:border-telegram-button"
                placeholder="Enter your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-telegram-text mb-2">
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4" />
                  <span>Email</span>
                </div>
              </label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="w-full px-4 py-2 bg-telegram-bg border border-telegram-hint/20 rounded-lg text-telegram-text focus:outline-none focus:border-telegram-button"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-telegram-text mb-2">
                <div className="flex items-center space-x-2">
                  <PhoneIcon className="w-4 h-4" />
                  <span>Phone</span>
                </div>
              </label>
              <input
                type="tel"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="w-full px-4 py-2 bg-telegram-bg border border-telegram-hint/20 rounded-lg text-telegram-text focus:outline-none focus:border-telegram-button"
                placeholder="Enter your phone number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-telegram-text mb-2">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4" />
                  <span>Bio</span>
                </div>
              </label>
              <textarea
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                className="w-full px-4 py-2 bg-telegram-bg border border-telegram-hint/20 rounded-lg text-telegram-text focus:outline-none focus:border-telegram-button"
                placeholder="Tell us about yourself"
                rows={3}
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleSaveProfile}
                disabled={loading}
                className="flex-1 bg-telegram-button text-telegram-button-text py-3 rounded-lg font-medium hover:opacity-80 transition-opacity disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <Save className="w-5 h-5" />
                <span>{loading ? 'Saving...' : 'Save Changes'}</span>
              </button>
              <button
                onClick={handleCancelEdit}
                disabled={loading}
                className="flex-1 bg-telegram-hint/20 text-telegram-text py-3 rounded-lg font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 mt-4">
            <div className="flex items-center space-x-2 text-sm">
              <Mail className="w-4 h-4 text-telegram-hint" />
              <span className="text-telegram-text">{userData.email || 'No email provided'}</span>
            </div>
            {userData.phone && (
              <div className="flex items-center space-x-2 text-sm">
                <PhoneIcon className="w-4 h-4 text-telegram-hint" />
                <span className="text-telegram-text">{userData.phone}</span>
              </div>
            )}
            {userData.bio && (
              <div className="flex items-start space-x-2 text-sm">
                <FileText className="w-4 h-4 text-telegram-hint mt-0.5" />
                <span className="text-telegram-text">{userData.bio}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-telegram-secondary-bg rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-telegram-text">{stats.totalOrders}</div>
          <div className="text-sm text-telegram-hint">Total Orders</div>
        </div>
        
        <div className="bg-telegram-secondary-bg rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-telegram-text">${stats.totalSpent.toFixed(0)}</div>
          <div className="text-sm text-telegram-hint">Total Spent</div>
        </div>
        
        <div className="bg-telegram-secondary-bg rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-telegram-text">{stats.pendingOrders}</div>
          <div className="text-sm text-telegram-hint">Pending</div>
        </div>
        
        <div className="bg-telegram-secondary-bg rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-telegram-text">{stats.completedOrders}</div>
          <div className="text-sm text-telegram-hint">Completed</div>
        </div>
      </div>

      {/* Orders Section - Only View All Button */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-telegram-text">Your Orders</h3>
          <button
            onClick={fetchUserOrders}
            disabled={loading}
            className="p-2 text-telegram-button hover:bg-telegram-button hover:text-telegram-button-text rounded-lg disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
      </div>

      {/* View All Orders Button */}
      <div className="text-center">
        <button
          onClick={() => setShowOrders(true)}
          className="bg-telegram-button text-telegram-button-text px-6 py-3 rounded-lg font-medium hover:opacity-80 transition-opacity"
        >
          View All Orders
        </button>
      </div>

      {/* App Info */}
      <div className="text-center text-telegram-hint text-sm">
        <p>Multi-Shop Mini App</p>
        <p>Version 1.0.0</p>
      </div>
    </div>
  )
}

export default UserProfile