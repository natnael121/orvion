import { useState, useEffect } from 'react'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { useFirebase } from '../contexts/FirebaseContext'
import { Customer } from '../types'

export const useCustomers = (shopId?: string) => {
  const { db } = useFirebase()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCustomers = async () => {
      if (!shopId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const ordersRef = collection(db, 'orders')
        const ordersQuery = query(ordersRef, where('shopId', '==', shopId))
        const ordersSnapshot = await getDocs(ordersQuery)

        const customerMap = new Map<string, Customer>()

        ordersSnapshot.forEach((doc) => {
          const orderData = doc.data()
          const customerId = orderData.customerId || orderData.telegramId || orderData.customerEmail || 'unknown'

          if (!customerMap.has(customerId)) {
            const customer: Customer = {
              id: customerId,
              shopId: shopId,
              name: orderData.customerName || 'Unknown Customer',
              email: orderData.customerEmail,
              phone: orderData.customerPhone,
              telegramId: orderData.telegramId,
              telegramUsername: orderData.telegramUsername,
              source: orderData.source || 'web',
              tags: [],
              totalOrders: 0,
              totalSpent: 0,
              averageOrderValue: 0,
              createdAt: orderData.createdAt?.toDate() || new Date(),
              updatedAt: orderData.updatedAt?.toDate() || new Date()
            }
            customerMap.set(customerId, customer)
          }

          const customer = customerMap.get(customerId)!
          customer.totalOrders++
          customer.totalSpent += orderData.total || 0

          const orderDate = orderData.createdAt?.toDate()
          if (orderDate && (!customer.lastOrderDate || orderDate > customer.lastOrderDate)) {
            customer.lastOrderDate = orderDate
          }
        })

        customerMap.forEach((customer) => {
          customer.averageOrderValue = customer.totalOrders > 0
            ? customer.totalSpent / customer.totalOrders
            : 0

          if (customer.totalSpent > 1000) {
            customer.tags.push('VIP')
          } else if (customer.totalOrders >= 5) {
            customer.tags.push('Regular')
          } else if (customer.totalOrders === 1) {
            customer.tags.push('New')
          }

          if (customer.totalOrders > 10 && customer.averageOrderValue > 100) {
            if (!customer.tags.includes('VIP')) {
              customer.tags.push('Wholesale')
            }
          }
        })

        const customersList = Array.from(customerMap.values()).sort(
          (a, b) => b.totalSpent - a.totalSpent
        )

        setCustomers(customersList)
      } catch (err) {
        console.error('Error fetching customers:', err)
        setError('Failed to load customers')
      } finally {
        setLoading(false)
      }
    }

    fetchCustomers()
  }, [shopId, db])

  return { customers, loading, error }
}
