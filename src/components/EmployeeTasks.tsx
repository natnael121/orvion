import React, { useState, useEffect } from 'react'
import { collection, query, where, getDocs, updateDoc, doc, orderBy } from 'firebase/firestore'
import { useFirebase } from '../contexts/FirebaseContext'
import { useNotification } from '../contexts/NotificationContext'
import { UserData } from '../types'
import { ListTodo, CheckCircle, Clock, PlayCircle, ChevronRight, AlertTriangle } from 'lucide-react'
import { TaskExecutionModal } from './TaskExecutionModal'

export const EmployeeTasks: React.FC<{ userData: UserData | null }> = ({ userData }) => {
    const { db } = useFirebase()
    const { showNotification } = useNotification()
    const [tasks, setTasks] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedTask, setSelectedTask] = useState<any>(null)

    const fetchTasks = async () => {
        if (!userData?.uid) return
        try {
            setLoading(true)
            const q = query(
                collection(db, 'tasks'),
                where('assignedToTeam', '==', (userData as any).roleId || '')
            )
            const snap = await getDocs(q)
            const tasksData = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => {
                if (a.status === 'pending' && b.status === 'completed') return -1
                if (a.status === 'completed' && b.status === 'pending') return 1
                return 0
            })
            setTasks(tasksData)
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchTasks()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userData])

    const startTask = async (taskId: string) => {
        try {
            navigator.geolocation.getCurrentPosition(async (pos) => {
                await updateDoc(doc(db, 'tasks', taskId), {
                    status: 'in_progress',
                    startedAt: new Date(),
                    startLocation: { lat: pos.coords.latitude, lng: pos.coords.longitude }
                })
                showNotification('Work session started!', 'success')
                fetchTasks()
            }, async (err) => {
                // fallback if geo fails
                await updateDoc(doc(db, 'tasks', taskId), {
                    status: 'in_progress',
                    startedAt: new Date()
                })
                showNotification('Work session started (No GPS)', 'success')
                fetchTasks()
            })
        } catch (e) {
            console.error(e)
            showNotification('Failed to start task', 'error')
        }
    }

    if (loading) return <div className="p-8 text-center text-gray-500">Loading tasks...</div>

    return (
        <div className="space-y-4 px-4 pb-20">
            <h3 className="font-bold text-gray-800 text-lg flex items-center">
                <ListTodo className="text-blue-500 mr-2" /> My Assigned Tasks
            </h3>

            {tasks.length === 0 ? (
                <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-gray-100">
                    <CheckCircle className="w-12 h-12 text-green-200 mx-auto mb-2" />
                    <p className="text-gray-500 font-medium">You have no pending tasks.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {tasks.map(task => (
                        <div key={task.id} className={`p-4 rounded-xl border ${task.status === 'completed' || task.status === 'verification_pending' ? 'bg-gray-50 border-gray-100 opacity-80' : 'bg-white border-blue-100 shadow-sm'}`}>
                            <div className="flex justify-between items-center">
                                <div className="flex-1 cursor-pointer" onClick={() => (task.status === 'in_progress') && setSelectedTask(task)}>
                                    <div className="flex space-x-2 items-center mb-1">
                                        {task.priority && <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${task.priority === 'Urgent' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{task.priority}</span>}
                                        {task.taskType && <span className="text-[10px] uppercase font-bold bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">{task.taskType}</span>}
                                    </div>
                                    <h4 className={`font-bold ${task.status === 'completed' || task.status === 'verification_pending' ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                                        {task.title}
                                    </h4>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {task.area} {task.target && `• Target: ${task.target}`} {task.deadline && `• Due: ${task.deadline}`}
                                    </p>
                                    <div className="flex items-center space-x-2 mt-2">
                                        {task.status === 'pending' && (
                                            <span className="flex items-center text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-md font-bold">
                                                <Clock size={12} className="mr-1" /> Not Started
                                            </span>
                                        )}
                                        {task.status === 'in_progress' && (
                                            <span className="flex items-center text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-md font-bold">
                                                <PlayCircle size={12} className="mr-1" /> In Progress
                                            </span>
                                        )}
                                        {task.status === 'verification_pending' && (
                                            <span className="flex items-center text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-md font-bold">
                                                <AlertTriangle size={12} className="mr-1" /> Pending Verification
                                            </span>
                                        )}
                                        {task.status === 'completed' && (
                                            <span className="flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded-md font-bold">
                                                <CheckCircle size={12} className="mr-1" /> Verified & Done
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {task.status === 'pending' ? (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); startTask(task.id); }}
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg transition-colors flex items-center text-sm shadow-sm"
                                    >
                                        <PlayCircle size={16} className="mr-1" /> Start
                                    </button>
                                ) : task.status === 'in_progress' ? (
                                    <button
                                        onClick={() => setSelectedTask(task)}
                                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-2 rounded-lg transition-colors"
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {selectedTask && (
                <TaskExecutionModal
                    task={selectedTask}
                    userData={userData}
                    onClose={() => setSelectedTask(null)}
                    onRefresh={fetchTasks}
                />
            )}
        </div>
    )
}
