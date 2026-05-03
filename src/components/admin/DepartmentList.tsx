import React, { useState, useEffect } from 'react'
import { collection, query, where, getDocs, deleteDoc, doc, addDoc, updateDoc } from 'firebase/firestore'
import { useFirebase } from '../../contexts/FirebaseContext'
import { useNotification } from '../../contexts/NotificationContext'
import DepartmentCard from './DepartmentCard'
import DepartmentEditModal from './DepartmentEditModal'
import { Plus } from 'lucide-react'

export const DepartmentList: React.FC<{ userData: any }> = ({ userData }) => {
    const { db } = useFirebase()
    const { showNotification } = useNotification()

    const [departments, setDepartments] = useState<any[]>([])
    const [isEditing, setIsEditing] = useState(false)
    const [editingDept, setEditingDept] = useState<any>(null)

    // Basic fallback shop for HR:
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shopId])

    const handleSave = async (data: any) => {
        try {
            if (editingDept && editingDept.id) {
                await updateDoc(doc(db, 'departments', editingDept.id), data)
                showNotification('Department updated', 'success')
            } else {
                await addDoc(collection(db, 'departments'), { ...data, shopId })
                showNotification('Department created', 'success')
            }
            setIsEditing(false)
            fetchDepartments()
        } catch (e) {
            console.error(e)
            showNotification('Error saving department', 'error')
        }
    }

    const handleDelete = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'departments', id))
            showNotification('Department deleted', 'success')
            fetchDepartments()
        } catch (e) {
            showNotification('Error deleting', 'error')
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-bold">Roles & Departments</h3>
                <button
                    onClick={() => { setEditingDept(null); setIsEditing(true); }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center shadow"
                >
                    <Plus size={18} className="mr-1" /> Add Role
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {departments.map((dept) => (
                    <DepartmentCard
                        key={dept.id}
                        department={dept}
                        onEdit={() => { setEditingDept(dept); setIsEditing(true); }}
                        onDelete={handleDelete}
                    />
                ))}
                {departments.length === 0 && (
                    <div className="text-center p-8 text-gray-500 bg-white dark:bg-gray-800 rounded-xl">
                        No roles configured yet.
                    </div>
                )}
            </div>

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
