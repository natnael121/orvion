import React, { useState, useEffect } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { useFirebase } from '../../contexts/FirebaseContext'
import {
    User, TrendingUp, Clock, CheckCircle, Calendar, Package,
    AlertTriangle, Camera, MapPin, Activity
} from 'lucide-react'

interface MyProfileProps {
    userData: any
}

export const MyProfile: React.FC<MyProfileProps> = ({ userData }) => {
    const { db } = useFirebase()
    const [myTasks, setMyTasks] = useState<any[]>([])
    const [myAttendance, setMyAttendance] = useState<any[]>([])
    const [myMaterials, setMyMaterials] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'attendance' | 'timeline'>('overview')

    const shopId = userData?.activeShopId || 'hr-system-company'
    const userName = userData?.displayName || userData?.first_name || 'Employee'
    const userId = userData?.odooUserId || userData?.odoouid || ''
    const telegramId = userData?.telegramId || userData?.telegram_id

    useEffect(() => {
        fetchMyData()
    }, [])

    const fetchMyData = async () => {
        setLoading(true)
        try {
            // My tasks
            const tSnap = await getDocs(query(collection(db, 'tasks'), where('shopId', '==', shopId)))
            const allTasks = tSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[]
            setMyTasks(allTasks.filter(t =>
                t.assignedToName === userName ||
                t.assignedTo === userId
            ))

            // My attendance
            try {
                const aSnap = await getDocs(collection(db, 'attendance'))
                const allAtt = aSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[]
                setMyAttendance(allAtt.filter(a =>
                    a.userName === userName ||
                    a.userId === userId ||
                    a.telegramId === telegramId
                ))
            } catch (e) { console.error(e) }

            // My material requests
            try {
                const mSnap = await getDocs(collection(db, 'material_requests'))
                const allMat = mSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[]
                setMyMaterials(allMat.filter(m =>
                    m.requestedByName === userName ||
                    m.requestedBy === userId
                ))
            } catch (e) { console.error(e) }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const completed = myTasks.filter(t => t.status === 'completed').length
    const inProgress = myTasks.filter(t => t.status === 'in_progress').length
    const total = myTasks.length
    const issues = myTasks.reduce((acc, t) => acc + (t.progressLogs?.filter((l: any) => l.isIssue)?.length || 0), 0)
    const checkIns = myAttendance.filter(a => a.type === 'check-in').length

    // Efficiency Score
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
    const avgHours = (() => {
        const withTime = myTasks.filter(t => t.startedAt && t.completedAt)
        if (withTime.length === 0) return 0
        const totalH = withTime.reduce((acc, t) => {
            const s = t.startedAt?.toDate ? t.startedAt.toDate() : new Date(t.startedAt)
            const e = t.completedAt?.toDate ? t.completedAt.toDate() : new Date(t.completedAt)
            return acc + (e.getTime() - s.getTime()) / (1000 * 60 * 60)
        }, 0)
        return Math.round((totalH / withTime.length) * 10) / 10
    })()

    const effScore = Math.min(100, Math.max(0, Math.round(
        completionRate * 0.4 +
        (avgHours > 0 ? Math.max(0, 100 - avgHours * 5) : 50) * 0.3 +
        Math.max(0, 100 - issues * 15) * 0.2 +
        Math.min(100, checkIns * 5) * 0.1
    )))

    // Timeline
    const timeline = (() => {
        const events: { date: any; icon: string; title: string; detail: string }[] = []
        myTasks.forEach(t => {
            if (t.startedAt) events.push({ date: t.startedAt, icon: '▶️', title: `Started: ${t.title}`, detail: t.area || '' })
            if (t.completedAt) events.push({ date: t.completedAt, icon: '✅', title: `Completed: ${t.title}`, detail: `${t.completedQty || '—'} done` })
        })
        myAttendance.forEach(a => {
            events.push({ date: a.timestamp, icon: a.type === 'check-in' ? '🕐' : '🔚', title: a.type === 'check-in' ? 'Checked In' : 'Checked Out', detail: '' })
        })
        return events.sort((a, b) => {
            const da = a.date?.toDate ? a.date.toDate() : new Date(a.date || 0)
            const db2 = b.date?.toDate ? b.date.toDate() : new Date(b.date || 0)
            return db2.getTime() - da.getTime()
        })
    })()

    if (loading) return <div className="p-8 text-center text-gray-500">Loading your profile...</div>

    return (
        <div className="space-y-4 pb-6">
            {/* Profile Card */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 rounded-2xl text-white shadow-lg">
                <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-2xl font-black">
                        {userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-black">{userName}</h3>
                        <p className="text-blue-200 text-xs">{userData?.role?.toUpperCase() || 'STAFF'}</p>
                    </div>
                    <div className="text-center bg-white/15 backdrop-blur rounded-xl px-3 py-2">
                        <div className={`text-2xl font-black ${effScore >= 70 ? 'text-emerald-300' : effScore >= 40 ? 'text-yellow-300' : 'text-red-300'}`}>
                            {effScore}
                        </div>
                        <div className="text-[8px] text-blue-200 uppercase font-bold">Score</div>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-2">
                <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 text-center">
                    <div className="text-lg font-black text-gray-800 dark:text-gray-200">{total}</div>
                    <div className="text-[9px] text-gray-500 font-bold uppercase">Tasks</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 text-center">
                    <div className="text-lg font-black text-emerald-600">{completed}</div>
                    <div className="text-[9px] text-gray-500 font-bold uppercase">Done</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 text-center">
                    <div className="text-lg font-black text-blue-600">{checkIns}</div>
                    <div className="text-[9px] text-gray-500 font-bold uppercase">Days</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 text-center">
                    <div className="text-lg font-black text-red-600">{issues}</div>
                    <div className="text-[9px] text-gray-500 font-bold uppercase">Issues</div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                {[
                    { id: 'overview', label: '📊 Overview' },
                    { id: 'tasks', label: '📋 My Tasks' },
                    { id: 'attendance', label: '🕐 Attendance' },
                    { id: 'timeline', label: '📅 Timeline' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${activeTab === tab.id ? 'bg-white dark:bg-gray-700 shadow text-blue-600' : 'text-gray-500'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Overview */}
            {activeTab === 'overview' && (
                <div className="space-y-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
                        <h4 className="font-bold text-gray-800 dark:text-gray-200 flex items-center mb-3 text-sm">
                            <TrendingUp size={16} className="mr-2 text-blue-500" /> My Performance
                        </h4>
                        <div className="space-y-3">
                            {[
                                { label: 'Completion Rate', value: completionRate, color: 'bg-emerald-500' },
                                { label: 'Efficiency', value: effScore, color: 'bg-blue-500' },
                                { label: 'Quality', value: Math.max(0, 100 - issues * 15), color: 'bg-purple-500' },
                            ].map((m, i) => (
                                <div key={i}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-gray-500 font-bold">{m.label}</span>
                                        <span className="font-black text-gray-800 dark:text-gray-200">{m.value}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                                        <div className={`h-full rounded-full ${m.color}`} style={{ width: `${m.value}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-center">
                            <div className="text-xl font-black text-blue-600">{avgHours}h</div>
                            <div className="text-[10px] text-gray-500 font-bold uppercase">Avg Task Time</div>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl text-center">
                            <div className="text-xl font-black text-orange-600">{myMaterials.length}</div>
                            <div className="text-[10px] text-gray-500 font-bold uppercase">Material Reqs</div>
                        </div>
                    </div>
                </div>
            )}

            {/* My Tasks */}
            {activeTab === 'tasks' && (
                <div className="space-y-3">
                    {myTasks.length === 0 ? (
                        <p className="p-8 text-gray-400 text-center bg-white dark:bg-gray-800 rounded-xl">No tasks assigned yet.</p>
                    ) : myTasks.map(t => (
                        <div key={t.id} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <div className="flex justify-between items-start mb-1">
                                <h5 className="font-bold text-sm text-gray-800 dark:text-gray-200 truncate max-w-[200px]">{t.title}</h5>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${t.status === 'completed' ? 'bg-green-100 text-green-700' : t.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {t.status?.replace(/_/g, ' ').toUpperCase()}
                                </span>
                            </div>
                            <p className="text-[10px] text-gray-400">{t.area} • Target: {t.target} • {t.priority}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Attendance */}
            {activeTab === 'attendance' && (
                <div className="space-y-2">
                    {myAttendance.length === 0 ? (
                        <p className="p-8 text-gray-400 text-center bg-white dark:bg-gray-800 rounded-xl">No attendance records.</p>
                    ) : myAttendance.map(a => (
                        <div key={a.id} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center space-x-3">
                            {a.photoUrl ? (
                                <img src={a.photoUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                            ) : (
                                <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                    <User size={16} className="text-gray-400" />
                                </div>
                            )}
                            <div className="flex-1">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${a.type === 'check-in' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                                    {a.type?.toUpperCase()}
                                </span>
                                <div className="text-[10px] text-gray-400 mt-0.5">
                                    {a.timestamp?.toDate ? a.timestamp.toDate().toLocaleString() : ''}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Timeline */}
            {activeTab === 'timeline' && (
                <div className="space-y-0">
                    {timeline.length === 0 ? (
                        <p className="p-8 text-gray-400 text-center bg-white dark:bg-gray-800 rounded-xl">No activity yet.</p>
                    ) : timeline.slice(0, 20).map((ev, idx) => (
                        <div key={idx} className="flex items-start space-x-3 relative">
                            {idx < Math.min(timeline.length, 20) - 1 && (
                                <div className="absolute left-[15px] top-8 w-0.5 h-full bg-gray-200 dark:bg-gray-700 z-0" />
                            )}
                            <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center text-sm z-10 flex-shrink-0">
                                {ev.icon}
                            </div>
                            <div className="flex-1 bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm mb-2">
                                <h5 className="font-bold text-xs text-gray-800 dark:text-gray-200">{ev.title}</h5>
                                {ev.detail && <p className="text-[10px] text-gray-400">{ev.detail}</p>}
                                <p className="text-[10px] text-gray-300 mt-0.5">
                                    {ev.date?.toDate ? ev.date.toDate().toLocaleString() : ''}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
