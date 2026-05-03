import React, { useState, useEffect } from 'react'
import { collection, addDoc, query, where, getDocs, updateDoc, doc, deleteDoc, orderBy } from 'firebase/firestore'
import { useFirebase } from '../../contexts/FirebaseContext'
import { useNotification } from '../../contexts/NotificationContext'
import { UserData, Shop } from '../../types'
import { Users, Clock, CheckCircle, Plus, Copy, Link, PlusCircle, UserPlus, ListTodo } from 'lucide-react'

export const CompanyManager: React.FC<{ userData: UserData | null }> = ({ userData }) => {
    const { db } = useFirebase()
    const { showNotification } = useNotification()
    const [companies, setCompanies] = useState<Shop[]>([])
    const [newCompanyName, setNewCompanyName] = useState('')
    const [loading, setLoading] = useState(false)
    const [requests, setRequests] = useState<any[]>([])

    const fetchCompanies = async () => {
        if (!userData?.uid) return
        try {
            // Find companies where user is admin in shop_customers
            const shopCustQ = query(
                collection(db, 'shop_customers'),
                where('telegramId', '==', userData.telegramId || parseInt(userData.id || '0')),
                where('role', '==', 'admin')
            )
            const snap = await getDocs(shopCustQ)
            const companyIds = snap.docs.map(d => d.data().shopId)

            if (companyIds.length > 0) {
                const companiesQ = query(collection(db, 'shops'), where('isActive', '==', true))
                const compSnap = await getDocs(companiesQ)
                const userComps = compSnap.docs
                    .filter(d => companyIds.includes(d.id))
                    .map(d => ({ id: d.id, ...d.data() } as Shop))
                setCompanies(userComps)

                // Fetch Join Requests
                const reqQ = query(collection(db, 'join_requests'), where('status', '==', 'pending'))
                const reqSnap = await getDocs(reqQ)
                const relevantReqs = reqSnap.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .filter((r: any) => companyIds.includes(r.companyId))
                setRequests(relevantReqs)
            } else {
                setCompanies([])
                setRequests([])
            }
        } catch (e) {
            console.error(e)
            setCompanies([])
            setRequests([])
        }
    }

    useEffect(() => {
        fetchCompanies()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userData])

    const handleCreateCompany = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newCompanyName) return
        if (!userData?.uid) return
        setLoading(true)
        try {
            const slug = newCompanyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
            const newComp = {
                name: newCompanyName,
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
                telegramId: userData.telegramId || parseInt(userData.id || '0'),
                role: 'admin',
                createdAt: new Date(),
                updatedAt: new Date()
            })

            showNotification('Company created!', 'success')
            setNewCompanyName('')
            fetchCompanies()
        } catch (e) {
            console.error(e)
            showNotification('Failed to create company', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleApprove = async (req: any) => {
        try {
            await addDoc(collection(db, 'shop_customers'), {
                shopId: req.companyId,
                customerId: req.userId,
                telegramId: req.telegramId,
                role: 'employee',
                createdAt: new Date(),
                updatedAt: new Date()
            })
            await updateDoc(doc(db, 'join_requests', req.id), { status: 'approved' })
            showNotification('Approved user!', 'success')
            fetchCompanies()
        } catch (e) {
            showNotification('Failed to approve', 'error')
        }
    }

    const handleReject = async (reqId: string) => {
        try {
            await updateDoc(doc(db, 'join_requests', reqId), { status: 'rejected' })
            showNotification('Rejected request', 'success')
            fetchCompanies()
        } catch (e) {
            showNotification('Failed to reject', 'error')
        }
    }

    return (
        <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <h3 className="text-lg font-bold mb-4">Create New Company</h3>
                <form onSubmit={handleCreateCompany} className="flex space-x-2">
                    <input
                        type="text"
                        value={newCompanyName}
                        onChange={e => setNewCompanyName(e.target.value)}
                        placeholder="Company Name"
                        className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
                        required
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 font-bold text-white rounded-lg flex items-center shadow disabled:opacity-50"
                    >
                        <Plus size={18} className="mr-1" /> Create
                    </button>
                </form>
            </div>

            <div className="space-y-3">
                <h3 className="font-bold text-gray-700 dark:text-gray-300 ml-1">My Managed Companies</h3>
                {companies.length === 0 ? (
                    <p className="text-gray-500 text-sm">No companies found.</p>
                ) : companies.map(comp => (
                    <div key={comp.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-bold text-lg">{comp.name}</h4>
                                <p className="text-xs text-gray-500 max-w-sm mt-1">{comp.description}</p>
                                <div className="mt-3 text-xs bg-blue-50 text-blue-700 px-3 py-2 rounded flex items-center font-mono">
                                    <Link size={14} className="mr-2" />
                                    https://t.me/your_bot?startapp={comp.id}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export const TaskManager: React.FC<{ userData: UserData | null }> = ({ userData }) => {
    const { db } = useFirebase()
    const { showNotification } = useNotification()
    const [tasks, setTasks] = useState<any[]>([])
    const [teams, setTeams] = useState<any[]>([])

    const [title, setTitle] = useState('')
    const [assignedTeamId, setAssignedTeamId] = useState('')
    const [area, setArea] = useState('')
    const [taskType, setTaskType] = useState('Installation')
    const [target, setTarget] = useState('')
    const [deadline, setDeadline] = useState('')
    const [priority, setPriority] = useState('Normal')

    useEffect(() => {
        fetchTasks()
        fetchTeams()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userData?.activeShopId])

    const fetchTasks = async () => {
        try {
            const q = query(
                collection(db, 'tasks'),
                where('shopId', '==', userData?.activeShopId || 'hr-system-company'),
                orderBy('createdAt', 'desc')
            )
            const snap = await getDocs(q)
            setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        } catch (e) {
            console.error(e)
            // Fallback without ordering index
            try {
                const fQ = query(collection(db, 'tasks'), where('shopId', '==', userData?.activeShopId || 'hr-system-company'))
                const fSnap = await getDocs(fQ)
                setTasks(fSnap.docs.map(d => ({ id: d.id, ...d.data() })))
            } catch (fallbackError) {
                console.error(fallbackError)
            }
        }
    }

    const fetchTeams = async () => {
        try {
            const q = query(collection(db, 'departments'), where('shopId', '==', userData?.activeShopId || 'hr-system-company'))
            const snap = await getDocs(q)
            setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        } catch (e) {
            console.error(e)
        }
    }

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title || !assignedTeamId || !area || !deadline) return
        try {
            const assignedTeam = teams.find(t => t.id === assignedTeamId)
            await addDoc(collection(db, 'tasks'), {
                shopId: userData?.activeShopId || 'hr-system-company',
                title,
                assignedToTeam: assignedTeamId,
                assignedTeamName: assignedTeam?.name || 'Unassigned Team',
                area,
                taskType,
                target,
                deadline,
                priority,
                status: 'pending',
                createdAt: new Date()
            })
            showNotification('Team Task Assigned', 'success')
            setTitle('')
            setArea('')
            setTarget('')
            setDeadline('')
            fetchTasks()
        } catch (e) {
            console.error(e)
        }
    }

    const handleUpdateStatus = async (id: string, status: string) => {
        try {
            await updateDoc(doc(db, 'tasks', id), { status })
            fetchTasks()
        } catch (e) {
            console.error(e)
        }
    }

    return (
        <div className="space-y-6 pb-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <h3 className="text-lg font-bold mb-4 flex items-center">
                    <ListTodo className="mr-2 text-indigo-500" /> Assign Team Task
                </h3>
                <form onSubmit={handleCreateTask} className="space-y-3">
                    <input
                        type="text"
                        placeholder="Task Description"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-indigo-500"
                        required
                    />

                    <div className="flex space-x-2">
                        <select
                            value={taskType}
                            onChange={e => setTaskType(e.target.value)}
                            className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none"
                        >
                            <option value="Installation">Installation</option>
                            <option value="Fixer">Fixer</option>
                            <option value="Delivery">Delivery</option>
                            <option value="Sales Field">Sales Field</option>
                        </select>

                        <select
                            value={priority}
                            onChange={e => setPriority(e.target.value)}
                            className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg font-bold focus:outline-none"
                        >
                            <option value="Normal">Normal Priority</option>
                            <option value="Urgent">Urgent Priority</option>
                        </select>
                    </div>

                    <div className="flex space-x-2">
                        <input
                            type="text"
                            placeholder="Location / Area"
                            value={area}
                            onChange={e => setArea(e.target.value)}
                            className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-indigo-500"
                            required
                        />
                        <input
                            type="text"
                            placeholder="Target (e.g. 18 poles)"
                            value={target}
                            onChange={e => setTarget(e.target.value)}
                            className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-indigo-500"
                            required
                        />
                    </div>

                    <div className="flex space-x-2">
                        <input
                            type="date"
                            value={deadline}
                            onChange={e => setDeadline(e.target.value)}
                            className="w-1/3 px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-indigo-500"
                            required
                        />
                        <select
                            value={assignedTeamId}
                            onChange={e => setAssignedTeamId(e.target.value)}
                            className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-indigo-500"
                            required
                        >
                            <option value="" disabled>Select Target Team</option>
                            {teams.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3 mt-4 bg-indigo-600 font-bold text-white rounded-lg flex items-center justify-center shadow"
                    >
                        Issue Assignment
                    </button>
                </form>
            </div>

            <div className="space-y-3">
                {tasks.map(t => (
                    <div key={t.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
                        <div>
                            <div className="flex space-x-2 items-center mb-1">
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${t.priority === 'Urgent' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{t.priority}</span>
                                <span className="text-[10px] uppercase font-bold bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">{t.taskType}</span>
                            </div>
                            <h4 className={`font-bold ${t.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                {t.title}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1">
                                Team: <span className="font-semibold text-gray-800 dark:text-gray-200">{t.assignedTeamName}</span>
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {t.area} • Target: {t.target} • Due: {t.deadline}
                            </p>
                        </div>
                        {t.status === 'verification_pending' ? (
                            <div className="flex flex-col space-y-2 items-end">
                                <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-md">Pending Verification</span>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => handleUpdateStatus(t.id, 'completed')}
                                        className="px-3 py-1 bg-green-600 text-white font-bold text-xs rounded-lg shadow-sm"
                                    >
                                        Verify OK
                                    </button>
                                    <button
                                        onClick={() => handleUpdateStatus(t.id, 'in_progress')}
                                        className="px-3 py-1 bg-red-100 text-red-600 font-bold text-xs rounded-lg"
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>
                        ) : t.status === 'completed' ? (
                            <div className="px-3 py-1.5 bg-gray-100 text-gray-500 text-xs font-bold rounded-lg flex items-center">
                                <CheckCircle size={12} className="mr-1" /> Verified
                            </div>
                        ) : (
                            <div className="px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg uppercase">
                                {t.status.replace('_', ' ')}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
