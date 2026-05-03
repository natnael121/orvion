import React, { useState, useEffect } from 'react'
import { collection, query, where, getDocs, deleteDoc, doc, addDoc, updateDoc } from 'firebase/firestore'
import { useFirebase } from '../../contexts/FirebaseContext'
import { useNotification } from '../../contexts/NotificationContext'
import DepartmentCard from './DepartmentCard'
import DepartmentEditModal from './DepartmentEditModal'
import { Plus, LayoutGrid, Info } from 'lucide-react'

export const DepartmentList: React.FC<{ userData: any }> = ({ userData }) => {
    const { db } = useFirebase()
    const { showNotification } = useNotification() || { showNotification: (msg: string) => alert(msg) }

    const [departments, setDepartments] = useState<any[]>([])
    const [isEditing, setIsEditing] = useState(false)
    const [editingDept, setEditingDept] = useState<any>(null)

    const shopId = userData?.activeShopId || 'hr-system-company'

    const fetchDepartments = async () => {
        try {
            const q = query(
                collection(db, 'departments'),
                where('shopId', '==', shopId)
            )
            const snap = await getDocs(q)
            setDepartments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
        } catch (error) {
            console.error(error)
        }
    }

    useEffect(() => {
        fetchDepartments()
    }, [shopId])

    const handleSave = async (data: any) => {
        try {
            const cleanData = {
                ...data,
                updatedAt: new Date(),
                createdAt: data.createdAt || new Date()
            }
            if (editingDept && editingDept.id) {
                await updateDoc(doc(db, 'departments', editingDept.id), cleanData)
                showNotification('success', 'Team configuration updated')
            } else {
                await addDoc(collection(db, 'departments'), cleanData)
                showNotification('success', 'New Squad deployed')
            }
            setIsEditing(false)
            fetchDepartments()
        } catch (e) {
            console.error(e)
            showNotification('error', 'Deployment failed')
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to deactivate this operational squad?')) return
        try {
            await deleteDoc(doc(db, 'departments', id))
            showNotification('success', 'Squad removed from roster')
            fetchDepartments()
        } catch (e) {
            console.error(e)
        }
    }

    return (
        <div className="space-y-6 pb-12">
            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-8 rounded-[2rem] text-white shadow-xl shadow-blue-500/20">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-2xl font-black mb-1">Squad Command</h3>
                        <p className="text-blue-100 text-xs font-bold uppercase tracking-widest opacity-80">Roster & Operational Departments</p>
                    </div>
                    <button
                        onClick={() => { setEditingDept(null); setIsEditing(true); }}
                        className="bg-white text-indigo-600 px-6 py-3 rounded-2xl font-black flex items-center shadow-lg hover:scale-105 transition-transform"
                    >
                        <Plus size={20} className="mr-2" /> NEW SQUAD
                    </button>
                </div>

                <div className="flex gap-4">
                    <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-bold flex items-center">
                        <LayoutGrid size={14} className="mr-2" /> {departments.length} Units Active
                    </div>
                </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/20 flex items-start space-x-3">
                <Info size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] leading-relaxed text-blue-700 dark:text-blue-300 font-medium">
                    Departments define how tasks are filtered and which groups receive live Telegram alerts.
                    Assigning a <b>Supervisor</b> ensures accountability for Field Logs and Material Verification.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {departments.sort((a, b) => (a.order || 0) - (b.order || 0)).map((dept) => (
                    <DepartmentCard
                        key={dept.id}
                        department={dept}
                        onEdit={() => { setEditingDept(dept); setIsEditing(true); }}
                        onDelete={handleDelete}
                    />
                ))}
            </div>

            {departments.length === 0 && (
                <div className="text-center py-20 px-6 bg-white dark:bg-gray-800 rounded-[2rem] border-2 border-dashed border-gray-100 dark:border-gray-700">
                    <div className="bg-gray-50 dark:bg-gray-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Plus className="text-gray-300" size={32} />
                    </div>
                    <h4 className="font-black text-gray-800 dark:text-gray-200">No Squads Registered</h4>
                    <p className="text-sm text-gray-500 max-w-xs mx-auto mt-2 font-medium">
                        Create your first operational department to start assigning tasks and tracking progress.
                    </p>
                </div>
            )}

            {isEditing && (
                <DepartmentEditModal
                    department={editingDept}
                    userId={userData?.uid || ''}
                    shopId={shopId}
                    onSave={handleSave}
                    onCancel={() => setIsEditing(false)}
                />
            )}
        </div>
    )
}
