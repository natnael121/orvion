import { db } from '../config/firebase'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  Timestamp
} from 'firebase/firestore'
import { CRMContact } from '../types'

interface SyncResult {
  success: boolean
  contactsProcessed: number
  errors: string[]
}

export const syncContact = async (
  shopId: string,
  telegramId: number
): Promise<void> => {
  try {
    const q = query(
      collection(db, 'shop_customers'),
      where('shopId', '==', shopId),
      where('telegramId', '==', telegramId)
    )

    const shopCustomerSnapshot = await getDocs(q)

    if (shopCustomerSnapshot.empty) {
      console.warn(`No shop_customer found for telegramId: ${telegramId}`)
      return
    }

    const shopCustomerDoc = shopCustomerSnapshot.docs[0]
    const customerId = shopCustomerDoc.data().customerId

    const userQuery = query(
      collection(db, 'users'),
      where('telegramId', '==', telegramId)
    )
    const userSnapshot = await getDocs(userQuery)
    let userName = 'Unknown User'
    let username = undefined
    let phone = undefined
    let email = undefined

    if (!userSnapshot.empty) {
      const userData = userSnapshot.docs[0].data()
      userName = userData.displayName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Unknown User'
      username = userData.username
      phone = userData.phone
      email = userData.email
    }

    const ordersQuery = query(
      collection(db, 'orders'),
      where('shopId', '==', shopId),
      where('customerId', '==', customerId)
    )
    const ordersSnapshot = await getDocs(ordersQuery)

    let totalOrders = 0
    let totalSpent = 0
    let lastOrderDate: Date | undefined = undefined

    ordersSnapshot.docs.forEach(orderDoc => {
      const order = orderDoc.data()
      totalOrders++
      totalSpent += order.total || 0

      const orderDate = order.createdAt?.toDate()
      if (orderDate && (!lastOrderDate || orderDate > lastOrderDate)) {
        lastOrderDate = orderDate
      }
    })

    const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const lastActivityDate = lastOrderDate
    const activityStatus = lastActivityDate && lastActivityDate >= thirtyDaysAgo ? 'active' : 'inactive'

    let tags: string[] = []
    if (totalOrders === 0) {
      tags = ['New']
    } else if (totalOrders >= 6) {
      tags = ['VIP']
    } else {
      tags = ['Regular']
    }

    const contactId = `${shopId}_${telegramId}`
    const existingContactRef = doc(db, 'crm_contacts', contactId)
    const existingContactSnap = await getDoc(existingContactRef)

    const contactData: Partial<CRMContact> = {
      shopId,
      telegramId,
      name: userName,
      username,
      phone,
      email,
      totalOrders,
      totalSpent,
      averageOrderValue,
      lastOrderDate: lastOrderDate || undefined,
      activityStatus,
      updatedAt: new Date()
    }

    if (existingContactSnap.exists()) {
      const existingData = existingContactSnap.data()
      contactData.tags = existingData.tags || tags
      contactData.notes = existingData.notes || ''
      contactData.customFields = existingData.customFields || {}
      contactData.lastContactedDate = existingData.lastContactedDate?.toDate()
      contactData.sourceLink = existingData.sourceLink
      contactData.lastNoteUpdate = existingData.lastNoteUpdate?.toDate()
      contactData.createdAt = existingData.createdAt?.toDate()
    } else {
      contactData.tags = tags
      contactData.notes = ''
      contactData.customFields = {}
      contactData.createdAt = new Date()
    }

    await setDoc(existingContactRef, {
      ...contactData,
      createdAt: Timestamp.fromDate(contactData.createdAt!),
      updatedAt: Timestamp.fromDate(contactData.updatedAt!),
      lastOrderDate: contactData.lastOrderDate ? Timestamp.fromDate(contactData.lastOrderDate) : null,
      lastContactedDate: contactData.lastContactedDate ? Timestamp.fromDate(contactData.lastContactedDate) : null,
      lastNoteUpdate: contactData.lastNoteUpdate ? Timestamp.fromDate(contactData.lastNoteUpdate) : null
    })

  } catch (error) {
    console.error('Error syncing contact:', error)
    throw error
  }
}

export const syncAllContacts = async (shopId: string): Promise<SyncResult> => {
  const result: SyncResult = {
    success: true,
    contactsProcessed: 0,
    errors: []
  }

  try {
    const shopCustomersQuery = query(
      collection(db, 'shop_customers'),
      where('shopId', '==', shopId)
    )

    const shopCustomersSnapshot = await getDocs(shopCustomersQuery)

    for (const shopCustomerDoc of shopCustomersSnapshot.docs) {
      const shopCustomerData = shopCustomerDoc.data()
      const telegramId = shopCustomerData.telegramId

      if (!telegramId) {
        result.errors.push(`Shop customer ${shopCustomerDoc.id} has no telegramId`)
        continue
      }

      try {
        await syncContact(shopId, telegramId)
        result.contactsProcessed++
      } catch (error) {
        result.errors.push(`Failed to sync contact ${telegramId}: ${error}`)
        result.success = false
      }
    }

  } catch (error) {
    result.success = false
    result.errors.push(`Failed to sync contacts: ${error}`)
  }

  return result
}

export const getLastSyncTimestamp = async (shopId: string): Promise<Date | null> => {
  try {
    const syncLogRef = doc(db, 'crm_sync_logs', shopId)
    const syncLogSnap = await getDoc(syncLogRef)

    if (syncLogSnap.exists()) {
      return syncLogSnap.data().lastSync?.toDate() || null
    }

    return null
  } catch (error) {
    console.error('Error getting last sync timestamp:', error)
    return null
  }
}

export const updateSyncTimestamp = async (shopId: string): Promise<void> => {
  try {
    const syncLogRef = doc(db, 'crm_sync_logs', shopId)
    await setDoc(syncLogRef, {
      shopId,
      lastSync: Timestamp.now()
    }, { merge: true })
  } catch (error) {
    console.error('Error updating sync timestamp:', error)
  }
}

export const syncContactsAfterOrderCreation = async (
  shopId: string,
  customerId: string
): Promise<void> => {
  try {
    const customerDoc = await getDoc(doc(db, 'shop_customers', customerId))

    if (!customerDoc.exists()) {
      console.warn(`Customer ${customerId} not found`)
      return
    }

    const customerData = customerDoc.data()
    const telegramId = customerData.telegramId

    if (!telegramId) {
      console.warn(`Customer ${customerId} has no telegramId`)
      return
    }

    await syncContact(shopId, telegramId)
  } catch (error) {
    console.error('Error syncing contact after order creation:', error)
  }
}
