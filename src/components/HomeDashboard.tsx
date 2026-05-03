import React from 'react'
import { Users, Briefcase, DollarSign, PackageOpen, LayoutDashboard, Settings } from 'lucide-react'
import { UserData } from '../types'

interface HomeDashboardProps {
    userData: UserData | null
    onModuleSelect: (module: 'hr' | 'crm' | 'finance' | 'inventory') => void
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({ userData, onModuleSelect }) => {
    const modules = [
        {
            id: 'hr',
            title: 'Human Resources',
            description: 'Attendance, Leaves, Roles & Tasks',
            icon: <Users size={32} className="text-blue-600" />,
            bg: 'bg-blue-50',
            border: 'border-blue-100',
            active: true
        },
        {
            id: 'finance',
            title: 'Finance & Expenses',
            description: 'Track corporate expenses & approvals',
            icon: <DollarSign size={32} className="text-green-600" />,
            bg: 'bg-green-50',
            border: 'border-green-100',
            active: true,
            allowedRoles: ['admin'] // Only admin
        },
        {
            id: 'crm',
            title: 'Sales & CRM',
            description: 'Customer relationships & contacts',
            icon: <Briefcase size={32} className="text-purple-600" />,
            bg: 'bg-purple-50',
            border: 'border-purple-100',
            active: true,
            allowedRoles: ['admin'] // Only admin
        },
        {
            id: 'inventory',
            title: 'Inventory & Catalog',
            description: 'Products and dynamic shop links',
            icon: <PackageOpen size={32} className="text-orange-600" />,
            bg: 'bg-orange-50',
            border: 'border-orange-100',
            active: true,
            allowedRoles: ['admin'] // Only admin
        }
    ]

    const visibleModules = modules.filter(mod => !mod.allowedRoles || mod.allowedRoles.includes(userData?.role || ''))

    return (
        <div className="space-y-6 pt-4 pb-20 px-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                        <LayoutDashboard size={24} className="mr-2 text-blue-600" />
                        Workspace
                    </h2>
                    <p className="text-sm text-gray-500">Pick a module to get started</p>
                </div>
                {userData?.role === 'admin' && (
                    <div className="p-2 bg-gray-100 rounded-full text-gray-600">
                        <Settings size={20} />
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {visibleModules.map((mod) => (
                    <button
                        key={mod.id}
                        onClick={() => onModuleSelect(mod.id as any)}
                        className={`w-full text-left p-6 rounded-2xl border-2 transition-all duration-200 group hover:shadow-md hover:-translate-y-1 bg-white ${mod.border}`}
                    >
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${mod.bg} group-hover:scale-110 transition-transform`}>
                            {mod.icon}
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-1">{mod.title}</h3>
                        <p className="text-sm text-gray-500">{mod.description}</p>
                    </button>
                ))}
            </div>
        </div>
    )
}
