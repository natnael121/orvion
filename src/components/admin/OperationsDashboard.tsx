import React, { useState, useEffect } from 'react'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { useFirebase } from '../../contexts/FirebaseContext'
import {
    Activity, Users, Package, AlertTriangle, CheckCircle, Clock,
    MapPin, TrendingUp, Zap, Eye
} from 'lucide-react'

interface OperationsDashboardProps {
    userData: any
}

export const OperationsDashboard: React.FC<OperationsDashboardProps> = ({ userData }) => {
    const { db } = useFirebase()
    const [tasks, setTasks] = useState<any[]>([])
    const [teams, setTeams] = useState<any[]>([])
    const [materialRequests, setMaterialRequests] = useState<any[]>([])
    const [attendance, setAttendance] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const shopId = userData?.activeShopId || 'hr-system-company'

    useEffect(() => {
        fetchAllData()
    }, [])

    const fetchAllData = async () => {
        setLoading(true)
        try {
            // Fetch tasks
            const tQ = query(collection(db, 'tasks'), where('shopId', '==', shopId))
            const tSnap = await getDocs(tQ)
            setTasks(tSnap.docs.map(d => ({ id: d.id, ...d.data() })))

            // Fetch teams
            const dQ = query(collection(db, 'departments'), where('shopId', '==', shopId))
            const dSnap = await getDocs(dQ)
            setTeams(dSnap.docs.map(d => ({ id: d.id, ...d.data() })))

            // Fetch material requests
            try {
                const mSnap = await getDocs(collection(db, 'material_requests'))
                setMaterialRequests(mSnap.docs.map(d => ({ id: d.id, ...d.data() })))
            } catch (e) { console.error(e) }

            // Fetch today's attendance
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            try {
                const aSnap = await getDocs(collection(db, 'attendance'))
                const allAtt = aSnap.docs.map(d => ({ id: d.id, ...d.data() }))
                setAttendance(allAtt.filter((a: any) => {
                    const ts = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp)
                    return ts >= today
                }))
            } catch (e) { console.error(e) }

        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    // === Computed Stats ===
    const activeTasks = tasks.filter(t => t.status === 'in_progress')
    const pendingVerification = tasks.filter(t => t.status === 'verification_pending')
    const completedTasks = tasks.filter(t => t.status === 'completed')
    const pendingTasks = tasks.filter(t => t.status === 'pending')
    const issueCount = tasks.reduce((acc, t) => {
        return acc + (t.progressLogs?.filter((l: any) => l.isIssue)?.length || 0)
    }, 0)
    const pendingMaterials = materialRequests.filter(m => m.status === 'pending')

    // Task progress calculation
    const getTaskProgress = (task: any) => {
        if (task.status === 'completed') return 100
        if (task.status === 'verification_pending') return 95
        if (task.status === 'in_progress') {
            if (task.completedQty && task.target) {
                const numCompleted = parseFloat(task.completedQty) || 0
                const numTarget = parseFloat(task.target) || 1
                return Math.min(90, Math.round((numCompleted / numTarget) * 100))
            }
            return 40 // default in-progress
        }
        return 0
    }

    // Alert generation
    const generateAlerts = () => {
        const alerts: { type: string; message: string; severity: 'red' | 'orange' | 'blue' }[] = []

        // Tasks stuck in progress too long (>8hrs simulated)
        activeTasks.forEach(t => {
            if (t.startedAt) {
                const started = t.startedAt?.toDate ? t.startedAt.toDate() : new Date(t.startedAt)
                const hoursElapsed = (Date.now() - started.getTime()) / (1000 * 60 * 60)
                if (hoursElapsed > 8) {
                    alerts.push({ type: 'time', message: `"${t.title}" active for ${Math.round(hoursElapsed)}h — may be stuck`, severity: 'orange' })
                }
            }
        })

        // Material delays
        if (pendingMaterials.length > 3) {
            alerts.push({ type: 'material', message: `${pendingMaterials.length} material requests pending — potential field delays`, severity: 'red' })
        }

        // Issues flagged
        if (issueCount > 0) {
            alerts.push({ type: 'issue', message: `${issueCount} issues flagged by field teams`, severity: 'red' })
        }

        // Pending verifications piling up
        if (pendingVerification.length > 5) {
            alerts.push({ type: 'verify', message: `${pendingVerification.length} tasks awaiting verification — review queue growing`, severity: 'orange' })
        }

        if (alerts.length === 0) {
            alerts.push({ type: 'ok', message: 'All systems operational — no alerts', severity: 'blue' })
        }

        return alerts
    }

    // Team stats
    const getTeamStats = (teamId: string) => {
        const teamTasks = tasks.filter(t => t.assignedToTeam === teamId)
        const completed = teamTasks.filter(t => t.status === 'completed').length
        const inProgress = teamTasks.filter(t => t.status === 'in_progress').length
        const total = teamTasks.length
        return { completed, inProgress, total, completionRate: total > 0 ? Math.round((completed / total) * 100) : 0 }
    }

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Operations Dashboard...</div>

    const alerts = generateAlerts()

    return (
        <div className="space-y-6 pb-6">
            {/* === HEADER === */}
            <div className="bg-gradient-to-r from-slate-900 to-blue-900 p-6 rounded-2xl text-white shadow-lg">
                <div className="flex items-center space-x-3 mb-1">
                    <Activity className="text-cyan-400" size={28} />
                    <h2 className="text-xl font-bold tracking-tight">Operations Command Center</h2>
                </div>
                <p className="text-blue-200 text-sm">Live field intelligence — Real-time status of all operations</p>
            </div>

            {/* === LIVE STATS GRID === */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm text-center">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Users size={20} className="text-green-600" />
                    </div>
                    <div className="text-2xl font-black text-gray-800 dark:text-gray-200">{teams.length}</div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Active Teams</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm text-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Zap size={20} className="text-blue-600" />
                    </div>
                    <div className="text-2xl font-black text-gray-800 dark:text-gray-200">{activeTasks.length}</div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">In Progress</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm text-center">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Eye size={20} className="text-purple-600" />
                    </div>
                    <div className="text-2xl font-black text-gray-800 dark:text-gray-200">{pendingVerification.length}</div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Pending Verify</div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm text-center">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <CheckCircle size={20} className="text-emerald-600" />
                    </div>
                    <div className="text-2xl font-black text-gray-800 dark:text-gray-200">{completedTasks.length}</div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Completed</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm text-center">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <AlertTriangle size={20} className="text-red-600" />
                    </div>
                    <div className="text-2xl font-black text-gray-800 dark:text-gray-200">{issueCount}</div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Issues</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm text-center">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Package size={20} className="text-orange-600" />
                    </div>
                    <div className="text-2xl font-black text-gray-800 dark:text-gray-200">{pendingMaterials.length}</div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Material Reqs</div>
                </div>
            </div>

            {/* === LIVE ALERTS === */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center">
                        <AlertTriangle size={18} className="mr-2 text-orange-500" /> Live Alerts
                    </h3>
                </div>
                <div className="divide-y divide-gray-50 dark:divide-gray-700">
                    {alerts.map((alert, idx) => (
                        <div key={idx} className={`p-3 flex items-center space-x-3 ${alert.severity === 'red' ? 'bg-red-50/50 dark:bg-red-900/10' : alert.severity === 'orange' ? 'bg-orange-50/50 dark:bg-orange-900/10' : 'bg-blue-50/50 dark:bg-blue-900/10'}`}>
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${alert.severity === 'red' ? 'bg-red-500 animate-pulse' : alert.severity === 'orange' ? 'bg-orange-500' : 'bg-blue-500'}`} />
                            <p className="text-sm text-gray-700 dark:text-gray-300">{alert.message}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* === TASK PROGRESS ENGINE === */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center">
                        <TrendingUp size={18} className="mr-2 text-blue-500" /> Task Progress (Live)
                    </h3>
                </div>
                <div className="p-4 space-y-4">
                    {tasks.filter(t => t.status !== 'pending').length === 0 ? (
                        <p className="text-gray-400 text-sm text-center py-4">No active or completed tasks to display.</p>
                    ) : (
                        tasks.filter(t => t.status !== 'pending').map(task => {
                            const progress = getTaskProgress(task)
                            const barColor = task.status === 'completed' ? 'bg-emerald-500' :
                                task.status === 'verification_pending' ? 'bg-purple-500' : 'bg-blue-500'
                            return (
                                <div key={task.id}>
                                    <div className="flex justify-between items-center mb-1">
                                        <div className="flex items-center space-x-2">
                                            <span className="font-bold text-sm text-gray-800 dark:text-gray-200 truncate max-w-[180px]">{task.title}</span>
                                            <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${task.priority === 'Urgent' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>{task.priority}</span>
                                        </div>
                                        <span className="text-xs font-bold text-gray-500">{progress}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                                        <div className={`h-full rounded-full ${barColor} transition-all duration-500`} style={{ width: `${progress}%` }} />
                                    </div>
                                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                                        <span>{task.assignedTeamName} • {task.area}</span>
                                        <span>Target: {task.target}</span>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>

            {/* === TEAM STATUS OVERVIEW === */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center">
                        <Users size={18} className="mr-2 text-green-500" /> Team Status
                    </h3>
                </div>
                <div className="divide-y divide-gray-50 dark:divide-gray-700">
                    {teams.length === 0 ? (
                        <p className="p-4 text-gray-400 text-sm text-center">No teams configured.</p>
                    ) : (
                        teams.map(team => {
                            const stats = getTeamStats(team.id)
                            return (
                                <div key={team.id} className="p-4 flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold text-gray-800 dark:text-gray-200">{team.name}</h4>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {stats.inProgress} active • {stats.completed}/{stats.total} done
                                        </p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <div className="w-16 bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${stats.completionRate}%` }} />
                                        </div>
                                        <span className="text-xs font-bold text-gray-600 dark:text-gray-400 w-10 text-right">{stats.completionRate}%</span>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>

            {/* === MATERIAL FLOW === */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center">
                        <Package size={18} className="mr-2 text-indigo-500" /> Material Flow Snapshot
                    </h3>
                </div>
                <div className="p-4">
                    <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-xl">
                            <div className="text-lg font-black text-orange-600">{materialRequests.filter(m => m.status === 'pending').length}</div>
                            <div className="text-[9px] text-gray-500 font-bold uppercase">Requested</div>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl">
                            <div className="text-lg font-black text-blue-600">{materialRequests.filter(m => m.status === 'approved').length}</div>
                            <div className="text-[9px] text-gray-500 font-bold uppercase">Approved</div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-xl">
                            <div className="text-lg font-black text-green-600">{materialRequests.filter(m => m.status === 'issued').length}</div>
                            <div className="text-[9px] text-gray-500 font-bold uppercase">Issued</div>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">
                            <div className="text-lg font-black text-red-600">{materialRequests.filter(m => m.status === 'rejected').length}</div>
                            <div className="text-[9px] text-gray-500 font-bold uppercase">Rejected</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* === TODAY'S ATTENDANCE === */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
                <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center mb-3">
                    <Clock size={18} className="mr-2 text-blue-500" /> Today's Check-ins
                </h3>
                <div className="flex items-center space-x-4">
                    <div className="text-3xl font-black text-blue-600">{attendance.length}</div>
                    <div className="text-sm text-gray-500">employees checked in today</div>
                </div>
            </div>
        </div>
    )
}
