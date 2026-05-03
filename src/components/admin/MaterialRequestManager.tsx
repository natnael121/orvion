import React, { useState, useEffect } from 'react'
import { collection, query, where, getDocs, updateDoc, doc, orderBy } from 'firebase/firestore'
import { useFirebase } from '../../contexts/FirebaseContext'
import { useNotification } from '../../contexts/NotificationContext'
import { Package, CheckCircle, XCircle } from 'lucide-react'

export const MaterialRequestManager: React.FC<{ userData: any }> = ({ userData }) => {
    const { db } = useFirebase()
    const { showNotification } = useNotification()
    const [requests, setRequests] = useState<any[]>([])

    const fetchRequests = async () => {
        try {
            // In a full implementation, we'd filter by shopId, but for MVP we get all or by shopId if it existed
            // In TaskExecutionModal we didn't add shopId to the request, so we'll just fetch all and ignore shopId for now
            const q = query(
                collection(db, 'material_requests'),
                orderBy('timestamp', 'desc')
            )
            const snap = await getDocs(q)
            setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        } catch (e) {
            console.error(e)
            // Fallback without index
            try {
                const snap = await getDocs(collection(db, 'material_requests'))
                setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })))
            } catch (fallbackError) {
                console.error(fallbackError)
            }
        }
    }

    useEffect(() => {
        fetchRequests()
    }, [])

    const handleUpdateStatus = async (id: string, status: string) => {
        try {
            await updateDoc(doc(db, 'material_requests', id), { status })
            showNotification(`Request marked as ${status}`, status === 'issued' ? 'success' : 'error')
            fetchRequests()
        } catch (e) {
            console.error(e)
            showNotification('Failed to update request', 'error')
        }
    }

    return (
        <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold flex items-center text-gray-800 dark:text-gray-200">
                        <Package className="mr-2 text-indigo-500" /> Material Requests (Store Issuing)
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Review and issue materials requested by teams in the field.</p>
                </div>
            </div>

            {requests.length === 0 ? (
                <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                    <p className="text-gray-500">No material requests found.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {requests.map(req => (
                        <div key={req.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center space-x-2 mb-1">
                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${req.status === 'pending' ? 'bg-orange-100 text-orange-600' : req.status === 'issued' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                            {req.status}
                                        </span>
                                    </div>
                                    <h4 className="font-bold text-gray-800 dark:text-gray-200">{req.materialName} <span className="text-gray-500 font-normal">x {req.quantity}</span></h4>
                                    <p className="text-xs font-semibold text-indigo-600 mt-1">Task: {req.taskTitle}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        Requested: {req.timestamp?.toDate ? req.timestamp.toDate().toLocaleString() : ''}
                                    </p>
                                </div>
                                {req.status === 'pending' && (
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handleUpdateStatus(req.id, 'issued')}
                                            className="px-3 py-1.5 bg-green-600 text-white font-bold text-xs rounded-lg shadow-sm flex items-center"
                                        >
                                            <CheckCircle size={14} className="mr-1" /> Issue
                                        </button>
                                        <button
                                            onClick={() => handleUpdateStatus(req.id, 'rejected')}
                                            className="px-3 py-1.5 bg-red-100 text-red-600 font-bold text-xs rounded-lg flex items-center"
                                        >
                                            <XCircle size={14} className="mr-1" /> Reject
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
