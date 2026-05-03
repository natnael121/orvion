import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  onSnapshot,
  Timestamp
} from 'firebase/firestore'
import { indexedDBService, SyncQueue } from './indexedDB'
import { Firestore } from 'firebase/firestore'

export interface SyncOptions {
  batchSize?: number
  maxRetries?: number
  retryDelay?: number
  syncInterval?: number
}

class CacheSyncService {
  private db: Firestore | null = null
  private syncWorker: Worker | null = null
  private syncInterval: number = 30000 // 30 seconds
  private isOnlineStatus: boolean = navigator.onLine
  private syncInProgress: boolean = false
  private listeners: Map<string, () => void> = new Map()
  private syncIntervalId: NodeJS.Timeout | null = null

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnlineStatus = true
      this.startSync()
    })
    
    window.addEventListener('offline', () => {
      this.isOnlineStatus = false
      this.stopSync()
    })
  }

  async init(firestore: Firestore, options: SyncOptions = {}) {
    this.db = firestore
    this.syncInterval = options.syncInterval || 30000
    
    try {
      // Initialize IndexedDB
      await indexedDBService.init()
      console.log('IndexedDB initialized successfully')
      
      // Load initial data from Firebase
      await this.initialDataLoad()
      
      if (this.isOnlineStatus) {
        this.startSync()
      }
    } catch (error) {
      console.error('Failed to initialize cache service:', error)
      throw error
    }
  }

  private async initialDataLoad() {
    if (!this.db) return
    
    console.log('Starting initial data load...')
    const collections = ['shops', 'products', 'categories', 'departments', 'orders', 'users']
    
    for (const collectionName of collections) {
      try {
        const collectionRef = collection(this.db, collectionName)
        const snapshot = await getDocs(collectionRef)
        
        console.log(`Loading ${snapshot.docs.length} items from ${collectionName}`)
        
        for (const docSnapshot of snapshot.docs) {
          const data = docSnapshot.data()
          await indexedDBService.set(collectionName, docSnapshot.id, {
            id: docSnapshot.id,
            ...data,
            updatedAt: data.updatedAt?.toDate() || new Date(),
            createdAt: data.createdAt?.toDate() || new Date()
          }, true)
        }
        
        console.log(`Successfully cached ${snapshot.docs.length} items from ${collectionName}`)
      } catch (error) {
        console.error(`Error loading initial data from ${collectionName}:`, error)
      }
    }
    
    console.log('Initial data load completed')
  }

  private startSync() {
    if (this.syncInProgress || !this.isOnlineStatus || !this.db) return
    
    // Clear existing interval
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId)
    }
    
    // Start periodic sync
    this.performSync()
    this.syncIntervalId = setInterval(() => {
      if (this.isOnlineStatus && !this.syncInProgress) {
        this.performSync()
      }
    }, this.syncInterval)
  }

  private stopSync() {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId)
      this.syncIntervalId = null
    }
  }

  private async performSync() {
    if (this.syncInProgress || !this.isOnlineStatus || !this.db) return
    
    this.syncInProgress = true
    
    try {
      console.log('Starting sync process...')
      await this.syncFromFirebase()
      await this.syncToFirebase()
      console.log('Sync process completed')
    } catch (error) {
      console.error('Sync error:', error)
    } finally {
      this.syncInProgress = false
    }
  }

  // Sync data from Firebase to IndexedDB
  private async syncFromFirebase() {
    if (!this.db) return

    const collections = ['shops', 'products', 'categories', 'departments', 'orders', 'users']
    
    for (const collectionName of collections) {
      try {
        const lastSyncTime = await indexedDBService.getLastSyncTime(collectionName)
        const collectionRef = collection(this.db, collectionName)
        
        let q = query(collectionRef, limit(50))
        
        if (lastSyncTime > 0) {
          q = query(
            collectionRef, 
            where('updatedAt', '>', Timestamp.fromMillis(lastSyncTime)),
            limit(50)
          )
        }

        const snapshot = await getDocs(q)
        
        for (const docSnapshot of snapshot.docs) {
          const data = docSnapshot.data()
          await indexedDBService.set(collectionName, docSnapshot.id, {
            id: docSnapshot.id,
            ...data,
            updatedAt: data.updatedAt?.toDate() || new Date(),
            createdAt: data.createdAt?.toDate() || new Date()
          }, true)
        }
        
        if (snapshot.docs.length > 0) {
          console.log(`Synced ${snapshot.docs.length} items from ${collectionName}`)
        }
      } catch (error) {
        console.error(`Error syncing ${collectionName} from Firebase:`, error)
      }
    }
  }

  // Sync pending changes to Firebase
  private async syncToFirebase() {
    if (!this.db) return

    const syncQueue = await indexedDBService.getSyncQueue()
    
    for (const syncItem of syncQueue) {
      try {
        await this.processSyncItem(syncItem)
        await indexedDBService.removeSyncQueueItem(syncItem.id)
      } catch (error) {
        console.error('Error processing sync item:', error)
        
        // Increment retry count
        const newRetries = syncItem.retries + 1
        if (newRetries < 3) {
          await indexedDBService.updateSyncQueueRetries(syncItem.id, newRetries)
        } else {
          // Remove after max retries
          await indexedDBService.removeSyncQueueItem(syncItem.id)
          console.error('Max retries reached for sync item:', syncItem)
        }
      }
    }
  }

  private async processSyncItem(syncItem: SyncQueue) {
    if (!this.db) return

    const { collection: collectionName, operation, data } = syncItem
    const collectionRef = collection(this.db, collectionName)

    switch (operation) {
      case 'create':
        const docRef = await addDoc(collectionRef, {
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        // Update local cache with Firebase ID
        await indexedDBService.set(collectionName, docRef.id, {
          id: docRef.id,
          ...data
        }, true)
        break

      case 'update':
        const updateDocRef = doc(this.db, collectionName, data.id)
        await updateDoc(updateDocRef, {
          ...data,
          updatedAt: new Date()
        })
        await indexedDBService.markAsSynced(collectionName, data.id)
        break

      case 'delete':
        const deleteDocRef = doc(this.db, collectionName, data.id)
        await deleteDoc(deleteDocRef)
        await indexedDBService.delete(collectionName, data.id)
        break
    }
  }

  // Public API methods
  async getCachedData<T>(collectionName: string, id?: string): Promise<T[] | T | null> {
    try {
      if (id) {
        const item = await indexedDBService.get(collectionName, id)
        return item && item.data ? item.data : null
      } else {
        const items = await indexedDBService.getAll(collectionName)
        const filteredData = items
          .filter(item => !item.data?.deleted && !item.deleted)
          .map(item => item.data)
          .filter(data => data) // Remove any null/undefined items
        
        console.log(`Retrieved ${filteredData.length} items from ${collectionName} cache`)
        return filteredData
      }
    } catch (error) {
      console.error(`Error getting cached data from ${collectionName}:`, error)
      return id ? null : []
    }
  }

  async setCachedData<T>(collectionName: string, id: string, data: T, syncToFirebase: boolean = true): Promise<void> {
    try {
      // Store in cache immediately
      await indexedDBService.set(collectionName, id, data, !syncToFirebase)
      
      // Add to sync queue if needed
      if (syncToFirebase && this.isOnlineStatus) {
        const existingItem = await indexedDBService.get(collectionName, id)
        const operation = existingItem?.synced ? 'update' : 'create'
        await indexedDBService.addToSyncQueue(collectionName, operation, data)
        
        // Trigger immediate sync for important operations
        if (!this.syncInProgress) {
          setTimeout(() => this.performSync(), 100)
        }
      }
    } catch (error) {
      console.error(`Error setting cached data in ${collectionName}:`, error)
      throw error
    }
  }

  async deleteCachedData(collectionName: string, id: string, syncToFirebase: boolean = true): Promise<void> {
    try {
      if (syncToFirebase && this.isOnlineStatus) {
        await indexedDBService.addToSyncQueue(collectionName, 'delete', { id })
      }
      
      await indexedDBService.delete(collectionName, id)
      
      // Trigger immediate sync
      if (syncToFirebase && !this.syncInProgress) {
        setTimeout(() => this.performSync(), 100)
      }
    } catch (error) {
      console.error(`Error deleting cached data from ${collectionName}:`, error)
      throw error
    }
  }

  async clearCache(collectionName?: string): Promise<void> {
    try {
      if (collectionName) {
        await indexedDBService.clear(collectionName)
      } else {
        const collections = ['shops', 'products', 'categories', 'departments', 'orders', 'users']
        for (const collection of collections) {
          await indexedDBService.clear(collection)
        }
      }
    } catch (error) {
      console.error('Error clearing cache:', error)
      throw error
    }
  }

  // Real-time listeners with cache fallback
  setupRealtimeListener<T>(
    collectionName: string, 
    callback: (data: T[]) => void,
    queryConstraints?: any[]
  ): () => void {
    // First, load from cache immediately
    this.getCachedData<T>(collectionName).then(cachedData => {
      if (cachedData) {
        const dataArray = Array.isArray(cachedData) ? cachedData : [cachedData]
        callback(dataArray)
      }
    })

    if (!this.db) {
      return () => {}
    }

    const collectionRef = collection(this.db, collectionName)
    let q = collectionRef

    if (queryConstraints && queryConstraints.length > 0) {
      q = query(collectionRef, ...queryConstraints)
    }

    // Then setup real-time listener
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const data: T[] = []
        snapshot.forEach(doc => {
          const docData = doc.data()
          const item = {
            id: doc.id,
            ...docData,
            createdAt: docData.createdAt?.toDate() || new Date(),
            updatedAt: docData.updatedAt?.toDate() || new Date()
          } as T
          data.push(item)
          
          // Update cache in background
          indexedDBService.set(collectionName, doc.id, item, true)
        })
        callback(data)
      },
      (error) => {
        console.error(`Real-time listener error for ${collectionName}:`, error)
        // Fallback to cached data on error
        this.getCachedData<T>(collectionName).then(cachedData => {
          if (cachedData) {
            const dataArray = Array.isArray(cachedData) ? cachedData : [cachedData]
            callback(dataArray)
          }
        })
      }
    )

    this.listeners.set(collectionName, unsubscribe)
    return unsubscribe
  }

  // Utility methods
  isOffline(): boolean {
    return !this.isOnlineStatus
  }

  async getSyncStatus(): Promise<{
    pendingSync: number
    lastSyncTime: number
    isOnline: boolean
  }> {
    try {
      const syncQueue = await indexedDBService.getSyncQueue()
      return {
        pendingSync: syncQueue.length,
        lastSyncTime: Date.now(),
        isOnline: this.isOnlineStatus
      }
    } catch (error) {
      console.error('Error getting sync status:', error)
      return {
        pendingSync: 0,
        lastSyncTime: 0,
        isOnline: this.isOnlineStatus
      }
    }
  }

  async forcSync(): Promise<void> {
    if (this.isOnlineStatus && !this.syncInProgress) {
      await this.performSync()
    }
  }
}

export const cacheSyncService = new CacheSyncService()