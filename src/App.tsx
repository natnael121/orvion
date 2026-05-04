import React, { useEffect, useState } from 'react'
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { collection, query, where, getDocs, doc, getDoc, addDoc } from 'firebase/firestore'
import { shopCustomerService } from './services/shopCustomerService'
import { TelegramProvider } from './contexts/TelegramContext'
import { FirebaseProvider } from './contexts/FirebaseContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { cacheSyncService } from './services/cacheSync'
import { HRDashboard } from './components/HRDashboard'
import { CompanyLanding } from './components/CompanyLanding'
import UserProfile from './components/UserProfile'
import AdminPanel from './components/AdminPanel'
import { MyProfile } from './components/employee/MyProfile'
import Navigation from './components/Navigation'
import SyncStatus from './components/common/SyncStatus'
import UserRegistration from './components/UserRegistration'
import { User, UserData } from './types'

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const auth = getAuth(app)

function App() {
  const [currentView, setCurrentView] = useState<'hr' | 'profile' | 'admin' | 'mywork'>('hr')
  const [user, setUser] = useState<User | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [userLoading, setUserLoading] = useState(true)
  const [startParam, setStartParam] = useState<string | null>(null)
  const [needsRegistration, setNeedsRegistration] = useState(false)
  const [hasCompany, setHasCompany] = useState<boolean | null>(null)

  useEffect(() => {
    // Sign in anonymously to satisfy security rules
    signInAnonymously(auth).catch(err => console.error('Auth error:', err))

    // Initialize cache sync service
    const initializeCache = async () => {
      try {
        console.log('Initializing cache sync service...')
        await cacheSyncService.init(db, {
          syncInterval: 30000, // 30 seconds
          batchSize: 50,
          maxRetries: 3
        })
        console.log('Cache sync service initialized successfully')
      } catch (error) {
        console.error('Failed to initialize cache sync service:', error)
      }
    }

    initializeCache()

    // Initialize Telegram WebApp
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp
      tg.ready()
      tg.expand()

      // Set header color to match theme
      tg.setHeaderColor('#2481cc')

      // Get user data from Telegram
      const initData = tg.initDataUnsafe as any
      const telegramUser = initData?.user
      const startParameter = initData?.start_param || initData?.start_app || initData?.startapp

      console.log('Telegram WebApp initDataUnsafe:', initData)
      console.log('Telegram start parameter:', startParameter)

      if (startParameter) {
        setStartParam(startParameter)
      }

      if (telegramUser) {
        const userInfo = {
          id: telegramUser.id.toString(),
          firstName: telegramUser.first_name,
          lastName: telegramUser.last_name || '',
          username: telegramUser.username || '',
          languageCode: telegramUser.language_code || 'en',
          telegramId: telegramUser.id
        }
        setUser(userInfo)

        // Check if user exists in database, pass startParameter to determine flow
        checkUserInDatabase(telegramUser.id, userInfo, startParameter)
      } else {
        // For development/testing - check for start param even without user
        if (startParameter) {
          handleStartParam(startParameter)
        }
        setUserLoading(false)
      }
    } else {
      // For development/testing outside Telegram
      const urlParams = new URLSearchParams(window.location.search)
      const shopParam = urlParams.get('shop')
      if (shopParam) {
        setStartParam(shopParam)
        handleStartParam(shopParam)
      }
      setUserLoading(false)
    }
  }, [])

  const handleStartParam = async (param: string, userInfo?: User) => {
    try {
      console.log('Handling start parameter:', param)

      const currentUser = userInfo || user
      if (!currentUser) {
        console.log('No user available for start param')
        return
      }

      // First, add user to shop_customers if not already there
      const displayName = `${currentUser.firstName} ${currentUser.lastName}`.trim() || 'Customer'
      const result = await shopCustomerService.handleShopLinkAccess(
        db,
        param,
        currentUser.telegramId || parseInt(currentUser.id),
        displayName
      )

      if (!result.success) {
        console.error('Failed to add user to shop:', result.error)
        return
      }

      const shopId = result.shopId
      const productId = result.productId

      console.log('Shop access result:', { shopId, productId, isNewCustomer: result.isNewCustomer })

      // If user was newly created or linked, handle specific join result
      if (result.success) {
        setHasCompany(true)
        setCurrentView('hr')

        // Refresh local userData if we have a telegram user
        if (currentUser.telegramId) {
          const usersRef = collection(db, 'users')
          const userQuery = query(usersRef, where('telegramId', '==', currentUser.telegramId))
          const userSnapshot = await getDocs(userQuery)
          if (!userSnapshot.empty) {
            const userDoc = userSnapshot.docs[0]
            setUserData({ ...userDoc.data(), uid: userDoc.id } as UserData)
          }
        }
      }

      console.log('User registered to shop via link, state updated')
    } catch (error) {
      console.error('Error handling start parameter:', error)
    }
  }

  const checkUserInDatabase = async (telegramId: number, userInfo?: User, startParameter?: string | null) => {
    try {
      setUserLoading(true)
      const usersRef = collection(db, 'users')

      // Try both telegramId and telegram_id fields
      let userSnapshot = await getDocs(query(usersRef, where('telegramId', '==', telegramId)))

      if (userSnapshot.empty) {
        userSnapshot = await getDocs(query(usersRef, where('telegram_id', '==', telegramId)))
      }

      if (!userSnapshot.empty) {
        const userDoc = userSnapshot.docs[0]
        const userData = userDoc.data() as UserData
        setUserData({
          ...userData,
          uid: userDoc.id,
          createdAt: (userData.createdAt as any)?.toDate ? (userData.createdAt as any).toDate() : new Date(),
          updatedAt: (userData.updatedAt as any)?.toDate ? (userData.updatedAt as any).toDate() : new Date()
        })

        // Check if user belongs to any company
        const custQ = query(collection(db, 'shop_customers'), where('telegramId', '==', telegramId))
        const custSnap = await getDocs(custQ)

        if (custSnap.empty) {
          setHasCompany(false)
          // Also check if they own any shops
          const ownerQ = query(collection(db, 'shops'), where('ownerId', '==', userDoc.id))
          const ownerSnap = await getDocs(ownerQ)
          if (!ownerSnap.empty) {
            setHasCompany(true)
            setUserData(prev => prev ? { ...prev, activeShopId: ownerSnap.docs[0].id, role: 'admin' } : prev)
          }
        } else {
          setHasCompany(true)
          const companies = custSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[]
          const hasAdminRole = companies.some(c => c.role === 'admin')

          // Also check if they own any shops to be sure
          const ownerQ = query(collection(db, 'shops'), where('ownerId', '==', userDoc.id))
          const ownerSnap = await getDocs(ownerQ)
          const isOwner = !ownerSnap.empty

          // Automatically set activeShopId and role from shop_customers
          setUserData(prev => prev ? {
            ...prev,
            activeShopId: companies[0].shopId || (isOwner ? ownerSnap.docs[0].id : undefined),
            role: (hasAdminRole || isOwner) ? 'admin' : (companies[0].role || 'customer')
          } : prev)
        }

        // User exists, no registration needed
        setNeedsRegistration(false)
      } else {
        // User does not exist in database
        // Only require registration if they came via Start button (no startParameter)
        if (!startParameter) {
          console.log('New user without shop link - needs registration')
          setNeedsRegistration(true)
        } else {
          // User came via shop link - no registration needed, will auto-create
          console.log('New user with shop link - will auto-create customer account')
          setNeedsRegistration(false)
        }
      }

      // After user check, handle start param if present
      // This will create the user if they don't exist (for link-based users)
      if (startParameter) {
        await handleStartParam(startParameter, userInfo)
      }
    } catch (error) {
      console.error('Error checking user in database:', error)
    } finally {
      setUserLoading(false)
    }
  }

  const handleRegistrationComplete = (userData: UserData) => {
    console.log('Registration completed:', userData)
    setUserData(userData)
    setNeedsRegistration(false)
    setHasCompany(false)
  }

  // Show loading while checking user
  if (userLoading) {
    return (
      <TelegramProvider>
        <FirebaseProvider db={db} auth={auth}>
          <NotificationProvider>
            <div className="min-h-screen bg-telegram-bg text-telegram-text flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-telegram-button border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-telegram-hint">Loading...</p>
              </div>
            </div>
          </NotificationProvider>
        </FirebaseProvider>
      </TelegramProvider>
    )
  }

  // Show registration for new users who came via Start button
  if (needsRegistration && user) {
    return (
      <TelegramProvider>
        <FirebaseProvider db={db} auth={auth}>
          <NotificationProvider>
            <UserRegistration
              user={user}
              onComplete={handleRegistrationComplete}
            />
          </NotificationProvider>
        </FirebaseProvider>
      </TelegramProvider>
    )
  }

  // Remove duplicate UserRegistration block

  return (
    <TelegramProvider>
      <FirebaseProvider db={db} auth={auth}>
        <NotificationProvider>
          <div className="min-h-screen bg-telegram-bg text-telegram-text">
            <SyncStatus />
            <div className="max-w-md mx-auto">
              {/* Header */}
              <header className="sticky top-0 z-10 bg-telegram-button text-telegram-button-text p-4 shadow-lg">
                <h1 className="text-xl font-bold text-center">HR Portal</h1>
                {user && (
                  <p className="text-sm text-center opacity-80 mt-1">
                    Welcome, {user.firstName}!
                  </p>
                )}
              </header>

              {/* Main Content */}
              {hasCompany === false ? (
                <CompanyLanding
                  user={user!}
                  userData={userData}
                  onCompanyDetermined={() => {
                    setHasCompany(true)
                    setCurrentView('hr')
                  }}
                />
              ) : (
                <>
                  {currentView === 'hr' && <HRDashboard userData={userData} />}
                  {currentView === 'profile' && <UserProfile user={user} userData={userData} />}
                  {currentView === 'mywork' && <MyProfile userData={userData} />}
                  {currentView === 'admin' && <AdminPanel userData={userData} />}

                  {/* Bottom Navigation */}
                  <Navigation
                    currentView={currentView}
                    onViewChange={setCurrentView}
                    userData={userData}
                  />
                </>
              )}
            </div>
          </div>
        </NotificationProvider>
      </FirebaseProvider>
    </TelegramProvider>
  )
}

export default App