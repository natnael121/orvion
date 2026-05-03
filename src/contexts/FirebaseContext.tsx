import React, { createContext, useContext } from 'react'
import { Firestore } from 'firebase/firestore'
import { Auth } from 'firebase/auth'

interface FirebaseContextType {
  db: Firestore
  auth: Auth
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined)

export const useFirebase = () => {
  const context = useContext(FirebaseContext)
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider')
  }
  return context
}

interface FirebaseProviderProps {
  children: React.ReactNode
  db: Firestore
  auth: Auth
}

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({ children, db, auth }) => {
  const value = {
    db,
    auth
  }

  return (
    <FirebaseContext.Provider value={value}>
      {children}
    </FirebaseContext.Provider>
  )
}