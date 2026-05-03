import React, { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { useFirebase } from '../contexts/FirebaseContext'
import ShopCatalog from './ShopCatalog'
import { Shop } from '../types'

export const InventoryWrapper: React.FC<{ shopId: string; onBack: () => void }> = ({ shopId, onBack }) => {
    const { db } = useFirebase()
    const [shop, setShop] = useState<Shop | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchShop = async () => {
            if (!shopId) return
            try {
                const docRef = doc(db, 'shops', shopId)
                const s = await getDoc(docRef)
                if (s.exists()) {
                    setShop({ id: s.id, ...s.data() } as Shop)
                }
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        fetchShop()
    }, [db, shopId])

    if (loading) return <div>Loading Catalog...</div>
    if (!shop) return <div>Shop not found.</div>

    return <ShopCatalog shop={shop} onBack={onBack} />
}
