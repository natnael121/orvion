import React, { useState, useEffect } from 'react'
import { collection, query, where, getDocs, addDoc, orderBy } from 'firebase/firestore'
import { useFirebase } from '../../contexts/FirebaseContext'
import { useNotification } from '../../contexts/NotificationContext'
import { UserData } from '../../types'
import { DollarSign, FileText, Plus, CheckCircle, Clock } from 'lucide-react'

export const ExpenseManager: React.FC<{ userData: UserData | null }> = ({ userData }) => {
    const { db } = useFirebase()
    const { showNotification } = useNotification()
    const [expenses, setExpenses] = useState<any[]>([])
    const [amount, setAmount] = useState('')
    const [description, setDescription] = useState('')

    const fetchExpenses = async () => {
        if (!userData?.activeShopId) return
        try {
            const q = query(
                collection(db, 'expenses'),
                where('shopId', '==', userData.activeShopId),
                orderBy('date', 'desc')
            )
            const snap = await getDocs(q)
            setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        } catch (e) {
            console.error(e)
            // fallback if index lacking
            const q = query(collection(db, 'expenses'), where('shopId', '==', userData?.activeShopId))
            const snap = await getDocs(q)
            setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        }
    }

    useEffect(() => {
        fetchExpenses()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userData])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!amount || !description) return
        try {
            await addDoc(collection(db, 'expenses'), {
                shopId: userData?.activeShopId,
                userId: userData?.uid,
                userName: userData?.displayName || 'Employee',
                amount: parseFloat(amount),
                description,
                status: 'pending',
                date: new Date()
            })
            showNotification('Expense submitted', 'success')
            setAmount('')
            setDescription('')
            fetchExpenses()
        } catch (e) {
            console.error(e)
            showNotification('Failed to submit expense', 'error')
        }
    }

    return (
        <div className="space-y-4 p-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center space-x-2 mb-4">
                    <DollarSign className="text-green-600" />
                    <h3 className="text-xl font-bold">New Expense</h3>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <input
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Amount ($)"
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 bg-gray-50"
                            required
                        />
                    </div>
                    <div>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Description"
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 bg-gray-50"
                            required
                        />
                    </div>
                    <button type="submit" className="w-full py-3 bg-green-600 text-white font-bold rounded-lg shadow flex items-center justify-center">
                        <Plus size={18} className="mr-2" /> Submit Expense
                    </button>
                </form>
            </div>

            <div className="space-y-3">
                <h3 className="font-bold text-gray-700 ml-1">Recent Expenses</h3>
                {expenses.length === 0 ? (
                    <p className="text-gray-500 text-sm">No expenses logged.</p>
                ) : (
                    expenses.map(exp => (
                        <div key={exp.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                            <div>
                                <p className="font-bold text-gray-800">${exp.amount.toFixed(2)}</p>
                                <p className="text-sm text-gray-500">{exp.description}</p>
                                <p className="text-xs text-blue-600 mt-1">By {exp.userName}</p>
                            </div>
                            <div>
                                {exp.status === 'pending' ? (
                                    <span className="flex items-center text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded font-bold">
                                        <Clock size={12} className="mr-1" /> Pending
                                    </span>
                                ) : (
                                    <span className="flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded font-bold">
                                        <CheckCircle size={12} className="mr-1" /> Approved
                                    </span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
