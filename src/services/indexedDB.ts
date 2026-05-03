// IndexedDB service for offline caching
export interface CacheItem<T = any> {
  id: string
  data: T
  timestamp: number
  version: number
  synced: boolean
  deleted?: boolean
}

export interface SyncQueue {
  id: string
  collection: string
  operation: 'create' | 'update' | 'delete'
  data: any
  timestamp: number
  retries: number
}

class IndexedDBService {
  private db: IDBDatabase | null = null
  private dbName = 'MultiShopCache'
  private version = 2
  private stores = ['shops', 'products', 'categories', 'departments', 'orders', 'users', 'syncQueue']

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => {
        console.error('IndexedDB error:', request.error)
        reject(request.error)
      }
      
      request.onsuccess = () => {
        this.db = request.result
        console.log('IndexedDB opened successfully')
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        console.log('Upgrading IndexedDB schema...')

        // Create object stores
        this.stores.forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            console.log(`Creating object store: ${storeName}`)
            const store = db.createObjectStore(storeName, { keyPath: 'id' })
            
            // Add indexes for common queries
            if (storeName !== 'syncQueue') {
              store.createIndex('timestamp', 'timestamp')
              store.createIndex('synced', 'synced')
              try {
                store.createIndex('shopId', 'data.shopId', { unique: false })
              } catch (e) {
                // Index might already exist or data.shopId might not be available
                console.log(`Could not create shopId index for ${storeName}`)
              }
            } else {
              store.createIndex('timestamp', 'timestamp')
              store.createIndex('collection', 'collection')
            }
          }
        })
      }

      request.onblocked = () => {
        console.warn('IndexedDB upgrade blocked')
      }
    })
  }

  private async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    if (!this.db) {
      await this.init()
    }
    
    if (!this.db) {
      throw new Error('IndexedDB not initialized')
    }

    try {
      const transaction = this.db.transaction([storeName], mode)
      transaction.onerror = () => {
        console.error(`Transaction error for ${storeName}:`, transaction.error)
      }
      return transaction.objectStore(storeName)
    } catch (error) {
      console.error(`Error getting store ${storeName}:`, error)
      throw error
    }
  }

  // Generic CRUD operations
  async get<T>(storeName: string, id: string): Promise<CacheItem<T> | null> {
    try {
      const store = await this.getStore(storeName)
      return new Promise((resolve, reject) => {
        const request = store.get(id)
        request.onsuccess = () => resolve(request.result || null)
        request.onerror = () => {
          console.error(`Error getting item ${id} from ${storeName}:`, request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      console.error(`Error getting item from ${storeName}:`, error)
      return null
    }
  }

  async getAll<T>(storeName: string, filter?: (item: CacheItem<T>) => boolean): Promise<CacheItem<T>[]> {
    try {
      const store = await this.getStore(storeName)
      return new Promise((resolve, reject) => {
        const request = store.getAll()
        request.onsuccess = () => {
          let results = request.result || []
          if (filter) {
            results = results.filter(filter)
          }
          resolve(results)
        }
        request.onerror = () => {
          console.error(`Error getting all items from ${storeName}:`, request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      console.error(`Error getting all items from ${storeName}:`, error)
      return []
    }
  }

  async set<T>(storeName: string, id: string, data: T, synced: boolean = false): Promise<void> {
    try {
      const store = await this.getStore(storeName, 'readwrite')
      const cacheItem: CacheItem<T> = {
        id,
        data,
        timestamp: Date.now(),
        version: 1,
        synced
      }

      return new Promise((resolve, reject) => {
        const request = store.put(cacheItem)
        request.onsuccess = () => resolve()
        request.onerror = () => {
          console.error(`Error setting item ${id} in ${storeName}:`, request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      console.error(`Error setting item in ${storeName}:`, error)
      throw error
    }
  }

  async delete(storeName: string, id: string): Promise<void> {
    try {
      const store = await this.getStore(storeName, 'readwrite')
      return new Promise((resolve, reject) => {
        const request = store.delete(id)
        request.onsuccess = () => resolve()
        request.onerror = () => {
          console.error(`Error deleting item ${id} from ${storeName}:`, request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      console.error(`Error deleting item from ${storeName}:`, error)
      throw error
    }
  }

  async clear(storeName: string): Promise<void> {
    try {
      const store = await this.getStore(storeName, 'readwrite')
      return new Promise((resolve, reject) => {
        const request = store.clear()
        request.onsuccess = () => {
          console.log(`Cleared ${storeName} store`)
          resolve()
        }
        request.onerror = () => {
          console.error(`Error clearing ${storeName}:`, request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      console.error(`Error clearing ${storeName}:`, error)
      throw error
    }
  }

  // Sync queue operations
  async addToSyncQueue(collection: string, operation: 'create' | 'update' | 'delete', data: any): Promise<void> {
    try {
      const syncItem: SyncQueue = {
        id: `${collection}_${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        collection,
        operation,
        data,
        timestamp: Date.now(),
        retries: 0
      }

      const store = await this.getStore('syncQueue', 'readwrite')
      return new Promise((resolve, reject) => {
        const request = store.put(syncItem)
        request.onsuccess = () => resolve()
        request.onerror = () => {
          console.error('Error adding to sync queue:', request.error)
          reject(request.error)
        }
      })
    } catch (error) {
      console.error('Error adding to sync queue:', error)
      throw error
    }
  }

  async getSyncQueue(): Promise<SyncQueue[]> {
    try {
      const items = await this.getAll<SyncQueue>('syncQueue')
      return items.map(item => item.data || item).filter(item => item.collection)
    } catch (error) {
      console.error('Error getting sync queue:', error)
      return []
    }
  }

  async removeSyncQueueItem(id: string): Promise<void> {
    return this.delete('syncQueue', id)
  }

  async updateSyncQueueRetries(id: string, retries: number): Promise<void> {
    try {
      const item = await this.get<SyncQueue>('syncQueue', id)
      if (item) {
        const updatedData = { ...item.data, retries }
        const store = await this.getStore('syncQueue', 'readwrite')
        return new Promise((resolve, reject) => {
          const request = store.put({ ...item, data: updatedData })
          request.onsuccess = () => resolve()
          request.onerror = () => {
            console.error('Error updating sync queue retries:', request.error)
            reject(request.error)
          }
        })
      }
    } catch (error) {
      console.error('Error updating sync queue retries:', error)
      throw error
    }
  }

  // Utility methods
  async getLastSyncTime(collection: string): Promise<number> {
    try {
      const items = await this.getAll(collection)
      if (items.length === 0) return 0
      return Math.max(...items.map(item => item.timestamp))
    } catch (error) {
      console.error(`Error getting last sync time for ${collection}:`, error)
      return 0
    }
  }

  async markAsSynced(storeName: string, id: string): Promise<void> {
    try {
      const item = await this.get(storeName, id)
      if (item) {
        item.synced = true
        item.timestamp = Date.now()
        const store = await this.getStore(storeName, 'readwrite')
        return new Promise((resolve, reject) => {
          const request = store.put(item)
          request.onsuccess = () => resolve()
          request.onerror = () => {
            console.error(`Error marking ${id} as synced in ${storeName}:`, request.error)
            reject(request.error)
          }
        })
      }
    } catch (error) {
      console.error(`Error marking as synced in ${storeName}:`, error)
      throw error
    }
  }

  async getUnsyncedItems<T>(storeName: string): Promise<CacheItem<T>[]> {
    return this.getAll<T>(storeName, item => !item.synced)
  }
}

export const indexedDBService = new IndexedDBService()