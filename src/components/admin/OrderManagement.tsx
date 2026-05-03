import React, { useState, useEffect } from 'react'
import { Clock, CheckCircle, XCircle, Eye, Filter, Download, MessageSquare, AlertCircle, Truck, Package, Bell, X } from 'lucide-react'
import { collection, query, where, getDocs, doc, updateDoc, orderBy, onSnapshot, addDoc } from 'firebase/firestore'
import { useFirebase } from '../../contexts/FirebaseContext'
import { useTelegram } from '../../contexts/TelegramContext'
import { Order, Department } from '../../types'

interface OrderManagementProps {
  selectedShopId?: string
}

type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'

const OrderManagement: React.FC<OrderManagementProps> = ({ selectedShopId }) => {
  const { db } = useFirebase()
  const { user } = useTelegram()
  const [orders, setOrders] = useState<Order[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [processingOrders, setProcessingOrders] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [newOrderNotifications, setNewOrderNotifications] = useState<Order[]>([])

  useEffect(() => {
    if (selectedShopId) {
      loadDepartments()
      setupOrdersListener()
    }
    
    return () => {
      // Cleanup listeners when component unmounts
    }
  }, [selectedShopId])

  const setupOrdersListener = () => {
    if (!selectedShopId || !db) return

    try {
      setLoading(true)
      setError(null)

      const ordersRef = collection(db, 'orders')
      const ordersQuery = query(
        ordersRef,
        where('shopId', '==', selectedShopId),
        orderBy('createdAt', 'desc')
      )
      
      // Setup real-time listener
      const unsubscribe = onSnapshot(
        ordersQuery,
        (snapshot) => {
          const ordersList: Order[] = []
          const newOrders: Order[] = []
          
          snapshot.forEach((doc) => {
            const data = doc.data()
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
            ordersList.push(order)

            // Check if this is a new pending order (created in last 30 seconds)
            const isNewOrder = order.status === 'pending' && 
              (Date.now() - order.createdAt.getTime()) < 30000
            
            if (isNewOrder) {
              newOrders.push(order)
            }
          })

          setOrders(ordersList)
          
          // Show notifications for new orders
          if (newOrders.length > 0) {
            setNewOrderNotifications(prev => [...prev, ...newOrders])
          }
          
          setLoading(false)
          setError(null)
        },
        (error) => {
          console.error('Error in orders listener:', error)
          setError('Failed to load orders. Please try again.')
          setLoading(false)
        }
      )

      return unsubscribe
    } catch (error) {
      console.error('Error setting up orders listener:', error)
      setError('Failed to setup orders listener. Please try again.')
      setLoading(false)
    }
  }

  const loadDepartments = async () => {
    if (!selectedShopId) return

    try {
      const departmentsRef = collection(db, 'departments')
      const departmentsQuery = query(
        departmentsRef,
        where('shopId', '==', selectedShopId),
        where('isActive', '==', true)
      )
      
      const departmentsSnapshot = await getDocs(departmentsQuery)
      const departmentsList: Department[] = []
      
      departmentsSnapshot.forEach((doc) => {
        const data = doc.data()
        const department: Department = {
          id: doc.id,
          userId: data.userId || '',
          shopId: data.shopId || '',
          name: data.name || '',
          telegramChatId: data.telegramChatId || '',
          adminChatId: data.adminChatId || '',
          role: data.role || 'shop',
          order: data.order || 0,
          icon: data.icon || '👥',
          isActive: data.isActive !== false,
          notificationTypes: data.notificationTypes || [],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        }
        departmentsList.push(department)
      })

      setDepartments(departmentsList)
    } catch (error) {
      console.error('Error loading departments:', error)
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    if (processingOrders.has(orderId)) return

    setProcessingOrders(prev => new Set(prev).add(orderId))

    try {
      const orderRef = doc(db, 'orders', orderId)
      const updateData: any = {
        status: newStatus,
        updatedAt: new Date()
      }

      // Add timestamp for specific status changes
      if (newStatus === 'confirmed') {
        updateData.confirmedAt = new Date()
      } else if (newStatus === 'processing') {
        updateData.processingAt = new Date()
      } else if (newStatus === 'shipped') {
        updateData.shippedAt = new Date()
      } else if (newStatus === 'delivered') {
        updateData.deliveredAt = new Date()
      } else if (newStatus === 'cancelled') {
        updateData.cancelledAt = new Date()
      }

      await updateDoc(orderRef, updateData)

      // Update local state
      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, status: newStatus, updatedAt: new Date() }
          : order
      ))

      // Remove from new order notifications if confirmed or cancelled
      if (newStatus === 'confirmed' || newStatus === 'cancelled') {
        setNewOrderNotifications(prev => prev.filter(order => order.id !== orderId))
      }

      // Send Telegram notification if departments are configured
      const order = orders.find(o => o.id === orderId)
      if (order) {
        await sendTelegramNotification(order, newStatus)
      }

    } catch (error) {
      console.error('Error updating order status:', error)
      setError('Failed to update order status. Please try again.')
    } finally {
      setProcessingOrders(prev => {
        const newSet = new Set(prev)
        newSet.delete(orderId)
        return newSet
      })
    }
  }

  const sendTelegramNotification = async (order: Order, status: OrderStatus) => {
    // This would integrate with your Telegram service
    // For now, we'll just log the notification
    console.log(`Telegram notification: Order ${order.id} status changed to ${status}`)
    
    // You can implement actual Telegram notification here using your telegram service
    // const telegramService = new TelegramService(botToken)
    // await telegramService.sendOrderStatusUpdate(order, status, departments)
  }

  const dismissNotification = (orderId: string) => {
    setNewOrderNotifications(prev => prev.filter(order => order.id !== orderId))
  }

  const statusConfig = {
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
    processing: { label: 'Processing', color: 'bg-purple-100 text-purple-800', icon: Package },
    shipped: { label: 'Shipped', color: 'bg-indigo-100 text-indigo-800', icon: Truck },
    delivered: { label: 'Delivered', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: XCircle }
  }

  const getStatusColor = (status: OrderStatus) => {
    return statusConfig[status]?.color || 'bg-gray-100 text-gray-800'
  }

  const getStatusIcon = (status: OrderStatus) => {
    return statusConfig[status]?.icon || AlertCircle
  }

  const filteredOrders = orders.filter(order => {
    if (statusFilter !== 'all' && order.status !== statusFilter) return false
    
    if (dateFilter !== 'all') {
      const orderDate = new Date(order.createdAt)
      const today = new Date()
      
      switch (dateFilter) {
        case 'today':
          return orderDate.toDateString() === today.toDateString()
        case 'week':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
          return orderDate >= weekAgo
        case 'month':
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
          return orderDate >= monthAgo
      }
    }
    
    return true
  })

  const exportOrders = () => {
    const csvContent = [
      ['Order ID', 'Customer', 'Items', 'Total', 'Status', 'Date'].join(','),
      ...filteredOrders.map(order => [
        order.id.slice(-6),
        order.customerName || order.customerId,
        order.items.map(item => `${item.productName} x${item.quantity}`).join('; '),
        order.total.toFixed(2),
        order.status,
        order.createdAt.toLocaleDateString()
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-telegram-secondary-bg rounded w-1/2"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-telegram-secondary-bg rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!selectedShopId) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 mx-auto text-telegram-hint mb-4" />
        <h3 className="text-lg font-medium text-telegram-text mb-2">No Shop Selected</h3>
        <p className="text-telegram-hint">
          Please select a shop to view and manage orders.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* New Order Notifications */}
      {newOrderNotifications.length > 0 && (
        <div className="space-y-2">
          {newOrderNotifications.map((order) => (
            <div key={order.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Bell className="w-5 h-5 text-yellow-600" />
                  <div>
                    <h4 className="font-medium text-yellow-800">New Order Received!</h4>
                    <p className="text-sm text-yellow-700">
                      Order #{order.id.slice(-6)} from {order.customerName} - ${order.total.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => updateOrderStatus(order.id, 'confirmed')}
                    disabled={processingOrders.has(order.id)}
                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => updateOrderStatus(order.id, 'cancelled')}
                    disabled={processingOrders.has(order.id)}
                    className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => dismissNotification(order.id)}
                    className="text-yellow-600 hover:text-yellow-800 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-telegram-text">Order Management</h2>
          <p className="text-sm text-telegram-hint">Manage your shop orders</p>
        </div>
        <button
          onClick={exportOrders}
          className="bg-telegram-button text-telegram-button-text px-3 py-2 rounded-lg text-sm flex items-center space-x-1"
        >
          <Download className="w-4 h-4" />
          <span>Export</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-telegram-secondary-bg rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-telegram-text">{orders.length}</div>
          <div className="text-xs text-telegram-hint">Total Orders</div>
        </div>
        <div className="bg-telegram-secondary-bg rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-yellow-600">
            {orders.filter(o => o.status === 'pending').length}
          </div>
          <div className="text-xs text-telegram-hint">Pending</div>
        </div>
        <div className="bg-telegram-secondary-bg rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-blue-600">
            {orders.filter(o => ['confirmed', 'processing'].includes(o.status)).length}
          </div>
          <div className="text-xs text-telegram-hint">Processing</div>
        </div>
        <div className="bg-telegram-secondary-bg rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-indigo-600">
            {orders.filter(o => o.status === 'shipped').length}
          </div>
          <div className="text-xs text-telegram-hint">Shipped</div>
        </div>
        <div className="bg-telegram-secondary-bg rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-green-600">
            {orders.filter(o => o.status === 'delivered').length}
          </div>
          <div className="text-xs text-telegram-hint">Delivered</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-telegram-secondary-bg rounded-lg p-3">
        <div className="flex items-center space-x-3 text-sm">
          <Filter className="w-4 h-4 text-telegram-hint" />
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2 py-1 border rounded bg-telegram-bg text-telegram-text text-sm"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-2 py-1 border rounded bg-telegram-bg text-telegram-text text-sm"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>

          <div className="text-xs text-telegram-hint ml-auto">
            {filteredOrders.length} of {orders.length} orders
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {filteredOrders.map((order) => {
          const StatusIcon = getStatusIcon(order.status as OrderStatus)
          const isProcessing = processingOrders.has(order.id)
          
          return (
            <div key={order.id} className="bg-telegram-secondary-bg rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="font-medium text-telegram-text">
                      #{order.id.slice(-6)}
                    </h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(order.status as OrderStatus)}`}>
                      <StatusIcon className="w-3 h-3" />
                      <span>{order.status}</span>
                    </span>
                    {order.source === 'telegram' && (
                      <MessageSquare className="w-4 h-4 text-telegram-button" />
                    )}
                  </div>
                  
                  <div className="text-sm text-telegram-hint space-y-1">
                    <div>Customer: {order.customerName || order.customerId}</div>
                    <div>Total: ${order.total.toFixed(2)}</div>
                    <div>Date: {formatDate(order.createdAt)}</div>
                    <div>Items: {order.items.length} item{order.items.length !== 1 ? 's' : ''}</div>
                  </div>
                </div>
                
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="p-2 text-telegram-button hover:bg-telegram-button hover:text-telegram-button-text rounded"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  
                  {/* Status Action Buttons */}
                  {order.status === 'pending' && (
                    <>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'confirmed')}
                        disabled={isProcessing}
                        className="p-2 text-green-600 hover:bg-green-600 hover:text-white rounded disabled:opacity-50"
                        title="Confirm Order"
                      >
                        {isProcessing ? (
                          <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'cancelled')}
                        disabled={isProcessing}
                        className="p-2 text-red-600 hover:bg-red-600 hover:text-white rounded disabled:opacity-50"
                        title="Cancel Order"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  
                  {order.status === 'confirmed' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'processing')}
                      disabled={isProcessing}
                      className="p-2 text-purple-600 hover:bg-purple-600 hover:text-white rounded disabled:opacity-50"
                      title="Start Processing"
                    >
                      <Package className="w-4 h-4" />
                    </button>
                  )}
                  
                  {order.status === 'processing' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'shipped')}
                      disabled={isProcessing}
                      className="p-2 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded disabled:opacity-50"
                      title="Mark as Shipped"
                    >
                      <Truck className="w-4 h-4" />
                    </button>
                  )}
                  
                  {order.status === 'shipped' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'delivered')}
                      disabled={isProcessing}
                      className="p-2 text-green-600 hover:bg-green-600 hover:text-white rounded disabled:opacity-50"
                      title="Mark as Delivered"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      
      {filteredOrders.length === 0 && !loading && (
        <div className="text-center py-12">
          <Package className="w-16 h-16 mx-auto text-telegram-hint mb-4" />
          <h3 className="text-lg font-medium text-telegram-text mb-2">
            {orders.length === 0 ? 'No orders yet' : 'No orders match your filters'}
          </h3>
          <p className="text-telegram-hint">
            {orders.length === 0 
              ? 'Orders will appear here once customers start placing them.'
              : 'Try adjusting your filter criteria.'
            }
          </p>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdateStatus={updateOrderStatus}
        />
      )}
    </div>
  )
}

// Order Detail Modal Component
interface OrderDetailModalProps {
  order: Order
  onClose: () => void
  onUpdateStatus: (orderId: string, status: OrderStatus) => void
}

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ 
  order, 
  onClose, 
  onUpdateStatus
}) => {
  const statusOptions: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-telegram-bg rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-telegram-hint/20">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-telegram-text">
              Order #{order.id.slice(-6)}
            </h2>
            <button 
              onClick={onClose} 
              className="text-telegram-hint hover:text-telegram-text p-2 rounded"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Order Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-telegram-secondary-bg p-3 rounded-lg">
              <h3 className="font-medium text-telegram-text mb-2">Order Information</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-telegram-hint">Customer:</span>
                  <span className="text-telegram-text">{order.customerName || order.customerId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-telegram-hint">Date:</span>
                  <span className="text-telegram-text">{order.createdAt.toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-telegram-hint">Total:</span>
                  <span className="text-telegram-text font-bold">${order.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-telegram-hint">Delivery:</span>
                  <span className="text-telegram-text capitalize">{order.deliveryMethod}</span>
                </div>
                {order.source === 'telegram' && (
                  <div className="flex justify-between">
                    <span className="text-telegram-hint">Source:</span>
                    <span className="text-telegram-button flex items-center">
                      <MessageSquare className="w-3 h-3 mr-1" />
                      Telegram
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-telegram-secondary-bg p-3 rounded-lg">
              <h3 className="font-medium text-telegram-text mb-2">Status Management</h3>
              <div className="space-y-2">
                <select
                  value={order.status}
                  onChange={(e) => onUpdateStatus(order.id, e.target.value as OrderStatus)}
                  className="w-full px-3 py-2 border rounded-lg bg-telegram-bg text-telegram-text"
                >
                  {statusOptions.map(status => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
                
                <div className="text-xs text-telegram-hint">
                  Current status: <span className="font-medium">{order.status}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          {order.deliveryAddress && (
            <div className="bg-telegram-secondary-bg p-3 rounded-lg">
              <h3 className="font-medium text-telegram-text mb-2">Delivery Address</h3>
              <p className="text-sm text-telegram-text">{order.deliveryAddress}</p>
            </div>
          )}

          {/* Order Items */}
          <div className="bg-telegram-secondary-bg p-3 rounded-lg">
            <h3 className="font-medium text-telegram-text mb-2">Order Items</h3>
            <div className="space-y-2">
              {order.items.map((item, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-telegram-hint/10 last:border-b-0">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-telegram-text">{item.productName}</div>
                    <div className="text-xs text-telegram-hint">
                      ${item.price.toFixed(2)} × {item.quantity}
                    </div>
                  </div>
                  <div className="text-sm font-medium text-telegram-text">
                    ${item.total.toFixed(2)}
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2 font-bold text-telegram-text">
                <span>Total:</span>
                <span>${order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Customer Notes */}
          {order.customerNotes && (
            <div className="bg-telegram-secondary-bg p-3 rounded-lg">
              <h3 className="font-medium text-telegram-text mb-2">Customer Notes</h3>
              <p className="text-sm text-telegram-text">{order.customerNotes}</p>
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

export default OrderManagement