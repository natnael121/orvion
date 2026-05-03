import { collection, query, where, getDocs, addDoc, doc, getDoc, deleteDoc } from 'firebase/firestore'
import { Firestore } from 'firebase/firestore'
import { syncContact } from './crmSyncService'
import { applyAutoTagRules } from './crmService'

export interface ShopAccessResult {
  success: boolean
  shopId: string | null
  productId: string | null
  isNewCustomer: boolean
  error?: string
}

export const shopCustomerService = {
  async parseStartParam(startParam: string): Promise<{ shopId: string; productId: string | null }> {
    const parts = startParam.split('_')
    return {
      shopId: parts[0],
      productId: parts.length > 1 ? parts.slice(1).join('_') : null
    }
  },

  async checkIfCustomerExists(
    db: Firestore,
    shopId: string,
    telegramId: number
  ): Promise<boolean> {
    try {
      const shopCustomersRef = collection(db, 'shop_customers')
      const customerQuery = query(
        shopCustomersRef,
        where('shopId', '==', shopId),
        where('telegramId', '==', telegramId)
      )
      const snapshot = await getDocs(customerQuery)
      return !snapshot.empty
    } catch (error) {
      console.error('Error checking customer existence:', error)
      return false
    }
  },

  async addCustomerToShop(
    db: Firestore,
    shopId: string,
    customerId: string,
    telegramId: number,
    role: 'admin' | 'customer' = 'customer'
  ): Promise<boolean> {
    try {
      const shopCustomersRef = collection(db, 'shop_customers')
      await addDoc(shopCustomersRef, {
        customerId,
        telegramId,
        shopId,
        role,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      return true
    } catch (error) {
      console.error('Error adding customer to shop:', error)
      return false
    }
  },

  async getUserIdByTelegramId(db: Firestore, telegramId: number): Promise<string | null> {
    try {
      const usersRef = collection(db, 'users')
      const userQuery = query(
        usersRef,
        where('telegramId', '==', telegramId)
      )
      const snapshot = await getDocs(userQuery)

      if (snapshot.empty) {
        const altQuery = query(usersRef, where('telegram_id', '==', telegramId))
        const altSnapshot = await getDocs(altQuery)

        if (altSnapshot.empty) {
          return null
        }
        return altSnapshot.docs[0].id
      }

      return snapshot.docs[0].id
    } catch (error) {
      console.error('Error getting user ID:', error)
      return null
    }
  },

  async verifyShopExists(db: Firestore, shopId: string): Promise<boolean> {
    try {
      const shopRef = doc(db, 'shops', shopId)
      const shopDoc = await getDoc(shopRef)
      return shopDoc.exists() && shopDoc.data()?.isActive === true
    } catch (error) {
      console.error('Error verifying shop:', error)
      return false
    }
  },

  async createUserIfNotExists(
    db: Firestore,
    telegramId: number,
    displayName: string = 'Customer'
  ): Promise<string | null> {
    try {
      const userId = await this.getUserIdByTelegramId(db, telegramId)

      if (userId) {
        return userId
      }

      const usersRef = collection(db, 'users')
      const newUserData = {
        displayName,
        telegramId,
        telegram_id: telegramId,
        role: 'customer',
        profileCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const userDocRef = await addDoc(usersRef, newUserData)
      console.log('Created new user:', userDocRef.id)
      return userDocRef.id
    } catch (error) {
      console.error('Error creating user:', error)
      return null
    }
  },

  async handleShopLinkAccess(
    db: Firestore,
    startParam: string,
    telegramId: number,
    displayName?: string
  ): Promise<ShopAccessResult> {
    try {
      const { shopId, productId } = await this.parseStartParam(startParam)

      const shopExists = await this.verifyShopExists(db, shopId)
      if (!shopExists) {
        return {
          success: false,
          shopId: null,
          productId: null,
          isNewCustomer: false,
          error: 'Shop not found or inactive'
        }
      }

      const isExistingCustomer = await this.checkIfCustomerExists(db, shopId, telegramId)

      if (!isExistingCustomer) {
        let userId = await this.getUserIdByTelegramId(db, telegramId)

        if (!userId) {
          userId = await this.createUserIfNotExists(db, telegramId, displayName)

          if (!userId) {
            return {
              success: false,
              shopId: null,
              productId: null,
              isNewCustomer: false,
              error: 'Failed to create user record'
            }
          }
        }

        const added = await this.addCustomerToShop(db, shopId, userId, telegramId, 'customer')

        if (!added) {
          return {
            success: false,
            shopId: null,
            productId: null,
            isNewCustomer: false,
            error: 'Failed to add customer to shop'
          }
        }

        try {
          await syncContact(shopId, telegramId)

          if (startParam) {
            const tags = await applyAutoTagRules(shopId, startParam)
            if (tags.length > 0) {
              console.log(`Applied auto-tags for ${telegramId}:`, tags)
            }
          }
        } catch (error) {
          console.error('Error syncing CRM contact:', error)
        }

        return {
          success: true,
          shopId,
          productId,
          isNewCustomer: true
        }
      }

      return {
        success: true,
        shopId,
        productId,
        isNewCustomer: false
      }
    } catch (error) {
      console.error('Error handling shop link access:', error)
      return {
        success: false,
        shopId: null,
        productId: null,
        isNewCustomer: false,
        error: 'Failed to process shop link'
      }
    }
  },

  async removeCustomerFromShop(
    db: Firestore,
    shopId: string,
    telegramId: number
  ): Promise<{ success: boolean; error?: string; deletedRecord?: any }> {
    try {
      console.log('[removeCustomerFromShop] Starting removal:', { shopId, telegramId })

      const shopRef = doc(db, 'shops', shopId)
      const shopDoc = await getDoc(shopRef)

      if (!shopDoc.exists()) {
        console.log('[removeCustomerFromShop] Shop not found')
        return {
          success: false,
          error: 'Shop not found'
        }
      }

      const shopData = shopDoc.data()
      console.log('[removeCustomerFromShop] Shop data:', { ownerId: shopData.ownerId })
      if (shopData.ownerId) {
        const ownerUsersRef = collection(db, 'users')

        // Check with telegramId field
        const ownerQuery = query(
          ownerUsersRef,
          where('telegramId', '==', telegramId)
        )
        const ownerSnapshot = await getDocs(ownerQuery)

        console.log('[removeCustomerFromShop] Owner query results:', {
          found: !ownerSnapshot.empty,
          count: ownerSnapshot.docs.length
        })

        if (!ownerSnapshot.empty) {
          const ownerDoc = ownerSnapshot.docs[0]
          console.log('[removeCustomerFromShop] Found owner by telegramId:', {
            ownerDocId: ownerDoc.id,
            shopOwnerId: shopData.ownerId,
            isOwner: ownerDoc.id === shopData.ownerId
          })
          if (ownerDoc.id === shopData.ownerId) {
            return {
              success: false,
              error: 'Cannot remove shop owner from their own shop'
            }
          }
        } else {
          // Try with telegram_id field as fallback
          const altOwnerQuery = query(
            ownerUsersRef,
            where('telegram_id', '==', telegramId)
          )
          const altOwnerSnapshot = await getDocs(altOwnerQuery)

          console.log('[removeCustomerFromShop] Alt owner query results:', {
            found: !altOwnerSnapshot.empty,
            count: altOwnerSnapshot.docs.length
          })

          if (!altOwnerSnapshot.empty) {
            const ownerDoc = altOwnerSnapshot.docs[0]
            console.log('[removeCustomerFromShop] Found owner by telegram_id:', {
              ownerDocId: ownerDoc.id,
              shopOwnerId: shopData.ownerId,
              isOwner: ownerDoc.id === shopData.ownerId
            })
            if (ownerDoc.id === shopData.ownerId) {
              return {
                success: false,
                error: 'Cannot remove shop owner from their own shop'
              }
            }
          }
        }
      }

      console.log('[removeCustomerFromShop] Querying shop_customers collection')
      const shopCustomersRef = collection(db, 'shop_customers')
      const customerQuery = query(
        shopCustomersRef,
        where('shopId', '==', shopId),
        where('telegramId', '==', telegramId)
      )
      const snapshot = await getDocs(customerQuery)

      console.log('[removeCustomerFromShop] Customer query results:', {
        found: !snapshot.empty,
        count: snapshot.docs.length
      })

      if (snapshot.empty) {
        console.log('[removeCustomerFromShop] Customer access not found')
        return {
          success: false,
          error: 'Customer access not found'
        }
      }

      const docToDelete = snapshot.docs[0]
      const deletedData = {
        id: docToDelete.id,
        ...docToDelete.data()
      }

      console.log('[removeCustomerFromShop] Deleting document:', docToDelete.id)
      await deleteDoc(docToDelete.ref)

      console.log('[removeCustomerFromShop] Successfully removed customer from shop')
      return {
        success: true,
        deletedRecord: deletedData
      }
    } catch (error) {
      console.error('[removeCustomerFromShop] Error removing customer from shop:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove shop access'
      }
    }
  },

  async restoreCustomerToShop(
    db: Firestore,
    deletedRecord: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!deletedRecord || !deletedRecord.shopId || !deletedRecord.telegramId) {
        return {
          success: false,
          error: 'Invalid record data'
        }
      }

      const shopCustomersRef = collection(db, 'shop_customers')
      const { id, ...recordData } = deletedRecord

      await addDoc(shopCustomersRef, recordData)

      return {
        success: true
      }
    } catch (error) {
      console.error('Error restoring customer to shop:', error)
      return {
        success: false,
        error: 'Failed to restore shop access'
      }
    }
  }
}
 