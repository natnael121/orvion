import React, { useState, useEffect } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { useFirebase } from '../../contexts/FirebaseContext'
import {
    Trophy, TrendingUp, Users, Star, Clock, Package, AlertTriangle,
    Award, BarChart3, Target, Zap
} from 'lucide-react'

interface PerformanceEngineProps {
    userData: any
}

interface TeamScore {
    id: string
    name: string
    tasksCompleted: number
    totalTasks: number
    avgCompletionHours: number
    issueCount: number
    materialEfficiency: number
    overallScore: number
}

export const PerformanceEngine: React.FC<PerformanceEngineProps> = ({ userData }) => {
    const { db } = useFirebase()
    const [tasks, setTasks] = useState<any[]>([])
    const [teams, setTeams] = useState<any[]>([])
    const [materialRequests, setMaterialRequests] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [view, setView] = useState<'teams' | 'leaderboard' | 'materials' | 'time'>('teams')

    const shopId = userData?.activeShopId || 'hr-system-company'

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const tQ = query(collection(db, 'tasks'), where('shopId', '==', shopId))
            const tSnap = await getDocs(tQ)
            setTasks(tSnap.docs.map(d => ({ id: d.id, ...d.data() })))

            const dQ = query(collection(db, 'departments'), where('shopId', '==', shopId))
            const dSnap = await getDocs(dQ)
            setTeams(dSnap.docs.map(d => ({ id: d.id, ...d.data() })))

            try {
                const mSnap = await getDocs(collection(db, 'material_requests'))
                setMaterialRequests(mSnap.docs.map(d => ({ id: d.id, ...d.data() })))
            } catch (e) { console.error(e) }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    // === TEAM SCORING ENGINE ===
    const calculateTeamScores = (): TeamScore[] => {
        return teams.map(team => {
            const teamTasks = tasks.filter(t => t.assignedToTeam === team.id)
            const completed = teamTasks.filter(t => t.status === 'completed')
            const totalTasks = teamTasks.length

            // Average completion time (hours)
            let avgHours = 0
            const completedWithTime = completed.filter(t => t.startedAt && t.completedAt)
            if (completedWithTime.length > 0) {
                const totalHours = completedWithTime.reduce((acc: number, t: any) => {
                    const start = t.startedAt?.toDate ? t.startedAt.toDate() : new Date(t.startedAt)
                    const end = t.completedAt?.toDate ? t.completedAt.toDate() : new Date(t.completedAt)
                    return acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60)
                }, 0)
                avgHours = totalHours / completedWithTime.length
            }

            // Issue count
            const issueCount = teamTasks.reduce((acc: number, t: any) => {
                return acc + (t.progressLogs?.filter((l: any) => l.isIssue)?.length || 0)
            }, 0)

            // Material efficiency
            const teamMaterials = materialRequests.filter(m => m.teamId === team.id)
            const issuedMaterials = teamMaterials.filter(m => m.status === 'issued').length
            const totalMaterialReqs = teamMaterials.length
            const materialEfficiency = totalMaterialReqs > 0 ? Math.round((issuedMaterials / totalMaterialReqs) * 100) : 100

            // Overall Score (0-100)
            const completionRate = totalTasks > 0 ? (completed.length / totalTasks) : 0
            const timeScore = avgHours > 0 ? Math.max(0, 100 - (avgHours * 5)) : 50 // Penalize slow teams
            const issueScore = Math.max(0, 100 - (issueCount * 15))
            const overallScore = Math.round(
                (completionRate * 40) +  // 40% weight on completion
                (timeScore * 0.25) +     // 25% weight on speed
                (issueScore * 0.20) +    // 20% weight on quality
                (materialEfficiency * 0.15) // 15% weight on resource efficiency
            )

            return {
                id: team.id,
                name: team.name,
                tasksCompleted: completed.length,
                totalTasks,
                avgCompletionHours: Math.round(avgHours * 10) / 10,
                issueCount,
                materialEfficiency,
                overallScore: Math.min(100, Math.max(0, overallScore))
            }
        }).sort((a, b) => b.overallScore - a.overallScore)
    }

    // === MATERIAL EFFICIENCY BY TEAM ===
    const getMaterialStats = () => {
        return teams.map(team => {
            const teamMats = materialRequests.filter(m => m.teamId === team.id)
            const pending = teamMats.filter(m => m.status === 'pending').length
            const issued = teamMats.filter(m => m.status === 'issued').length
            const rejected = teamMats.filter(m => m.status === 'rejected').length
            return { name: team.name, pending, issued, rejected, total: teamMats.length }
        }).filter(t => t.total > 0)
    }

    // === TIME EFFICIENCY ===
    const getTimeStats = () => {
        const completedTasks = tasks.filter(t => t.status === 'completed' && t.startedAt && t.completedAt)
        return completedTasks.map(t => {
            const start = t.startedAt?.toDate ? t.startedAt.toDate() : new Date(t.startedAt)
            const end = t.completedAt?.toDate ? t.completedAt.toDate() : new Date(t.completedAt)
            const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
            return {
                title: t.title,
                team: t.assignedTeamName,
                hours: Math.round(hours * 10) / 10,
                target: t.target,
                completedQty: t.completedQty
            }
        }).sort((a, b) => a.hours - b.hours)
    }

    if (loading) return <div className="p-8 text-center text-gray-500">Calculating performance metrics...</div>

    const teamScores = calculateTeamScores()
    const materialStats = getMaterialStats()
    const timeStats = getTimeStats()
    const topTeam = teamScores[0]

    const getScoreColor = (score: number) => {
        if (score >= 75) return 'text-emerald-600'
        if (score >= 50) return 'text-blue-600'
        if (score >= 25) return 'text-orange-600'
        return 'text-red-600'
    }

    const getScoreBg = (score: number) => {
        if (score >= 75) return 'bg-emerald-500'
        if (score >= 50) return 'bg-blue-500'
        if (score >= 25) return 'bg-orange-500'
        return 'bg-red-500'
    }

    return (
        <div className="space-y-6 pb-6">
            {/* === HEADER === */}
            <div className="bg-gradient-to-r from-violet-900 to-fuchsia-900 p-6 rounded-2xl text-white shadow-lg">
                <div className="flex items-center space-x-3 mb-1">
                    <BarChart3 className="text-fuchsia-300" size={28} />
                    <h2 className="text-xl font-bold tracking-tight">Performance & Intelligence</h2>
                </div>
                <p className="text-violet-200 text-sm">Team rankings, efficiency scores, and operational intelligence</p>
            </div>

            {/* === TOP PERFORMER CARD === */}
            {topTeam && topTeam.totalTasks > 0 && (
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 p-5 rounded-2xl border-2 border-amber-200 dark:border-amber-700 shadow-sm">
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-amber-400 rounded-full flex items-center justify-center shadow-lg">
                            <Trophy size={24} className="text-white" />
                        </div>
                        <div>
                            <div className="text-xs text-amber-600 font-bold uppercase tracking-wide">Top Performing Team</div>
                            <div className="text-xl font-black text-gray-800 dark:text-gray-200">{topTeam.name}</div>
                            <div className="text-sm text-gray-500">Score: <span className="font-bold text-amber-600">{topTeam.overallScore}pts</span> • {topTeam.tasksCompleted}/{topTeam.totalTasks} tasks done</div>
                        </div>
                    </div>
                </div>
            )}

            {/* === VIEW TABS === */}
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl overflow-x-auto hide-scrollbar">
                {[
                    { id: 'teams', label: 'Team Scores', icon: Users },
                    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
                    { id: 'materials', label: 'Material Eff.', icon: Package },
                    { id: 'time', label: 'Time Eff.', icon: Clock }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setView(tab.id as any)}
                        className={`flex-none flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${view === tab.id ? 'bg-white dark:bg-gray-700 shadow text-violet-600 dark:text-violet-400' : 'text-gray-500'}`}
                    >
                        <tab.icon size={14} />
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* === TEAM SCORES === */}
            {view === 'teams' && (
                <div className="space-y-3">
                    {teamScores.length === 0 ? (
                        <p className="text-gray-400 text-center p-8">No team data available yet.</p>
                    ) : teamScores.map((team, idx) => (
                        <div key={team.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center space-x-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-sm ${idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-orange-700' : 'bg-gray-300'}`}>
                                        {idx + 1}
                                    </div>
                                    <h4 className="font-bold text-gray-800 dark:text-gray-200">{team.name}</h4>
                                </div>
                                <div className={`text-2xl font-black ${getScoreColor(team.overallScore)}`}>
                                    {team.overallScore}<span className="text-xs text-gray-400">pts</span>
                                </div>
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden mb-3">
                                <div className={`h-full rounded-full ${getScoreBg(team.overallScore)} transition-all duration-700`} style={{ width: `${team.overallScore}%` }} />
                            </div>
                            <div className="grid grid-cols-4 gap-2 text-center text-xs">
                                <div>
                                    <div className="font-black text-gray-800 dark:text-gray-200">{team.tasksCompleted}/{team.totalTasks}</div>
                                    <div className="text-gray-400">Tasks</div>
                                </div>
                                <div>
                                    <div className="font-black text-gray-800 dark:text-gray-200">{team.avgCompletionHours}h</div>
                                    <div className="text-gray-400">Avg Time</div>
                                </div>
                                <div>
                                    <div className={`font-black ${team.issueCount > 0 ? 'text-red-500' : 'text-green-500'}`}>{team.issueCount}</div>
                                    <div className="text-gray-400">Issues</div>
                                </div>
                                <div>
                                    <div className="font-black text-gray-800 dark:text-gray-200">{team.materialEfficiency}%</div>
                                    <div className="text-gray-400">Mat. Eff</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* === LEADERBOARD === */}
            {view === 'leaderboard' && (
                <div className="space-y-4">
                    {/* Best Team */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800">
                            <h4 className="font-bold text-amber-800 dark:text-amber-400 flex items-center text-sm"><Trophy size={16} className="mr-2" /> Best Team</h4>
                        </div>
                        <div className="p-4">
                            {topTeam && topTeam.totalTasks > 0 ? (
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-gray-800 dark:text-gray-200">{topTeam.name}</span>
                                    <span className="text-amber-600 font-black">{topTeam.overallScore} pts</span>
                                </div>
                            ) : <p className="text-gray-400 text-sm">No data yet</p>}
                        </div>
                    </div>

                    {/* Most Efficient */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-800">
                            <h4 className="font-bold text-emerald-800 dark:text-emerald-400 flex items-center text-sm"><Zap size={16} className="mr-2" /> Most Efficient (Speed)</h4>
                        </div>
                        <div className="p-4">
                            {(() => {
                                const fastest = [...teamScores].filter(t => t.avgCompletionHours > 0).sort((a, b) => a.avgCompletionHours - b.avgCompletionHours)[0]
                                return fastest ? (
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-gray-800 dark:text-gray-200">{fastest.name}</span>
                                        <span className="text-emerald-600 font-black">{fastest.avgCompletionHours}h avg</span>
                                    </div>
                                ) : <p className="text-gray-400 text-sm">No completion data yet</p>
                            })()}
                        </div>
                    </div>

                    {/* Lowest Issues */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800">
                            <h4 className="font-bold text-blue-800 dark:text-blue-400 flex items-center text-sm"><Star size={16} className="mr-2" /> Lowest Error Rate</h4>
                        </div>
                        <div className="p-4">
                            {(() => {
                                const cleanest = [...teamScores].filter(t => t.totalTasks > 0).sort((a, b) => a.issueCount - b.issueCount)[0]
                                return cleanest ? (
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-gray-800 dark:text-gray-200">{cleanest.name}</span>
                                        <span className="text-blue-600 font-black">{cleanest.issueCount} issues</span>
                                    </div>
                                ) : <p className="text-gray-400 text-sm">No data yet</p>
                            })()}
                        </div>
                    </div>

                    {/* Full Ranking */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                        <div className="p-3 bg-violet-50 dark:bg-violet-900/20 border-b border-violet-100 dark:border-violet-800">
                            <h4 className="font-bold text-violet-800 dark:text-violet-400 flex items-center text-sm"><Award size={16} className="mr-2" /> Full Ranking</h4>
                        </div>
                        <div className="divide-y divide-gray-50 dark:divide-gray-700">
                            {teamScores.map((team, idx) => (
                                <div key={team.id} className="p-3 flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white ${idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-orange-700' : 'bg-gray-300'}`}>{idx + 1}</span>
                                        <span className="font-bold text-sm text-gray-800 dark:text-gray-200">{team.name}</span>
                                    </div>
                                    <span className={`font-black text-sm ${getScoreColor(team.overallScore)}`}>{team.overallScore}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* === MATERIAL EFFICIENCY === */}
            {view === 'materials' && (
                <div className="space-y-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
                        <h4 className="font-bold text-gray-800 dark:text-gray-200 flex items-center mb-4">
                            <Package size={18} className="mr-2 text-indigo-500" /> Material Usage by Team
                        </h4>
                        {materialStats.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-4">No material request data available.</p>
                        ) : (
                            <div className="space-y-4">
                                {materialStats.map((stat, idx) => (
                                    <div key={idx} className="border-b border-gray-50 dark:border-gray-700 pb-3 last:border-0 last:pb-0">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-bold text-sm text-gray-800 dark:text-gray-200">{stat.name}</span>
                                            <span className="text-xs text-gray-500">{stat.total} requests</span>
                                        </div>
                                        <div className="flex space-x-2">
                                            <div className="flex-1 bg-orange-100 dark:bg-orange-900/30 rounded-lg p-2 text-center">
                                                <div className="text-sm font-black text-orange-600">{stat.pending}</div>
                                                <div className="text-[9px] text-gray-500">Pending</div>
                                            </div>
                                            <div className="flex-1 bg-green-100 dark:bg-green-900/30 rounded-lg p-2 text-center">
                                                <div className="text-sm font-black text-green-600">{stat.issued}</div>
                                                <div className="text-[9px] text-gray-500">Issued</div>
                                            </div>
                                            <div className="flex-1 bg-red-100 dark:bg-red-900/30 rounded-lg p-2 text-center">
                                                <div className="text-sm font-black text-red-600">{stat.rejected}</div>
                                                <div className="text-[9px] text-gray-500">Rejected</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Waste detection */}
                    <div className="bg-red-50/50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-800 p-4">
                        <h4 className="font-bold text-red-800 dark:text-red-400 flex items-center text-sm mb-2">
                            <AlertTriangle size={16} className="mr-2" /> Waste Detection
                        </h4>
                        {materialStats.filter(s => s.rejected > 0).length > 0 ? (
                            <div className="space-y-1">
                                {materialStats.filter(s => s.rejected > 0).map((s, i) => (
                                    <p key={i} className="text-sm text-red-700 dark:text-red-300">{s.name}: {s.rejected} rejected requests ({Math.round((s.rejected / s.total) * 100)}% waste rate)</p>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-green-700 dark:text-green-300">No material waste detected — all teams operating efficiently.</p>
                        )}
                    </div>
                </div>
            )}

            {/* === TIME EFFICIENCY === */}
            {view === 'time' && (
                <div className="space-y-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                            <h4 className="font-bold text-gray-800 dark:text-gray-200 flex items-center">
                                <Clock size={18} className="mr-2 text-blue-500" /> Task Completion Times
                            </h4>
                        </div>
                        <div className="divide-y divide-gray-50 dark:divide-gray-700">
                            {timeStats.length === 0 ? (
                                <p className="p-4 text-gray-400 text-sm text-center">No completed tasks with timing data.</p>
                            ) : timeStats.map((t, idx) => (
                                <div key={idx} className="p-3 flex items-center justify-between">
                                    <div>
                                        <h5 className="font-bold text-sm text-gray-800 dark:text-gray-200 truncate max-w-[200px]">{t.title}</h5>
                                        <p className="text-xs text-gray-500">{t.team} • Target: {t.target}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className={`font-black ${t.hours < 4 ? 'text-green-600' : t.hours < 8 ? 'text-blue-600' : 'text-red-600'}`}>
                                            {t.hours}h
                                        </div>
                                        <div className="text-[10px] text-gray-400">
                                            {t.completedQty || '—'} done
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Avg speed per team */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
                        <h4 className="font-bold text-gray-800 dark:text-gray-200 flex items-center mb-3 text-sm">
                            <Target size={16} className="mr-2 text-violet-500" /> Average Speed per Team
                        </h4>
                        <div className="space-y-3">
                            {teamScores.filter(t => t.avgCompletionHours > 0).map(team => (
                                <div key={team.id} className="flex items-center justify-between">
                                    <span className="font-bold text-sm text-gray-800 dark:text-gray-200">{team.name}</span>
                                    <div className="flex items-center space-x-2">
                                        <div className="w-20 bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                            <div className={`h-full rounded-full ${team.avgCompletionHours < 4 ? 'bg-green-500' : team.avgCompletionHours < 8 ? 'bg-blue-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, (team.avgCompletionHours / 12) * 100)}%` }} />
                                        </div>
                                        <span className="text-xs font-black text-gray-600 dark:text-gray-400 w-10 text-right">{team.avgCompletionHours}h</span>
                                    </div>
                                </div>
                            ))}
                            {teamScores.filter(t => t.avgCompletionHours > 0).length === 0 && (
                                <p className="text-gray-400 text-sm text-center">No timing data available yet.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
