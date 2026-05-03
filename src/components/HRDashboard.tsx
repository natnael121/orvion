import React, { useState } from 'react'
import { AttendanceManager } from './AttendanceManager'
import { LeaveManager } from './LeaveManager'
import { EmployeeTasks } from './EmployeeTasks'
import { UserData } from '../types'

export const HRDashboard: React.FC<{ userData: UserData | null }> = ({ userData }) => {
    const [activeTab, setActiveTab] = useState<'attendance' | 'leaves' | 'tasks'>('attendance')

    return (
        <div className="space-y-4">
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mx-4 mt-4">
                <button
                    onClick={() => setActiveTab('attendance')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'attendance' ? 'bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                >
                    Attendance
                </button>
                <button
                    onClick={() => setActiveTab('leaves')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'leaves' ? 'bg-white dark:bg-gray-700 shadow text-purple-600 dark:text-purple-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                >
                    Leaves
                </button>
                <button
                    onClick={() => setActiveTab('tasks')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'tasks' ? 'bg-white dark:bg-gray-700 shadow text-green-600 dark:text-green-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                >
                    Tasks
                </button>
            </div>

            {activeTab === 'attendance' ? (
                <AttendanceManager userData={userData} />
            ) : activeTab === 'leaves' ? (
                <LeaveManager userData={userData} />
            ) : (
                <EmployeeTasks userData={userData} />
            )}
        </div>
    )
}
