import React, { useState } from 'react'
import { collection, query, where, getDocs, addDoc, doc, updateDoc } from 'firebase/firestore'
import { useFirebase } from '../contexts/FirebaseContext'
import { useNotification } from '../contexts/NotificationContext'
import { Building2, Search, PlusCircle, UserPlus, Clock } from 'lucide-react'
import { UserData, User } from '../types'

interface CompanyLandingProps {
    user: User
    userData: UserData | null
    onCompanyDetermined: () => void
}

export const CompanyLanding: React.FC<CompanyLandingProps> = ({ user, userData, onCompanyDetermined }) => {
    const { db } = useFirebase()
    const { showNotification } = useNotification()

    const [view, setView] = useState<'options' | 'join' | 'create'>('options')

    // Join state
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [searching, setSearching] = useState(false)

    // Create state
    const [companyName, setCompanyName] = useState('')
    const [creating, setCreating] = useState(false)

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!searchQuery.trim()) return

        setSearching(true)
        try {
            const q = query(collection(db, 'shops'), where('isActive', '==', true))
            const snap = await getDocs(q)
            const matches = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter((c: any) => c.name.toLowerCase().includes(searchQuery.toLowerCase().trim()))

            setSearchResults(matches)
        } catch (e) {
            console.error(e)
            showNotification('Search failed', 'error')
        } finally {
            setSearching(false)
        }
    }

    const handleRequestJoin = async (companyId: string, companyName: string) => {
        if (!userData?.uid) {
            showNotification('Please wait for profile to load', 'error')
            return
        }
        try {
            const reqQ = query(
                collection(db, 'join_requests'),
                where('companyId', '==', companyId),
                where('userId', '==', userData.uid)
            )
            const existing = await getDocs(reqQ)
            if (!existing.empty) {
                showNotification('You already have a pending request for this company', 'error')
                return
            }

            await addDoc(collection(db, 'join_requests'), {
                companyId,
                companyName,
                userId: userData.uid,
                telegramId: userData.telegramId || parseInt(user.id),
                userName: userData.displayName || user.firstName,
                status: 'pending',
                createdAt: new Date()
            })
            showNotification('Join request sent! Pending admin approval.', 'success')
            setView('options')
        } catch (e) {
            console.error(e)
            showNotification('Failed to send request', 'error')
        }
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!companyName.trim() || !userData?.uid) return

        setCreating(true)
        try {
            const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
            const newComp = {
                name: companyName,
                slug,
                description: 'New HR Company',
                ownerId: userData.uid,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            }
            const docRef = await addDoc(collection(db, 'shops'), newComp)

            // Auto assign as admin
            await addDoc(collection(db, 'shop_customers'), {
                shopId: docRef.id,
                customerId: userData.uid,
                telegramId: userData.telegramId || parseInt(user.id),
                role: 'admin',
                createdAt: new Date(),
                updatedAt: new Date()
            })

            showNotification('Company created successfully!', 'success')
            onCompanyDetermined()
        } catch (e) {
            console.error(e)
            showNotification('Failed to create company', 'error')
        } finally {
            setCreating(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col pt-12 px-4 space-y-6">
            <div className="text-center space-y-2 mb-8">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow">
                    <Building2 size={32} />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Welcome to HR Portal</h2>
                <p className="text-sm text-gray-500">You don't belong to any company yet.</p>
            </div>

            {view === 'options' && (
                <div className="space-y-4 max-w-sm mx-auto w-full">
                    <button
                        onClick={() => setView('join')}
                        className="w-full bg-white border-2 border-blue-100 p-6 rounded-2xl shadow-sm hover:border-blue-500 hover:shadow-md transition-all text-left flex items-center group cursor-pointer"
                    >
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                            <Search size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-800">Join a Company</h3>
                            <p className="text-xs text-gray-500">Search and request to join existing</p>
                        </div>
                    </button>

                    <button
                        onClick={() => setView('create')}
                        className="w-full bg-white border-2 border-green-100 p-6 rounded-2xl shadow-sm hover:border-green-500 hover:shadow-md transition-all text-left flex items-center group cursor-pointer"
                    >
                        <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                            <PlusCircle size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-800">Create a Company</h3>
                            <p className="text-xs text-gray-500">Set up a new company portal</p>
                        </div>
                    </button>
                </div>
            )}

            {view === 'join' && (
                <div className="w-full max-w-sm mx-auto space-y-4">
                    <button onClick={() => setView('options')} className="text-sm text-blue-600 font-bold mb-4">← Back</button>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-bold mb-4 text-gray-800">Search Company</h3>
                        <form onSubmit={handleSearch} className="flex space-x-2">
                            <input
                                type="text"
                                placeholder="Company Name..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                            />
                            <button
                                type="submit"
                                disabled={searching}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold shadow"
                            >
                                Find
                            </button>
                        </form>
                    </div>

                    <div className="space-y-3 mt-4">
                        {searchResults.map(c => (
                            <div key={c.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                                <div>
                                    <h4 className="font-bold text-gray-800">{c.name}</h4>
                                    <p className="text-xs text-gray-500">Company ID: {c.id.substring(0, 5)}...</p>
                                </div>
                                <button
                                    onClick={() => handleRequestJoin(c.id, c.name)}
                                    className="px-3 py-1.5 bg-blue-50 text-blue-600 text-sm font-bold rounded-lg hover:bg-blue-100"
                                >
                                    Request Join
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {view === 'create' && (
                <div className="w-full max-w-sm mx-auto space-y-4">
                    <button onClick={() => setView('options')} className="text-sm text-blue-600 font-bold mb-4">← Back</button>
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-bold mb-4 text-gray-800">Create New Company</h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Company Name</label>
                                <input
                                    type="text"
                                    required
                                    value={companyName}
                                    onChange={e => setCompanyName(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-green-500"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={creating}
                                className="w-full py-3 bg-green-600 text-white font-bold rounded-lg shadow disabled:opacity-50 flex justify-center items-center"
                            >
                                {creating ? 'Creating...' : 'Create Company'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

        </div>
    )
}
