import React, { useState, useEffect } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { useFirebase } from '../../contexts/FirebaseContext'
import {
    Users, Search, ChevronRight, ArrowLeft, Clock,
    TrendingUp, Package, Activity
} from 'lucide-react'

interface EmployeeHistoryProps {
    userData: any
}

interface EmployeeProfile {
    id: string
    name: string
    role: string
    team: string
    teamId: string
    joinDate: any
    status: 'active' | 'inactive'
    telegramId?: number
}

interface TaskRecord {
    id: string
    title: string
    status: string
    priority: string
    area: string
    target: string
    completedQty?: string
    startedAt?: any
    completedAt?: any
    progressLogs?: any[]
    verificationStatus?: string
    completionPhotos?: string[]
}

export const EmployeeHistory: React.FC<EmployeeHistoryProps> = ({ userData }) => {
    const { db } = useFirebase()
    const [employees, setEmployees] = useState<EmployeeProfile[]>([])
    const [selectedEmployee, setSelectedEmployee] = useState<EmployeeProfile | null>(null)
    const [employeeTasks, setEmployeeTasks] = useState<TaskRecord[]>([])
    const [employeeAttendance, setEmployeeAttendance] = useState<any[]>([])
    const [employeeMaterials, setEmployeeMaterials] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [profileTab, setProfileTab] = useState<'overview' | 'tasks' | 'attendance' | 'timeline' | 'photos'>('overview')

    const shopId = userData?.activeShopId || 'hr-system-company'

    useEffect(() => {
        fetchEmployees()
    }, [])

    const fetchEmployees = async () => {
        setLoading(true)
        try {
            // Get all shop_customers who are employees (role != 'customer')
            const custQ = query(collection(db, 'shop_customers'), where('shopId', '==', shopId))
            const custSnap = await getDocs(custQ)
            const customers = custSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[]

            // Get departments for team mapping
            const deptQ = query(collection(db, 'departments'), where('shopId', '==', shopId))
            const deptSnap = await getDocs(deptQ)
            const departments = deptSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[]

            // Build employee profiles
            const profiles: EmployeeProfile[] = customers.map(c => {
                const dept = departments.find(d => d.id === c.departmentId)
                return {
                    id: c.id,
                    name: c.displayName || c.name || `User ${c.telegramId || c.id.slice(0, 6)}`,
                    role: c.role || 'employee',
                    team: dept?.name || 'Unassigned',
                    teamId: c.departmentId || '',
                    joinDate: c.createdAt || c.joinedAt,
                    status: 'active',
                    telegramId: c.telegramId
                }
            })

            setEmployees(profiles)
        } catch (e) {
            console.error('Fetch employees error:', e)
        } finally {
            setLoading(false)
        }
    }

    const selectEmployee = async (emp: EmployeeProfile) => {
        setSelectedEmployee(emp)
        setProfileTab('overview')
        setLoading(true)
        try {
            // Fetch tasks assigned to this employee or their team
            const tQ = query(collection(db, 'tasks'), where('shopId', '==', shopId))
            const tSnap = await getDocs(tQ)
            const allTasks = tSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[]
            const empTasks = allTasks.filter(t =>
                t.assignedTo === emp.id ||
                t.assignedToTeam === emp.teamId ||
                t.assignedToName === emp.name
            )
            setEmployeeTasks(empTasks)

            // Fetch attendance records
            try {
                const aSnap = await getDocs(collection(db, 'attendance'))
                const allAtt = aSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[]
                const empAtt = allAtt.filter(a =>
                    a.userName === emp.name ||
                    a.userId === emp.id ||
                    a.telegramId === emp.telegramId
                )
                setEmployeeAttendance(empAtt)
            } catch (e) { console.error(e) }

            // Fetch material requests
            try {
                const mSnap = await getDocs(collection(db, 'material_requests'))
                const allMat = mSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[]
                const empMat = allMat.filter(m =>
                    m.requestedBy === emp.id ||
                    m.requestedByName === emp.name
                )
                setEmployeeMaterials(empMat)
            } catch (e) { console.error(e) }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    // === Computed Stats for Selected Employee ===
    const getStats = () => {
        const completed = employeeTasks.filter(t => t.status === 'completed').length
        const inProgress = employeeTasks.filter(t => t.status === 'in_progress').length
        const total = employeeTasks.length
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

        const issues = employeeTasks.reduce((acc, t) => {
            return acc + (t.progressLogs?.filter((l: any) => l.isIssue)?.length || 0)
        }, 0)

        const avgHours = (() => {
            const withTime = employeeTasks.filter(t => t.startedAt && t.completedAt)
            if (withTime.length === 0) return 0
            const totalH = withTime.reduce((acc, t) => {
                const s = t.startedAt?.toDate ? t.startedAt.toDate() : new Date(t.startedAt)
                const e = t.completedAt?.toDate ? t.completedAt.toDate() : new Date(t.completedAt)
                return acc + (e.getTime() - s.getTime()) / (1000 * 60 * 60)
            }, 0)
            return Math.round((totalH / withTime.length) * 10) / 10
        })()

        const checkIns = employeeAttendance.filter(a => a.type === 'check-in').length
        const checkOuts = employeeAttendance.filter(a => a.type === 'check-out').length
        const materialReqs = employeeMaterials.length

        // Efficiency score
        const taskScore = completionRate * 0.4
        const speedScore = avgHours > 0 ? Math.max(0, (100 - avgHours * 5)) * 0.3 : 50 * 0.3
        const qualityScore = Math.max(0, (100 - issues * 15)) * 0.2
        const attendanceScore = Math.min(100, checkIns * 5) * 0.1
        const efficiencyScore = Math.min(100, Math.max(0, Math.round(taskScore + speedScore + qualityScore + attendanceScore)))

        return { completed, inProgress, total, completionRate, issues, avgHours, checkIns, checkOuts, materialReqs, efficiencyScore }
    }

    // Get all photos from tasks
    const getAllPhotos = () => {
        const photos: { url: string; taskTitle: string; date: any }[] = []
        employeeTasks.forEach(t => {
            if (t.completionPhotos) {
                t.completionPhotos.forEach(url => {
                    photos.push({ url, taskTitle: t.title, date: t.completedAt })
                })
            }
            if (t.progressLogs) {
                t.progressLogs.forEach((log: any) => {
                    if (log.photoUrl) {
                        photos.push({ url: log.photoUrl, taskTitle: t.title, date: log.timestamp })
                    }
                })
            }
        })
        // Also include attendance photos
        employeeAttendance.forEach(a => {
            if (a.photoUrl) {
                photos.push({ url: a.photoUrl, taskTitle: 'Attendance Check-in', date: a.timestamp })
            }
        })
        return photos
    }

    // Build timeline
    const getTimeline = () => {
        const events: { date: any; type: string; title: string; detail: string; icon: string }[] = []

        employeeTasks.forEach(t => {
            if (t.startedAt) {
                events.push({ date: t.startedAt, type: 'task_start', title: `Started: ${t.title}`, detail: `Area: ${t.area || 'N/A'} • Target: ${t.target || 'N/A'}`, icon: '▶️' })
            }
            if (t.completedAt) {
                events.push({ date: t.completedAt, type: 'task_complete', title: `Completed: ${t.title}`, detail: `Done: ${t.completedQty || '—'} • ${t.verificationStatus === 'verified' ? 'Verified ✅' : 'Pending verification'}`, icon: '✅' })
            }
            t.progressLogs?.forEach((log: any) => {
                if (log.isIssue) {
                    events.push({ date: log.timestamp, type: 'issue', title: `Issue: ${t.title}`, detail: log.note || 'Issue reported', icon: '⚠️' })
                }
            })
        })

        employeeAttendance.forEach(a => {
            events.push({
                date: a.timestamp,
                type: a.type === 'check-in' ? 'checkin' : 'checkout',
                title: a.type === 'check-in' ? 'Checked In' : 'Checked Out',
                detail: `📍 ${a.location?.lat?.toFixed(4) || '—'}, ${a.location?.lng?.toFixed(4) || '—'}`,
                icon: a.type === 'check-in' ? '🕐' : '🔚'
            })
        })

        return events.sort((a, b) => {
            const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date || 0)
            const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date || 0)
            return dateB.getTime() - dateA.getTime()
        })
    }

    const filtered = employees.filter(e =>
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.team.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (loading && !selectedEmployee) return <div className="p-8 text-center text-gray-500">Loading employees...</div>

    // === EMPLOYEE PROFILE VIEW ===
    if (selectedEmployee) {
        const stats = getStats()
        const timeline = getTimeline()
        const photos = getAllPhotos()

        return (
            <div className="space-y-4 pb-6">
                {/* Back button */}
                <button onClick={() => setSelectedEmployee(null)} className="flex items-center space-x-2 text-blue-600 font-bold text-sm">
                    <ArrowLeft size={18} /> <span>Back to Employee List</span>
                </button>

                {/* Profile Card */}
                <div className="bg-gradient-to-r from-slate-800 to-blue-900 p-5 rounded-2xl text-white shadow-lg">
                    <div className="flex items-center space-x-4">
                        <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-2xl font-black">
                            {selectedEmployee.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-black">{selectedEmployee.name}</h3>
                            <p className="text-blue-300 text-xs">{selectedEmployee.role.toUpperCase()} • {selectedEmployee.team}</p>
                            <p className="text-blue-400 text-[10px] mt-0.5">
                                Joined: {selectedEmployee.joinDate?.toDate ? selectedEmployee.joinDate.toDate().toLocaleDateString() : 'N/A'}
                            </p>
                        </div>
                        <div className="text-center">
                            <div className={`text-3xl font-black ${stats.efficiencyScore >= 70 ? 'text-emerald-400' : stats.efficiencyScore >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                                {stats.efficiencyScore}
                            </div>
                            <div className="text-[9px] text-blue-300 uppercase font-bold">Score</div>
                        </div>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-4 gap-2">
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 text-center">
                        <div className="text-lg font-black text-gray-800 dark:text-gray-200">{stats.total}</div>
                        <div className="text-[9px] text-gray-500 font-bold uppercase">Tasks</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 text-center">
                        <div className="text-lg font-black text-emerald-600">{stats.completed}</div>
                        <div className="text-[9px] text-gray-500 font-bold uppercase">Done</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 text-center">
                        <div className="text-lg font-black text-blue-600">{stats.checkIns}</div>
                        <div className="text-[9px] text-gray-500 font-bold uppercase">Check-ins</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 text-center">
                        <div className="text-lg font-black text-red-600">{stats.issues}</div>
                        <div className="text-[9px] text-gray-500 font-bold uppercase">Issues</div>
                    </div>
                </div>

                {/* Profile Tabs */}
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl overflow-x-auto hide-scrollbar">
                    {[
                        { id: 'overview', label: 'Overview', icon: '📊' },
                        { id: 'tasks', label: 'Tasks', icon: '📋' },
                        { id: 'attendance', label: 'Attendance', icon: '🕐' },
                        { id: 'timeline', label: 'Timeline', icon: '📅' },
                        { id: 'photos', label: 'Photos', icon: '📸' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setProfileTab(tab.id as any)}
                            className={`flex-none px-3 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${profileTab === tab.id ? 'bg-white dark:bg-gray-700 shadow text-blue-600' : 'text-gray-500'}`}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {/* === OVERVIEW TAB === */}
                {profileTab === 'overview' && (
                    <div className="space-y-4">
                        {/* Performance Breakdown */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
                            <h4 className="font-bold text-gray-800 dark:text-gray-200 flex items-center mb-3">
                                <TrendingUp size={18} className="mr-2 text-blue-500" /> Performance Breakdown
                            </h4>
                            <div className="space-y-3">
                                {[
                                    { label: 'Task Completion', value: stats.completionRate, color: 'bg-emerald-500' },
                                    { label: 'Efficiency Score', value: stats.efficiencyScore, color: 'bg-blue-500' },
                                    { label: 'Quality (Low Issues)', value: Math.max(0, 100 - stats.issues * 15), color: 'bg-purple-500' },
                                ].map((metric, i) => (
                                    <div key={i}>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="font-bold text-gray-600 dark:text-gray-400">{metric.label}</span>
                                            <span className="font-black text-gray-800 dark:text-gray-200">{metric.value}%</span>
                                        </div>
                                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5">
                                            <div className={`h-full rounded-full ${metric.color} transition-all duration-500`} style={{ width: `${metric.value}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Key Metrics */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-center">
                                <Clock size={20} className="text-blue-500 mx-auto mb-1" />
                                <div className="text-xl font-black text-blue-600">{stats.avgHours}h</div>
                                <div className="text-[10px] text-gray-500 font-bold uppercase">Avg Task Time</div>
                            </div>
                            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl text-center">
                                <Package size={20} className="text-orange-500 mx-auto mb-1" />
                                <div className="text-xl font-black text-orange-600">{stats.materialReqs}</div>
                                <div className="text-[10px] text-gray-500 font-bold uppercase">Material Reqs</div>
                            </div>
                        </div>

                        {/* Recent Tasks */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                            <div className="p-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                                <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200">Recent Tasks</h4>
                            </div>
                            <div className="divide-y divide-gray-50 dark:divide-gray-700">
                                {employeeTasks.slice(0, 5).map(t => (
                                    <div key={t.id} className="p-3 flex items-center justify-between">
                                        <div>
                                            <span className="font-bold text-sm text-gray-800 dark:text-gray-200 truncate block max-w-[200px]">{t.title}</span>
                                            <span className="text-[10px] text-gray-400">{t.area} • {t.target}</span>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${t.status === 'completed' ? 'bg-green-100 text-green-700' : t.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : t.status === 'verification_pending' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {t.status?.replace(/_/g, ' ').toUpperCase()}
                                        </span>
                                    </div>
                                ))}
                                {employeeTasks.length === 0 && <p className="p-4 text-gray-400 text-sm text-center">No tasks yet.</p>}
                            </div>
                        </div>
                    </div>
                )}

                {/* === TASKS TAB === */}
                {profileTab === 'tasks' && (
                    <div className="space-y-3">
                        {employeeTasks.length === 0 ? (
                            <p className="p-8 text-gray-400 text-center bg-white dark:bg-gray-800 rounded-xl">No task records.</p>
                        ) : employeeTasks.map(t => (
                            <div key={t.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h5 className="font-bold text-sm text-gray-800 dark:text-gray-200">{t.title}</h5>
                                        <p className="text-[10px] text-gray-400 mt-0.5">{t.area} • Priority: {t.priority}</p>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${t.status === 'completed' ? 'bg-green-100 text-green-700' : t.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : t.status === 'verification_pending' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {t.status?.replace(/_/g, ' ').toUpperCase()}
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-center text-xs bg-gray-50 dark:bg-gray-900/50 rounded-lg p-2">
                                    <div>
                                        <div className="font-black text-gray-800 dark:text-gray-200">{t.target || '—'}</div>
                                        <div className="text-[9px] text-gray-400">Target</div>
                                    </div>
                                    <div>
                                        <div className="font-black text-gray-800 dark:text-gray-200">{t.completedQty || '—'}</div>
                                        <div className="text-[9px] text-gray-400">Actual</div>
                                    </div>
                                    <div>
                                        <div className="font-black text-gray-800 dark:text-gray-200">
                                            {t.startedAt && t.completedAt ? (() => {
                                                const s = t.startedAt?.toDate ? t.startedAt.toDate() : new Date(t.startedAt)
                                                const e = t.completedAt?.toDate ? t.completedAt.toDate() : new Date(t.completedAt)
                                                return `${(Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60) * 10) / 10)}h`
                                            })() : '—'}
                                        </div>
                                        <div className="text-[9px] text-gray-400">Duration</div>
                                    </div>
                                </div>
                                {t.progressLogs && t.progressLogs.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                        <p className="text-[10px] text-gray-400 font-bold mb-1">{t.progressLogs.length} log entries • {t.progressLogs.filter((l: any) => l.isIssue).length} issues</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* === ATTENDANCE TAB === */}
                {profileTab === 'attendance' && (
                    <div className="space-y-3">
                        {/* Summary */}
                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl text-center">
                                <div className="text-lg font-black text-blue-600">{stats.checkIns}</div>
                                <div className="text-[9px] text-gray-500 font-bold uppercase">Check-ins</div>
                            </div>
                            <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-xl text-center">
                                <div className="text-lg font-black text-orange-600">{stats.checkOuts}</div>
                                <div className="text-[9px] text-gray-500 font-bold uppercase">Check-outs</div>
                            </div>
                            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-xl text-center">
                                <div className="text-lg font-black text-green-600">{employeeAttendance.length}</div>
                                <div className="text-[9px] text-gray-500 font-bold uppercase">Total</div>
                            </div>
                        </div>

                        {/* Records */}
                        {employeeAttendance.length === 0 ? (
                            <p className="p-8 text-gray-400 text-center bg-white dark:bg-gray-800 rounded-xl">No attendance records.</p>
                        ) : employeeAttendance.map(a => (
                            <div key={a.id} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center space-x-3">
                                {a.photoUrl ? (
                                    <img src={a.photoUrl} alt="att" className="w-10 h-10 rounded-lg object-cover" />
                                ) : (
                                    <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                        <Users size={16} className="text-gray-400" />
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
                                <div className="text-[10px] text-gray-400">
                                    📍 {a.location?.lat?.toFixed(3)}, {a.location?.lng?.toFixed(3)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* === TIMELINE TAB === */}
                {profileTab === 'timeline' && (
                    <div className="space-y-0">
                        {timeline.length === 0 ? (
                            <p className="p-8 text-gray-400 text-center bg-white dark:bg-gray-800 rounded-xl">No history yet.</p>
                        ) : timeline.map((event, idx) => (
                            <div key={idx} className="flex items-start space-x-3 relative">
                                {/* Line */}
                                {idx < timeline.length - 1 && (
                                    <div className="absolute left-[15px] top-8 w-0.5 h-full bg-gray-200 dark:bg-gray-700 z-0" />
                                )}
                                <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center text-sm z-10 flex-shrink-0">
                                    {event.icon}
                                </div>
                                <div className="flex-1 bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm mb-2">
                                    <h5 className="font-bold text-xs text-gray-800 dark:text-gray-200">{event.title}</h5>
                                    <p className="text-[10px] text-gray-400 mt-0.5">{event.detail}</p>
                                    <p className="text-[10px] text-gray-300 mt-1">
                                        {event.date?.toDate ? event.date.toDate().toLocaleString() : typeof event.date === 'string' ? new Date(event.date).toLocaleString() : ''}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* === PHOTOS TAB === */}
                {profileTab === 'photos' && (
                    <div className="space-y-4">
                        {photos.length === 0 ? (
                            <p className="p-8 text-gray-400 text-center bg-white dark:bg-gray-800 rounded-xl">No photos found.</p>
                        ) : (
                            <div className="grid grid-cols-3 gap-2">
                                {photos.map((photo, idx) => (
                                    <div key={idx} className="relative group">
                                        <img src={photo.url} alt={photo.taskTitle} className="w-full h-24 rounded-xl object-cover border border-gray-200 dark:border-gray-700" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity flex items-end p-1.5">
                                            <span className="text-[9px] text-white font-bold truncate">{photo.taskTitle}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        )
    }

    // === EMPLOYEE LIST VIEW ===
    return (
        <div className="space-y-4 pb-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-800 to-indigo-900 p-5 rounded-2xl text-white shadow-lg">
                <div className="flex items-center space-x-3 mb-1">
                    <Users className="text-indigo-300" size={26} />
                    <div>
                        <h3 className="text-lg font-black">Employee Profiles</h3>
                        <p className="text-indigo-300 text-xs">Work history, performance, and accountability tracking</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2 mt-3">
                    <div className="bg-white/15 backdrop-blur rounded-lg p-2 text-center flex-1">
                        <div className="text-lg font-black">{employees.length}</div>
                        <div className="text-[9px] text-indigo-200 uppercase font-bold">Total</div>
                    </div>
                    <div className="bg-white/15 backdrop-blur rounded-lg p-2 text-center flex-1">
                        <div className="text-lg font-black">{employees.filter(e => e.role === 'admin').length}</div>
                        <div className="text-[9px] text-indigo-200 uppercase font-bold">Admins</div>
                    </div>
                    <div className="bg-white/15 backdrop-blur rounded-lg p-2 text-center flex-1">
                        <div className="text-lg font-black">{employees.filter(e => e.role !== 'admin').length}</div>
                        <div className="text-[9px] text-indigo-200 uppercase font-bold">Staff</div>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search size={18} className="absolute left-3 top-3 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search by name, role, or team..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Employee List */}
            <div className="space-y-2">
                {filtered.length === 0 ? (
                    <p className="p-8 text-gray-400 text-center bg-white dark:bg-gray-800 rounded-xl">
                        {employees.length === 0 ? 'No employees found. Add users to your company first.' : 'No matching employees.'}
                    </p>
                ) : filtered.map(emp => (
                    <button
                        key={emp.id}
                        onClick={() => selectEmployee(emp)}
                        className="w-full bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center space-x-3 hover:shadow-md transition-shadow text-left"
                    >
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                            {emp.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200 truncate">{emp.name}</h4>
                            <p className="text-[10px] text-gray-400">{emp.role.toUpperCase()} • {emp.team}</p>
                        </div>
                        <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
                    </button>
                ))}
            </div>
        </div>
    )
}
