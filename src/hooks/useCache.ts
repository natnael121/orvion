import { useState, useEffect, useCallback } from 'react'
import { cacheSyncService } from '../services/cacheSync'

export interface UseCacheOptions {
  enableRealtime?: boolean
  fallbackToCache?: boolean
  syncOnMount?: boolean
}
export function useActiveShops() {
  const result = useCache<Shop>('shops', undefined, {
    enableRealtime: true,
    syncOnMount: true
  })

  const shopsData = result.data && Array.isArray(result.data) ? result.data : []
  const activeShops = shopsData.filter((shop: Shop) => shop.isActive)

  return {
    ...result,
    data: activeShops
  }
}
export function useCache<T>(
  collectionName: string,
  id?: string,
  options: UseCacheOptions = {}
) {
  const [data, setData] = useState<T | T[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOffline, setIsOffline] = useState(cacheSyncService.isOffline())

  const {
    enableRealtime = true,
    fallbackToCache = true,
    syncOnMount = false
  } = options

  // Load data function
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      console.log(`Loading data from ${collectionName}${id ? ` with id ${id}` : ''}`)

      const cachedData = await cacheSyncService.getCachedData<T>(collectionName, id)

      if (cachedData) {
        console.log(`Found cached data for ${collectionName}:`, cachedData)
        setData(cachedData)
      } else {
        console.log(`No cached data found for ${collectionName}`)
        setData(id ? null : [])
      }

      if (syncOnMount && !cacheSyncService.isOffline()) {
        console.log('Forcing sync on mount...')
        await cacheSyncService.forcSync()

        // Reload data after sync
        const updatedData = await cacheSyncService.getCachedData<T>(collectionName, id)
        if (updatedData) {
          setData(updatedData)
        }
      }
    } catch (err) {
      console.error(`Error loading data from ${collectionName}:`, err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
      // Set empty data on error to prevent undefined issues
      setData(id ? null : [])
    } finally {
      setLoading(false)
    }
  }, [collectionName, id, syncOnMount])

  // Update data function
  const updateData = useCallback(async (newData: T, syncToFirebase: boolean = true) => {
    try {
      if (!id) throw new Error('ID is required for updates')

      console.log(`Updating data in ${collectionName} with id ${id}`)
      await cacheSyncService.setCachedData(collectionName, id, newData, syncToFirebase)

      // Update local state immediately for better UX
      setData(newData)
    } catch (err) {
      console.error(`Error updating data in ${collectionName}:`, err)
      setError(err instanceof Error ? err.message : 'Failed to update data')
      throw err
    }
  }, [collectionName, id])

  // Delete data function
  const deleteData = useCallback(async (syncToFirebase: boolean = true) => {
    try {
      if (!id) throw new Error('ID is required for deletion')

      console.log(`Deleting data from ${collectionName} with id ${id}`)
      await cacheSyncService.deleteCachedData(collectionName, id, syncToFirebase)
      setData(null)
    } catch (err) {
      console.error(`Error deleting data from ${collectionName}:`, err)
      setError(err instanceof Error ? err.message : 'Failed to delete data')
      throw err
    }
  }, [collectionName, id])

  // Create data function
  const createData = useCallback(async (newData: T & { id: string }, syncToFirebase: boolean = true) => {
    try {
      console.log(`Creating data in ${collectionName} with id ${newData.id}`)
      await cacheSyncService.setCachedData(collectionName, newData.id, newData, syncToFirebase)

      // If we're loading a collection, refresh the data
      if (!id) {
        await loadData()
      } else {
        setData(newData)
      }
    } catch (err) {
      console.error(`Error creating data in ${collectionName}:`, err)
      setError(err instanceof Error ? err.message : 'Failed to create data')
      throw err
    }
  }, [collectionName, id, loadData])

  // Setup real-time listener or load data on mount
  useEffect(() => {
    if (enableRealtime && !id) {
      console.log(`Setting up realtime listener for ${collectionName}`)
      // Setup real-time listener for collections
      const unsubscribe = cacheSyncService.setupRealtimeListener<T>(
        collectionName,
        (newData) => {
          console.log(`Received realtime update for ${collectionName}:`, newData)
          setData(newData)
          setLoading(false)
        }
      )
      return unsubscribe
    } else {
      // Load data once for single documents or when real-time is disabled
      loadData()
    }
  }, [collectionName, id, enableRealtime, loadData])

  // Listen for online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('App came online')
      setIsOffline(false)
    }
    const handleOffline = () => {
      console.log('App went offline')
      setIsOffline(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return {
    data,
    loading,
    error,
    isOffline,
    updateData,
    deleteData,
    createData,
    refetch: loadData
  }
}

// Specialized hooks for common use cases
export function useShops() {
  const result = useCache<Shop>('shops', undefined, { enableRealtime: true, syncOnMount: true })

  // Ensure we always return an array for shops
  const shopsData = result.data && Array.isArray(result.data) ? result.data : []

  return {
    ...result,
    data: shopsData
  }
}

export function useShop(shopId: string) {
  return useCache<Shop>('shops', shopId)
}

export function useProducts(shopId?: string) {
  const result = useCache<Product>('products', undefined, { enableRealtime: true })

  // Filter by shopId if provided
  const productsData = result.data && Array.isArray(result.data) ? result.data : []
  const filteredData = shopId
    ? productsData.filter((product: Product) => product.shopId === shopId)
    : productsData

  return {
    ...result,
    data: filteredData
  }
}

export function useProduct(productId: string) {
  return useCache<any>('products', productId)
}

export function useCategories(shopId?: string) {
  const result = useCache<Category>('categories', undefined, { enableRealtime: true })

  // Filter by shopId if provided
  const categoriesData = result.data && Array.isArray(result.data) ? result.data : []
  const filteredData = shopId
    ? categoriesData.filter((category: Category) => category.shopId === shopId)
    : categoriesData

  return {
    ...result,
    data: filteredData
  }
}

export function useDepartments(shopId?: string) {
  const result = useCache<Department>('departments', undefined, { enableRealtime: true })

  // Filter by shopId if provided
  const departmentsData = result.data && Array.isArray(result.data) ? result.data : []
  const filteredData = shopId
    ? departmentsData.filter((department: Department) => department.shopId === shopId)
    : departmentsData

  return {
    ...result,
    data: filteredData
  }
}

export function useOrders(customerId?: string) {
  const result = useCache<Order>('orders', undefined, { enableRealtime: true })

  // Filter by customerId if provided
  const ordersData = result.data && Array.isArray(result.data) ? result.data : []
  const filteredData = customerId
    ? ordersData.filter((order: Order) => order.customerId === customerId)
    : ordersData

  return {
    ...result,
    data: filteredData
  }
}