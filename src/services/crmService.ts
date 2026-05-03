import { db } from '../config/firebase'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch
} from 'firebase/firestore'
import {
  CRMContact,
  CRMTag,
  CRMMessageTemplate,
  CRMAutoTagRule,
  CRMStats
} from '../types'

export const getContactsByShop = async (shopId: string): Promise<CRMContact[]> => {
  const shopCustomersQuery = query(
    collection(db, 'shop_customers'),
    where('shopId', '==', shopId)
  )

  const shopCustomersSnapshot = await getDocs(shopCustomersQuery)

  if (shopCustomersSnapshot.empty) {
    return []
  }

  const customerIds = shopCustomersSnapshot.docs.map(doc => doc.data().customerId)
  const telegramIds = shopCustomersSnapshot.docs.map(doc => doc.data().telegramId).filter(Boolean)

  const usersMap = new Map()

  const chunkSize = 10
  for (let i = 0; i < customerIds.length; i += chunkSize) {
    const chunk = customerIds.slice(i, i + chunkSize)
    if (chunk.length > 0) {
      const usersQuery = query(
        collection(db, 'users'),
        where('__name__', 'in', chunk)
      )
      const usersSnapshot = await getDocs(usersQuery)
      usersSnapshot.docs.forEach(doc => {
        usersMap.set(doc.id, { id: doc.id, ...doc.data() })
      })
    }
  }

  const ordersQuery = query(
    collection(db, 'orders'),
    where('shopId', '==', shopId)
  )

  const ordersSnapshot = await getDocs(ordersQuery)
  const ordersByCustomer = new Map()

  ordersSnapshot.docs.forEach(doc => {
    const order = doc.data()
    const customerId = order.customerId

    if (!ordersByCustomer.has(customerId)) {
      ordersByCustomer.set(customerId, [])
    }
    ordersByCustomer.get(customerId).push({
      ...order,
      createdAt: order.createdAt?.toDate(),
      updatedAt: order.updatedAt?.toDate()
    })
  })

  const crmContactsQuery = query(
    collection(db, 'crm_contacts'),
    where('shopId', '==', shopId)
  )
  const crmContactsSnapshot = await getDocs(crmContactsQuery)
  const crmContactsMap = new Map()
  crmContactsSnapshot.docs.forEach(doc => {
    const data = doc.data()
    crmContactsMap.set(data.telegramId, {
      id: doc.id,
      tags: data.tags || [],
      notes: data.notes || '',
      customFields: data.customFields || {},
      lastContactedDate: data.lastContactedDate?.toDate(),
      lastNoteUpdate: data.lastNoteUpdate?.toDate()
    })
  })

  const contacts: CRMContact[] = []

  for (const shopCustomerDoc of shopCustomersSnapshot.docs) {
    const shopCustomerData = shopCustomerDoc.data()
    const customerId = shopCustomerData.customerId
    const telegramId = shopCustomerData.telegramId

    const userData = usersMap.get(customerId) || {}
    const userOrders = ordersByCustomer.get(customerId) || []
    const crmData = telegramId ? crmContactsMap.get(telegramId) : null

    const totalOrders = userOrders.length
    const totalSpent = userOrders.reduce((sum, order) => sum + (order.total || 0), 0)
    const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0

    const sortedOrders = userOrders.sort((a, b) =>
      (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    )
    const lastOrderDate = sortedOrders[0]?.createdAt

    const lastActivityDate = crmData?.lastContactedDate || lastOrderDate
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const activityStatus = lastActivityDate && lastActivityDate >= weekAgo ? 'active' : 'inactive'

    contacts.push({
      id: crmData?.id || shopCustomerDoc.id,
      shopId,
      telegramId: telegramId || 0,
      name: userData.displayName || userData.first_name || 'Unknown User',
      username: userData.username || '',
      phone: userData.phone || '',
      email: userData.email || '',
      tags: crmData?.tags || [],
      notes: crmData?.notes || '',
      customFields: crmData?.customFields || {},
      lastContactedDate: crmData?.lastContactedDate,
      lastOrderDate,
      activityStatus,
      totalOrders,
      totalSpent,
      averageOrderValue,
      createdAt: shopCustomerData.createdAt?.toDate() || new Date(),
      updatedAt: shopCustomerData.updatedAt?.toDate() || new Date(),
      lastNoteUpdate: crmData?.lastNoteUpdate
    })
  }

  return contacts.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
}

export const getContactById = async (contactId: string): Promise<CRMContact | null> => {
  const docRef = doc(db, 'crm_contacts', contactId)
  const docSnap = await getDoc(docRef)

  if (!docSnap.exists()) return null

  return {
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate(),
    updatedAt: docSnap.data().updatedAt?.toDate(),
    lastContactedDate: docSnap.data().lastContactedDate?.toDate(),
    lastOrderDate: docSnap.data().lastOrderDate?.toDate(),
    lastNoteUpdate: docSnap.data().lastNoteUpdate?.toDate()
  } as CRMContact
}

export const searchContacts = async (
  shopId: string,
  searchTerm: string,
  filters?: {
    tags?: string[]
    activityStatus?: 'active' | 'inactive'
    dateFrom?: Date
    dateTo?: Date
  }
): Promise<CRMContact[]> => {
  let q = query(
    collection(db, 'crm_contacts'),
    where('shopId', '==', shopId)
  )

  if (filters?.activityStatus) {
    q = query(q, where('activityStatus', '==', filters.activityStatus))
  }

  const snapshot = await getDocs(q)
  let contacts = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
    updatedAt: doc.data().updatedAt?.toDate(),
    lastContactedDate: doc.data().lastContactedDate?.toDate(),
    lastOrderDate: doc.data().lastOrderDate?.toDate(),
    lastNoteUpdate: doc.data().lastNoteUpdate?.toDate()
  })) as CRMContact[]

  if (searchTerm) {
    const term = searchTerm.toLowerCase()
    contacts = contacts.filter(contact =>
      contact.name?.toLowerCase().includes(term) ||
      contact.username?.toLowerCase().includes(term) ||
      contact.phone?.includes(term) ||
      contact.email?.toLowerCase().includes(term)
    )
  }

  if (filters?.tags && filters.tags.length > 0) {
    contacts = contacts.filter(contact =>
      filters.tags!.some(tag => contact.tags.includes(tag))
    )
  }

  if (filters?.dateFrom) {
    contacts = contacts.filter(contact =>
      contact.lastOrderDate && contact.lastOrderDate >= filters.dateFrom!
    )
  }

  if (filters?.dateTo) {
    contacts = contacts.filter(contact =>
      contact.lastOrderDate && contact.lastOrderDate <= filters.dateTo!
    )
  }

  return contacts
}

export const updateContactTags = async (
  contactId: string,
  tags: string[]
): Promise<void> => {
  const docRef = doc(db, 'crm_contacts', contactId)
  await updateDoc(docRef, {
    tags,
    updatedAt: Timestamp.now()
  })
}

export const updateContactNotes = async (
  contactId: string,
  notes: string
): Promise<void> => {
  const docRef = doc(db, 'crm_contacts', contactId)
  await updateDoc(docRef, {
    notes,
    lastNoteUpdate: Timestamp.now(),
    updatedAt: Timestamp.now()
  })
}

export const updateContactLastContacted = async (
  contactId: string
): Promise<void> => {
  const docRef = doc(db, 'crm_contacts', contactId)
  await updateDoc(docRef, {
    lastContactedDate: Timestamp.now(),
    updatedAt: Timestamp.now()
  })
}

export const getContactStats = async (shopId: string): Promise<CRMStats> => {
  const contacts = await getContactsByShop(shopId)

  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const totalCustomers = contacts.length

  const activeThisWeek = contacts.filter(contact => {
    const lastDate = contact.lastContactedDate || contact.lastOrderDate
    return lastDate && lastDate >= weekAgo
  }).length

  const inactive30Plus = contacts.filter(contact => {
    const lastDate = contact.lastContactedDate || contact.lastOrderDate
    return !lastDate || lastDate < thirtyDaysAgo
  }).length

  const tagCounts: Record<string, number> = {}
  contacts.forEach(contact => {
    contact.tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1
    })
  })

  const topTags = Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return {
    totalCustomers,
    activeThisWeek,
    inactive30Plus,
    topTags
  }
}

export const getTags = async (shopId: string): Promise<CRMTag[]> => {
  const q = query(
    collection(db, 'crm_tags'),
    where('shopId', '==', shopId)
  )

  const snapshot = await getDocs(q)
  const tags = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
    updatedAt: doc.data().updatedAt?.toDate()
  })) as CRMTag[]

  return tags.sort((a, b) => a.name.localeCompare(b.name))
}

export const createTag = async (
  shopId: string,
  name: string,
  color: string,
  description?: string
): Promise<string> => {
  const docRef = doc(collection(db, 'crm_tags'))
  await setDoc(docRef, {
    shopId,
    name,
    color,
    description: description || '',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  })
  return docRef.id
}

export const updateTag = async (
  tagId: string,
  updates: Partial<CRMTag>
): Promise<void> => {
  const docRef = doc(db, 'crm_tags', tagId)
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.now()
  })
}

export const deleteTag = async (tagId: string): Promise<void> => {
  await deleteDoc(doc(db, 'crm_tags', tagId))
}

export const getMessageTemplates = async (shopId: string): Promise<CRMMessageTemplate[]> => {
  const q = query(
    collection(db, 'crm_message_templates'),
    where('shopId', '==', shopId)
  )

  const snapshot = await getDocs(q)
  const templates = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
    updatedAt: doc.data().updatedAt?.toDate()
  })) as CRMMessageTemplate[]

  return templates.sort((a, b) => a.name.localeCompare(b.name))
}

export const createMessageTemplate = async (
  shopId: string,
  name: string,
  content: string,
  category?: string
): Promise<string> => {
  const variables = extractVariables(content)

  const docRef = doc(collection(db, 'crm_message_templates'))
  await setDoc(docRef, {
    shopId,
    name,
    category: category || 'General',
    content,
    variables,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  })
  return docRef.id
}

export const updateMessageTemplate = async (
  templateId: string,
  updates: Partial<CRMMessageTemplate>
): Promise<void> => {
  const docRef = doc(db, 'crm_message_templates', templateId)

  if (updates.content) {
    updates.variables = extractVariables(updates.content)
  }

  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.now()
  })
}

export const deleteMessageTemplate = async (templateId: string): Promise<void> => {
  await deleteDoc(doc(db, 'crm_message_templates', templateId))
}

export const getAutoTagRules = async (shopId: string): Promise<CRMAutoTagRule[]> => {
  const q = query(
    collection(db, 'crm_auto_tag_rules'),
    where('shopId', '==', shopId)
  )

  const snapshot = await getDocs(q)
  const rules = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
    updatedAt: doc.data().updatedAt?.toDate()
  })) as CRMAutoTagRule[]

  return rules.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
}

export const createAutoTagRule = async (
  shopId: string,
  pattern: string,
  tags: string[],
  description?: string
): Promise<string> => {
  const docRef = doc(collection(db, 'crm_auto_tag_rules'))
  await setDoc(docRef, {
    shopId,
    pattern,
    tags,
    description: description || '',
    isActive: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  })
  return docRef.id
}

export const updateAutoTagRule = async (
  ruleId: string,
  updates: Partial<CRMAutoTagRule>
): Promise<void> => {
  const docRef = doc(db, 'crm_auto_tag_rules', ruleId)
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.now()
  })
}

export const deleteAutoTagRule = async (ruleId: string): Promise<void> => {
  await deleteDoc(doc(db, 'crm_auto_tag_rules', ruleId))
}

export const applyAutoTagRules = async (
  shopId: string,
  startParam: string
): Promise<string[]> => {
  const rules = await getAutoTagRules(shopId)
  const appliedTags: string[] = []

  for (const rule of rules) {
    if (!rule.isActive) continue

    const pattern = rule.pattern.replace(/\*/g, '.*')
    const regex = new RegExp(`^${pattern}$`, 'i')

    if (regex.test(startParam)) {
      appliedTags.push(...rule.tags)
    }
  }

  return [...new Set(appliedTags)]
}

export const replaceTemplateVariables = (
  template: string,
  contact: CRMContact,
  shopName?: string
): string => {
  let result = template

  result = result.replace(/\{\{name\}\}/g, contact.name || '')
  result = result.replace(/\{\{username\}\}/g, contact.username || '')
  result = result.replace(/\{\{phone\}\}/g, contact.phone || '')
  result = result.replace(/\{\{email\}\}/g, contact.email || '')
  result = result.replace(/\{\{shop_name\}\}/g, shopName || '')

  if (contact.lastOrderDate) {
    result = result.replace(
      /\{\{last_order\}\}/g,
      contact.lastOrderDate.toLocaleDateString()
    )
  }

  result = result.replace(/\{\{total_orders\}\}/g, contact.totalOrders.toString())
  result = result.replace(/\{\{total_spent\}\}/g, contact.totalSpent.toFixed(2))

  return result
}

const extractVariables = (content: string): string[] => {
  const regex = /\{\{(\w+)\}\}/g
  const variables: string[] = []
  let match

  while ((match = regex.exec(content)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1])
    }
  }

  return variables
}
