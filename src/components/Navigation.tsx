import React from 'react'
import { Clock, User, Settings, Briefcase } from 'lucide-react'
import { UserData } from '../types'

interface NavigationProps {
  currentView: string
  onViewChange: (view: any) => void
  userData?: UserData | null
}

const Navigation: React.FC<NavigationProps> = ({ currentView, onViewChange, userData }) => {
  const showProfileNotification = userData && !userData.profileCompleted

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] pb-safe rounded-t-2xl z-50">
      <div className="max-w-md mx-auto flex justify-between px-6">
        <button
          onClick={() => onViewChange('hr')}
          className={`flex-1 py-4 flex flex-col items-center space-y-1 transition-all duration-300 ${currentView === 'hr'
            ? 'text-blue-600 dark:text-blue-400 transform -translate-y-1'
            : 'text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-300'
            }`}
        >
          <div className={`p-2 rounded-full ${currentView === 'hr' ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-transparent'}`}>
            <Clock className={`w-6 h-6 ${currentView === 'hr' ? 'stroke-[2.5px]' : 'stroke-2'}`} />
          </div>
          <span className={`text-[10px] font-semibold tracking-wider uppercase ${currentView === 'hr' ? 'opacity-100' : 'opacity-70'}`}>HR</span>
        </button>

        <button
          onClick={() => onViewChange('profile')}
          className={`flex-1 py-4 flex flex-col items-center space-y-1 transition-all duration-300 relative ${currentView === 'profile'
            ? 'text-blue-600 dark:text-blue-400 transform -translate-y-1'
            : 'text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-300'
            }`}
        >
          <div className={`relative p-2 rounded-full ${currentView === 'profile' ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-transparent'}`}>
            <User className={`w-6 h-6 ${currentView === 'profile' ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            {showProfileNotification && (
              <span className="absolute top-1 right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white dark:border-gray-900"></span>
              </span>
            )}
          </div>
          <span className={`text-[10px] font-semibold tracking-wider uppercase ${currentView === 'profile' ? 'opacity-100' : 'opacity-70'}`}>Me</span>
        </button>

        <button
          onClick={() => onViewChange('mywork')}
          className={`flex-1 py-4 flex flex-col items-center space-y-1 transition-all duration-300 ${currentView === 'mywork'
            ? 'text-blue-600 dark:text-blue-400 transform -translate-y-1'
            : 'text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-300'
            }`}
        >
          <div className={`p-2 rounded-full ${currentView === 'mywork' ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-transparent'}`}>
            <Briefcase className={`w-6 h-6 ${currentView === 'mywork' ? 'stroke-[2.5px]' : 'stroke-2'}`} />
          </div>
          <span className={`text-[10px] font-semibold tracking-wider uppercase ${currentView === 'mywork' ? 'opacity-100' : 'opacity-70'}`}>My Work</span>
        </button>

        {(userData?.role === 'admin' || userData?.role === 'shop_owner') && (
          <button
            onClick={() => onViewChange('admin')}
            className={`flex-1 py-4 flex flex-col items-center space-y-1 transition-all duration-300 ${currentView === 'admin'
              ? 'text-blue-600 dark:text-blue-400 transform -translate-y-1'
              : 'text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-300'
              }`}
          >
            <div className={`p-2 rounded-full ${currentView === 'admin' ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-transparent'}`}>
              <Settings className={`w-6 h-6 ${currentView === 'admin' ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            </div>
            <span className={`text-[10px] font-semibold tracking-wider uppercase ${currentView === 'admin' ? 'opacity-100' : 'opacity-70'}`}>Admin</span>
          </button>
        )}
      </div>
    </nav>
  )
}

export default Navigation