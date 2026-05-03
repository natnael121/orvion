import React, { useState } from 'react'
import { collection, doc, setDoc, serverTimestamp, query, where, getDocs, updateDoc } from 'firebase/firestore'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { useFirebase } from '../contexts/FirebaseContext'
import { User, UserData } from '../types'
import { Store, User as UserIcon, Mail, Save, Loader2, Lock, Eye, EyeOff } from 'lucide-react'

interface UserRegistrationProps {
  user: User
  onComplete: (userData: UserData) => void
  onCancel?: () => void
  existingUserData?: UserData
}

const UserRegistration: React.FC<UserRegistrationProps> = ({ user, onComplete, onCancel, existingUserData }) => {
  const { db, auth } = useFirebase()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const [formData, setFormData] = useState({
    displayName: `${user.firstName} ${user.lastName}`.trim(),
    email: '',
    password: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (existingUserData) {
        // Update existing customer document to admin
        const usersRef = collection(db, 'users')
        const userQuery = query(usersRef, where('telegramId', '==', parseInt(user.id)))
        const userSnapshot = await getDocs(userQuery)

        if (!userSnapshot.empty) {
          const existingDocId = userSnapshot.docs[0].id

          // Create Firebase Auth user
          const cred = await createUserWithEmailAndPassword(auth, formData.email, formData.password)
          await updateProfile(cred.user, { displayName: formData.displayName })

          // Update the existing document with uid, role, email, and displayName
          const userDocRef = doc(db, 'users', existingDocId)
          await updateDoc(userDocRef, {
            uid: cred.user.uid,
            email: formData.email,
            displayName: formData.displayName,
            role: 'admin',
            updatedAt: new Date()
          })

          const updatedUserData: UserData = {
            ...existingUserData,
            uid: cred.user.uid,
            email: formData.email,
            displayName: formData.displayName,
            role: 'admin'
          }

          onComplete(updatedUserData)
        } else {
          throw new Error('Existing user document not found')
        }
      } else {
        // Create new user with Firebase Authentication
        const cred = await createUserWithEmailAndPassword(auth, formData.email, formData.password)

        // Update display name in Firebase Auth profile
        await updateProfile(cred.user, { displayName: formData.displayName })

        // Create Firestore user profile with admin role
        const userData: UserData = {
          uid: cred.user.uid,
          email: formData.email,
          displayName: formData.displayName,
          telegramId: user.telegramId || parseInt(user.id),
          role: 'admin',
          profileCompleted: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }

        await setDoc(doc(db, 'users', cred.user.uid), userData)

        // Return completed user data
        onComplete(userData)
      }
    } catch (error: any) {
      console.error('Error creating user:', error)
      setError(error.message || 'Failed to create account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-telegram-button/10 via-telegram-bg to-telegram-secondary-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="h-16 w-16 bg-telegram-button rounded-2xl flex items-center justify-center">
              <Store className="h-8 w-8 text-telegram-button-text" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-telegram-text">
            Welcome to Multi-Shop!
          </h2>
          <p className="mt-2 text-sm text-telegram-hint">
            Complete your profile to get started
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Full Name */}
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-telegram-text mb-2">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="h-5 w-5 text-telegram-hint absolute left-3 top-3" />
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  required
                  value={formData.displayName}
                  onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                  className="block w-full pl-10 pr-3 py-3 border border-telegram-hint/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram-button focus:border-transparent bg-telegram-secondary-bg text-telegram-text"
                  placeholder="Enter your full name"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-telegram-text mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="h-5 w-5 text-telegram-hint absolute left-3 top-3" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="block w-full pl-10 pr-3 py-3 border border-telegram-hint/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram-button bg-telegram-secondary-bg text-telegram-text"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-telegram-text mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="h-5 w-5 text-telegram-hint absolute left-3 top-3" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="block w-full pl-10 pr-10 py-3 border border-telegram-hint/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-telegram-button bg-telegram-secondary-bg text-telegram-text"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? <EyeOff className="h-5 w-5 text-telegram-hint" /> : <Eye className="h-5 w-5 text-telegram-hint" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-telegram-button-text bg-telegram-button hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-telegram-button disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Creating Account...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Complete Registration
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default UserRegistration