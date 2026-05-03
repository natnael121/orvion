import React, { useEffect, useState } from 'react'
import { collection, query, getDocs, orderBy, updateDoc, doc } from 'firebase/firestore'
import { useFirebase } from '../contexts/FirebaseContext'
import { useTelegram } from '../contexts/TelegramContext'
import { useNotification } from '../contexts/NotificationContext'
import { Users, Clock, Calendar, CheckCircle, XCircle, Building2, ListTodo } from 'lucide-react'
import { CompanyManager, TaskManager } from './admin/CompanyManagement'
import { DepartmentList } from './admin/DepartmentList'
import { ExpenseManager } from './finance/ExpenseManager'
import CRMDashboard from './crm/CRMDashboard'
import { InventoryWrapper } from './InventoryWrapper'
import { MaterialRequestManager } from './admin/MaterialRequestManager'
import { OperationsDashboard } from './admin/OperationsDashboard'
import { PerformanceEngine } from './admin/PerformanceEngine'
import { EmployeeHistory } from './admin/EmployeeHistory'
import { OperationsMap } from './admin/OperationsMap'

interface AdminPanelProps {
  userData: any;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ userData }) => {
  const { db } = useFirebase()
  const { showNotification } = useNotification()

  const [activeTab, setActiveTab] = useState<'ops' | 'map' | 'performance' | 'hr' | 'employees' | 'companies' | 'tasks' | 'roles' | 'finance' | 'crm' | 'inventory' | 'materials'>('ops')
  const [hrSubTab, setHrSubTab] = useState<'attendance' | 'leaves' | 'stats'>('attendance')
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([])
  const [leaveRequests, setLeaveRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch Attendance
      const attQ = query(collection(db, 'attendance'), orderBy('timestamp', 'desc'))
      const attSnap = await getDocs(attQ)
      setAttendanceRecords(attSnap.docs.map(d => ({ id: d.id, ...d.data() })))

      // Fetch Leaves
      const leaveQ = query(collection(db, 'leave_requests'), orderBy('submittedAt', 'desc'))
      const leaveSnap = await getDocs(leaveQ)
      setLeaveRequests(leaveSnap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (e) {
      console.error("Fetch Data Error", e)
      showNotification('error', 'Failed to load HR data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleUpdateLeaveStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'leave_requests', id), { status })
      showNotification('success', `Leave request ${status}`)
      fetchData()
    } catch (e) {
      console.error(e)
      showNotification('error', 'Failed to update leave request')
    }
  }

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-2xl shadow-lg p-6 text-white">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-10 h-10 bg-white/10 backdrop-blur rounded-xl flex items-center justify-center">
            <Users className="text-cyan-400" size={22} />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight">Operations ERP</h2>
            <p className="text-blue-300 text-xs">Field Intelligence • Workforce • Resources</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 mt-4">
          <div className="bg-white/10 backdrop-blur rounded-lg p-2 text-center">
            <div className="text-lg font-black">{attendanceRecords.length}</div>
            <div className="text-[9px] text-blue-200 uppercase font-bold">Check-ins</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-2 text-center">
            <div className="text-lg font-black">{leaveRequests.filter(r => r.status === 'pending').length}</div>
            <div className="text-[9px] text-blue-200 uppercase font-bold">Leaves</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-2 text-center">
            <div className="text-lg font-black">—</div>
            <div className="text-[9px] text-blue-200 uppercase font-bold">Teams</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-2 text-center">
            <div className="text-lg font-black">—</div>
            <div className="text-[9px] text-blue-200 uppercase font-bold">Tasks</div>
          </div>
        </div>
      </div>


      {/* Module Grid */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { id: 'ops', label: 'Ops Center', emoji: '⚡', color: 'cyan', bg: 'from-cyan-500 to-blue-600' },
          { id: 'map', label: 'Live Map', emoji: '🗺️', color: 'blue', bg: 'from-blue-600 to-indigo-700' },
          { id: 'performance', label: 'Performance', emoji: '📈', color: 'violet', bg: 'from-violet-500 to-fuchsia-600' },
          { id: 'tasks', label: 'Tasks', emoji: '📋', color: 'green', bg: 'from-green-500 to-emerald-600' },
          { id: 'roles', label: 'Teams', emoji: '👥', color: 'orange', bg: 'from-orange-500 to-amber-600' },
          { id: 'materials', label: 'Materials', emoji: '📦', color: 'indigo', bg: 'from-indigo-500 to-purple-600' },
          { id: 'employees', label: 'Employees', emoji: '💼', color: 'amber', bg: 'from-amber-500 to-orange-600' },
          { id: 'hr', label: 'HR', emoji: '🧑‍💼', color: 'blue', bg: 'from-blue-500 to-sky-600' },
          { id: 'companies', label: 'Company', emoji: '🏢', color: 'slate', bg: 'from-slate-500 to-gray-600' },
          { id: 'finance', label: 'Finance', emoji: '💰', color: 'emerald', bg: 'from-emerald-500 to-teal-600' },
          { id: 'crm', label: 'CRM', emoji: '🤝', color: 'rose', bg: 'from-rose-500 to-red-600' },
          { id: 'inventory', label: 'Inventory', emoji: '🏪', color: 'teal', bg: 'from-teal-500 to-cyan-600' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`relative p-3 rounded-xl text-center transition-all duration-200 ${activeTab === tab.id
              ? `bg-gradient-to-br ${tab.bg} text-white shadow-lg scale-[1.02]`
              : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:shadow-md hover:scale-[1.01]'
              }`}
          >
            <div className="text-xl mb-1">{tab.emoji}</div>
            <div className={`text-[10px] font-bold uppercase tracking-wide ${activeTab === tab.id ? 'text-white/90' : ''}`}>
              {tab.label}
            </div>
          </button>
        ))}
      </div>


      {loading && activeTab !== 'ops' && activeTab !== 'performance' && activeTab !== 'employees' && activeTab !== 'map' ? (
        <div className="text-center p-8 text-gray-500">Loading data...</div>
      ) : activeTab === 'ops' ? (
        <OperationsDashboard userData={userData} />
      ) : activeTab === 'map' ? (
        <OperationsMap userData={userData} />
      ) : activeTab === 'performance' ? (
        <PerformanceEngine userData={userData} />
      ) : activeTab === 'employees' ? (
        <EmployeeHistory userData={userData} />
      ) : activeTab === 'hr' ? (
        <div className="space-y-4">
          {/* HR Module Header */}
          <div className="bg-gradient-to-r from-blue-600 to-sky-500 p-5 rounded-2xl text-white shadow-md">
            <h3 className="text-lg font-black">Human Resources</h3>
            <p className="text-blue-100 text-xs mt-0.5">Attendance, Leave Management & Workforce Stats</p>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="bg-white/15 backdrop-blur rounded-lg p-2 text-center">
                <div className="text-lg font-black">{attendanceRecords.length}</div>
                <div className="text-[9px] text-blue-100 uppercase font-bold">Check-ins</div>
              </div>
              <div className="bg-white/15 backdrop-blur rounded-lg p-2 text-center">
                <div className="text-lg font-black">{leaveRequests.filter(r => r.status === 'pending').length}</div>
                <div className="text-[9px] text-blue-100 uppercase font-bold">Pending</div>
              </div>
              <div className="bg-white/15 backdrop-blur rounded-lg p-2 text-center">
                <div className="text-lg font-black">{leaveRequests.filter(r => r.status === 'approved').length}</div>
                <div className="text-[9px] text-blue-100 uppercase font-bold">Approved</div>
              </div>
            </div>
          </div>

          {/* HR Sub-Tabs */}
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            <button onClick={() => setHrSubTab('attendance')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${hrSubTab === 'attendance' ? 'bg-white dark:bg-gray-700 shadow text-blue-600' : 'text-gray-500'}`}>🕐 Attendance</button>
            <button onClick={() => setHrSubTab('leaves')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${hrSubTab === 'leaves' ? 'bg-white dark:bg-gray-700 shadow text-purple-600' : 'text-gray-500'}`}>🏖️ Leaves</button>
            <button onClick={() => setHrSubTab('stats')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${hrSubTab === 'stats' ? 'bg-white dark:bg-gray-700 shadow text-emerald-600' : 'text-gray-500'}`}>📊 Stats</button>
          </div>

          {/* Attendance Sub-Tab */}
          {hrSubTab === 'attendance' && (
            <div className="space-y-3">
              {attendanceRecords.length === 0 ? (
                <div className="text-center p-8 text-gray-500 bg-white dark:bg-gray-800 rounded-xl">No attendance records found.</div>
              ) : attendanceRecords.map(record => (
                <div key={record.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex space-x-4">
                  {record.photoUrl ? (
                    <img src={record.photoUrl} alt="check-in" className="w-14 h-14 rounded-xl object-cover border border-gray-200" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <Users className="text-gray-400" size={20} />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200">{record.userName || 'Employee'}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md mt-1 inline-block ${record.type === 'check-in' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                          {record.type === 'check-in' ? 'CHECK IN' : 'CHECK OUT'}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-gray-500">{record.timestamp?.toDate ? record.timestamp.toDate().toLocaleDateString() : ''}</div>
                        <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {record.timestamp?.toDate ? record.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1 truncate max-w-[200px]">
                      📍 {record.location?.lat?.toFixed(4)}, {record.location?.lng?.toFixed(4)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Leaves Sub-Tab */}
          {hrSubTab === 'leaves' && (
            <div className="space-y-3">
              {leaveRequests.length === 0 ? (
                <div className="text-center p-8 text-gray-500 bg-white dark:bg-gray-800 rounded-xl">No leave requests found.</div>
              ) : leaveRequests.map(req => (
                <div key={req.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200">{req.userName || 'Employee'}</h4>
                      <span className="text-[10px] font-semibold uppercase text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">{req.type}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${req.status === 'approved' ? 'bg-green-100 text-green-700' : req.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {req.status?.toUpperCase()}
                    </span>
                  </div>

                  <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 p-2 rounded-lg flex items-center space-x-2">
                    <Calendar size={14} />
                    <span>{req.startDate?.toDate ? req.startDate.toDate().toLocaleDateString() : ''} → {req.endDate?.toDate ? req.endDate.toDate().toLocaleDateString() : ''}</span>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400 italic">"{req.reason}"</p>

                  {req.status === 'pending' && (
                    <div className="flex space-x-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                      <button
                        onClick={() => handleUpdateLeaveStatus(req.id, 'approved')}
                        className="flex-1 py-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg text-sm font-bold flex justify-center items-center space-x-1 transition-colors"
                      >
                        <CheckCircle size={16} /><span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleUpdateLeaveStatus(req.id, 'rejected')}
                        className="flex-1 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-bold flex justify-center items-center space-x-1 transition-colors"
                      >
                        <XCircle size={16} /><span>Reject</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Stats Sub-Tab */}
          {hrSubTab === 'stats' && (
            <div className="space-y-3">
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
                <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-3">📊 HR Overview</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl text-center">
                    <div className="text-2xl font-black text-blue-600">{attendanceRecords.filter(r => r.type === 'check-in').length}</div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase">Total Check-ins</div>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-xl text-center">
                    <div className="text-2xl font-black text-orange-600">{attendanceRecords.filter(r => r.type === 'check-out').length}</div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase">Total Check-outs</div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-xl text-center">
                    <div className="text-2xl font-black text-green-600">{leaveRequests.filter(r => r.status === 'approved').length}</div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase">Approved Leaves</div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl text-center">
                    <div className="text-2xl font-black text-red-600">{leaveRequests.filter(r => r.status === 'rejected').length}</div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase">Rejected Leaves</div>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-xl text-center col-span-2">
                    <div className="text-2xl font-black text-yellow-600">{leaveRequests.filter(r => r.status === 'pending').length}</div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase">Pending Approvals</div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                  <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200">Recent Activity</h4>
                </div>
                <div className="divide-y divide-gray-50 dark:divide-gray-700">
                  {attendanceRecords.slice(0, 5).map(r => (
                    <div key={r.id} className="p-3 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${r.type === 'check-in' ? 'bg-blue-500' : 'bg-orange-500'}`} />
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{r.userName || 'Employee'}</span>
                      </div>
                      <span className="text-[10px] text-gray-400">{r.timestamp?.toDate ? r.timestamp.toDate().toLocaleString() : ''}</span>
                    </div>
                  ))}
                  {attendanceRecords.length === 0 && <p className="p-4 text-gray-400 text-sm text-center">No activity yet.</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'companies' ? (
        <CompanyManager userData={userData} />
      ) : activeTab === 'tasks' ? (
        <TaskManager userData={userData} />
      ) : activeTab === 'roles' ? (
        <DepartmentList userData={userData} />
      ) : activeTab === 'finance' ? (
        <ExpenseManager userData={userData} />
      ) : activeTab === 'crm' ? (
        <CRMDashboard shopId={userData?.activeShopId || ''} />
      ) : activeTab === 'inventory' ? (
        <InventoryWrapper shopId={userData?.activeShopId || ''} onBack={() => setActiveTab('ops')} />
      ) : activeTab === 'materials' ? (
        <MaterialRequestManager userData={userData} />
      ) : null}
    </div>
  )
}

export default AdminPanel