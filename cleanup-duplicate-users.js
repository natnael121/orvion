/**
 * Cleanup Script for Duplicate User Documents
 *
 * This script helps clean up duplicate user documents in Firebase.
 * Run this manually to merge duplicate users with the same telegramId.
 *
 * Usage: node cleanup-duplicate-users.js
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore'
import * as dotenv from 'dotenv'

dotenv.config()

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function cleanupDuplicateUsers() {
  try {
    console.log('Starting duplicate user cleanup...')

    const usersRef = collection(db, 'users')
    const allUsersSnapshot = await getDocs(usersRef)

    const usersByTelegramId = {}

    // Group users by telegramId
    allUsersSnapshot.forEach(doc => {
      const data = doc.data()
      const telegramId = data.telegramId || data.telegram_id

      if (telegramId) {
        if (!usersByTelegramId[telegramId]) {
          usersByTelegramId[telegramId] = []
        }
        usersByTelegramId[telegramId].push({
          id: doc.id,
          data: data,
          hasUid: !!data.uid,
          hasEmail: !!data.email,
          role: data.role,
          createdAt: data.createdAt
        })
      }
    })

    // Find and handle duplicates
    let duplicatesFound = 0
    let duplicatesDeleted = 0

    for (const [telegramId, users] of Object.entries(usersByTelegramId)) {
      if (users.length > 1) {
        duplicatesFound++
        console.log(`\nFound ${users.length} documents for telegramId ${telegramId}:`)

        users.forEach(user => {
          console.log(`  - Doc ID: ${user.id}`)
          console.log(`    Role: ${user.role || 'none'}`)
          console.log(`    Has UID: ${user.hasUid}`)
          console.log(`    Has Email: ${user.hasEmail}`)
        })

        // Keep the one with uid and email (admin), delete the others
        const adminUser = users.find(u => u.hasUid && u.hasEmail)
        const customersToDelete = users.filter(u => u.id !== adminUser?.id)

        if (adminUser && customersToDelete.length > 0) {
          console.log(`  -> Keeping admin document: ${adminUser.id}`)
          console.log(`  -> Deleting ${customersToDelete.length} duplicate(s)...`)

          for (const customer of customersToDelete) {
            await deleteDoc(doc(db, 'users', customer.id))
            console.log(`     ✓ Deleted ${customer.id}`)
            duplicatesDeleted++
          }
        }
      }
    }

    console.log('\n=== Cleanup Summary ===')
    console.log(`Total users with duplicates: ${duplicatesFound}`)
    console.log(`Duplicate documents deleted: ${duplicatesDeleted}`)
    console.log('Cleanup completed successfully!')

  } catch (error) {
    console.error('Error during cleanup:', error)
  }
}

cleanupDuplicateUsers()
