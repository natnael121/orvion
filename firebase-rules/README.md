# Firebase Security Rules

This folder contains the Firebase security rules for the multi-shop Telegram mini app.

## Files

- `firestore.rules` - Firestore database security rules

## Deployment

To deploy these rules to your Firebase project, use the Firebase CLI:

```bash
firebase deploy --only firestore:rules
```

## Security Overview

### Firestore Rules

The Firestore rules implement role-based access control with the following roles:
- **Admin**: Full access to all resources and system configuration
- **Shop Owner**: Can manage their own shops, products, categories, and orders
- **Customer**: Can view products and manage their own orders

#### Collections Protected:
- **users**: Users can read all, create/update their own profile
- **shops**: Public read, shop owners can create/update their shops
- **categories**: Public read, shop owners can manage their categories
- **departments**: Shop owners can manage their departments
- **products**: Public read, shop owners can manage their products
- **orders**: Shop owners and customers can view/manage relevant orders
- **customers**: Shop owners can manage their customers
- **shop_customers**: Junction table for shop-customer relationships
- **crm_contacts**: Shop owners can manage their CRM contacts
- **crm_tags**: Shop owners can manage their tags
- **crm_message_templates**: Shop owners can manage their message templates
- **crm_auto_tag_rules**: Shop owners can manage their auto-tag rules
- **shop_links**: Public read, shop owners can manage their links
- **promotions**: Public read, shop owners can manage their promotions
- **analytics**: Shop owners can access their analytics

#### Key Security Features:
- All write operations require authentication
- Shop data can only be modified by shop owners or admins
- Data validation ensures required fields are present
- Prevents unauthorized access to other users' data
- Prevents unauthorized modification of shop ownership

## Image Storage

This app uses ImgBB for image hosting instead of Firebase Storage. All image URLs are stored in Firestore documents.

## Testing

Before deploying to production, test your rules using the Firebase Emulator Suite:

```bash
firebase emulators:start
```

## Monitoring

Monitor rule usage and potential security issues in the Firebase Console:
- Go to Firebase Console > Firestore Database > Rules tab
- Check the "Rules Playground" to test specific scenarios

## Best Practices

1. Always test rules in the emulator before deploying
2. Monitor rule usage and denied requests
3. Keep rules as restrictive as possible
4. Use helper functions to keep rules DRY
5. Validate data structure and types
6. Never trust client-side code for security
7. Regularly audit and update rules as features change
8. Use indexes for complex queries referenced in rules

## Notes

- These rules assume user roles are stored in the `/users/{uid}` document
- Shop ownership is determined by the `ownerId` field in the `/shops/{shopId}` document
- All date fields should use Firestore Timestamp type
- Rules are evaluated on every request, so keep them efficient
