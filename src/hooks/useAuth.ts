import { useState, useEffect, createContext, useContext } from 'react'
import { 
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { auth } from '../config/firebase'
import { useFirebase } from '../contexts/FirebaseContext'
import { UserData } from '../types'

interface AuthContextType {
  user: FirebaseUser | null
  userData: UserData | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName: string, telegramId?: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const useAuthProvider = () => {
  const { db } = useFirebase()
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      
      if (firebaseUser) {
        // Fetch user data from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
          if (userDoc.exists()) {
            const data = userDoc.data() as UserData
            setUserData({
              ...data,
              createdAt: data.createdAt?.toDate?.() || new Date(),
              updatedAt: data.updatedAt?.toDate?.() || new Date()
            })
          }
        } catch (error) {
          console.error('Error fetching user data:', error)
        }
      } else {
        setUserData(null)
      }
      
      setLoading(false)
    })

    return unsubscribe
  }, [db])

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (error: any) {
      throw new Error(error.message)
    }
  }

  const signUp = async (email: string, password: string, displayName: string, telegramId?: string) => {
    try {
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password)
      
      // Update profile
      await updateProfile(firebaseUser, { displayName })
      
      // Create user document in Firestore
      const userData: UserData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email!,
        displayName,
        role: 'shop_owner',
        telegramId: telegramId ? parseInt(telegramId) : undefined,
        settings: {
          notifications: {
            email: true,
            push: true,
            telegram: !!telegramId
          },
          telegram: {
            chatId: telegramId || '',
            username: '',
            enableNotifications: !!telegramId
          },
          theme: 'auto',
          language: 'en',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      await setDoc(doc(db, 'users', firebaseUser.uid), userData)
      setUserData(userData)
    } catch (error: any) {
      throw new Error(error.message)
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
    } catch (error: any) {
      throw new Error(error.message)
    }
  }

  return {
    user,
    userData,
    loading,
    signIn,
    signUp,
    logout
  }
}

export { AuthContext }