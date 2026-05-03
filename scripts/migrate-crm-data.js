import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  Timestamp
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateShopData(shopId) {
  console.log(`\n=== Migrating CRM data for shop: ${shopId} ===`);

  let processedCount = 0;
  let errorCount = 0;

  try {
    const shopCustomersQuery = query(
      collection(db, 'shop_customers'),
      where('shopId', '==', shopId)
    );

    const shopCustomersSnapshot = await getDocs(shopCustomersQuery);
    console.log(`Found ${shopCustomersSnapshot.size} shop customers`);

    for (const shopCustomerDoc of shopCustomersSnapshot.docs) {
      const shopCustomerData = shopCustomerDoc.data();
      const telegramId = shopCustomerData.telegramId;
      const customerId = shopCustomerData.customerId;

      if (!telegramId) {
        console.warn(`⚠️  Shop customer ${shopCustomerDoc.id} has no telegramId, skipping`);
        errorCount++;
        continue;
      }

      try {
        const userQuery = query(
          collection(db, 'users'),
          where('telegramId', '==', telegramId)
        );
        const userSnapshot = await getDocs(userQuery);

        let userName = 'Unknown User';
        let username = undefined;
        let phone = undefined;
        let email = undefined;

        if (!userSnapshot.empty) {
          const userData = userSnapshot.docs[0].data();
          userName = userData.displayName ||
                    `${userData.firstName || ''} ${userData.lastName || ''}`.trim() ||
                    'Unknown User';
          username = userData.username;
          phone = userData.phone;
          email = userData.email;
        }

        const ordersQuery = query(
          collection(db, 'orders'),
          where('shopId', '==', shopId),
          where('customerId', '==', customerId)
        );
        const ordersSnapshot = await getDocs(ordersQuery);

        let totalOrders = 0;
        let totalSpent = 0;
        let lastOrderDate = null;

        ordersSnapshot.docs.forEach(orderDoc => {
          const order = orderDoc.data();
          totalOrders++;
          totalSpent += order.total || 0;

          const orderDate = order.createdAt?.toDate();
          if (orderDate && (!lastOrderDate || orderDate > lastOrderDate)) {
            lastOrderDate = orderDate;
          }
        });

        const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const activityStatus = lastOrderDate && lastOrderDate >= thirtyDaysAgo ? 'active' : 'inactive';

        let tags = [];
        if (totalOrders === 0) {
          tags = ['New'];
        } else if (totalOrders >= 6) {
          tags = ['VIP'];
        } else {
          tags = ['Regular'];
        }

        const contactId = `${shopId}_${telegramId}`;
        const contactRef = doc(db, 'crm_contacts', contactId);

        await setDoc(contactRef, {
          shopId,
          telegramId,
          name: userName,
          username,
          phone,
          email,
          tags,
          notes: '',
          customFields: {},
          totalOrders,
          totalSpent,
          averageOrderValue,
          lastOrderDate: lastOrderDate ? Timestamp.fromDate(lastOrderDate) : null,
          activityStatus,
          sourceLink: null,
          lastContactedDate: null,
          lastNoteUpdate: null,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });

        processedCount++;
        console.log(`✓ Processed ${userName} (${telegramId}) - ${totalOrders} orders, $${totalSpent.toFixed(2)}`);

      } catch (error) {
        console.error(`✗ Error processing customer ${telegramId}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n=== Migration Complete for ${shopId} ===`);
    console.log(`✓ Successfully processed: ${processedCount}`);
    console.log(`✗ Errors: ${errorCount}`);

  } catch (error) {
    console.error(`Error migrating shop ${shopId}:`, error);
  }
}

async function migrateAllShops() {
  console.log('=== Starting CRM Data Migration ===\n');

  try {
    const shopsSnapshot = await getDocs(collection(db, 'shops'));
    console.log(`Found ${shopsSnapshot.size} shops\n`);

    for (const shopDoc of shopsSnapshot.docs) {
      await migrateShopData(shopDoc.id);
    }

    console.log('\n=== All Shops Migration Complete ===');

  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }

  process.exit(0);
}

const args = process.argv.slice(2);
if (args.length > 0 && args[0]) {
  console.log(`Migrating specific shop: ${args[0]}`);
  migrateShopData(args[0]).then(() => process.exit(0));
} else {
  migrateAllShops();
}
