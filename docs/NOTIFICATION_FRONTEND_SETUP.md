# Frontend Notification Setup Guide

## Overview

The backend is now sending notifications with `notificationId` in the FCM message data payload. The frontend needs to handle the notification click event to navigate to the correct notification details page instead of the home page.

## Configuration

### 1. Service Worker Setup (for Web Push)

Create or update your `public/firebase-messaging-sw.js` service worker:

```javascript
// public/firebase-messaging-sw.js
importScripts(
  'https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js'
);
importScripts(
  'https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js'
);

firebase.initializeApp({
  projectId: 'nexus-1837e',
  appId: 'YOUR_APP_ID',
  apiKey: 'YOUR_API_KEY',
  messagingSenderId: 'YOUR_SENDER_ID',
});

const messaging = firebase.messaging();

// Handle notification click
messaging.onBackgroundMessage(payload => {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/firebase-logo.png',
    data: {
      notificationId: payload.data.notificationId,
      title: payload.data.title,
      body: payload.data.body,
    },
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const notificationId = event.notification.data.notificationId;

  // Navigate to notification details page instead of home
  const urlToOpen = notificationId
    ? `/notifications/${notificationId}`
    : '/notifications';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Check if notification page is already open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
```

### 2. Frontend Notification Request (React/Vue Example)

```typescript
// Example: Register push token when user logs in or allows notifications
async function registerPushToken() {
  const messaging = getMessaging(app);

  try {
    const token = await getToken(messaging, {
      vapidKey: 'YOUR_VAPID_KEY',
    });

    // Send token to backend
    const response = await fetch('/api/v1/notifications/tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        token,
        platform: 'web', // or 'android'/'ios' for mobile apps
      }),
    });

    if (response.ok) {
      console.log('✅ Push token registered successfully');
    }
  } catch (error) {
    console.error('❌ Failed to register push token:', error);
  }
}

// Listen for foreground notifications
onMessage(messaging, payload => {
  const { notificationId, title, body } = payload.data;

  // Show in-app notification
  showNotification({
    title,
    body,
    onClick: () => {
      // Navigate to notification details
      if (notificationId) {
        navigate(`/notifications/${notificationId}`);
      } else {
        navigate('/notifications');
      }
    },
  });
});
```

### 3. Notification Preferences Page

Users can manage notification subscriptions:

```typescript
// Example: Toggle notification category subscription
async function toggleCategorySubscription(
  category: string,
  subscribed: boolean
) {
  const response = await fetch(`/api/v1/notification-preferences/${category}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ subscribed }),
  });

  return response.json();
}

// Example: Mute all notifications
async function muteAllNotifications() {
  const response = await fetch('/api/v1/notification-preferences/mute-all', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.json();
}
```

## Backend Auto-Subscribe Topics

When a user registers a push token, they are automatically subscribed to these topics (from `.env`):

```
NOTIFICATIONS_AUTO_SUBSCRIBE_TOPICS=all,news,updates,alerts,offer
```

Users will receive notifications for these categories unless they explicitly unsubscribe.

## Notification Flow

1. **User registers push token** → Backend subscribes to auto-subscribe topics
2. **Admin creates notification** → Published to Firebase topic (e.g., 'news', 'updates')
3. **Firebase delivers to all subscribed tokens** → Includes `notificationId` in data payload
4. **User clicks notification** → Service worker opens `/notifications/{notificationId}`
5. **Frontend displays notification details** → User can read full content

## Browser Support for Web Push

| Browser | Support                |
| ------- | ---------------------- |
| Chrome  | ✅ Full support        |
| Firefox | ✅ Full support        |
| Safari  | ⚠️ Limited (iOS 16.4+) |
| Edge    | ✅ Full support        |

**Note:** Safari on macOS supports web push via its notification system, but requires special setup. iOS Safari has very limited support.

## Testing Notifications

```bash
# Register a push token (from browser console)
fetch('/api/v1/notifications/tokens', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    token: '<FCM_TOKEN>',
    platform: 'web',
  }),
});

# Create a test notification via API
POST /api/v1/admin/notifications
{
  "title": "Test Notification",
  "body": "This is a test message",
  "type": "info",
  "category": "all"
}

# Toggle a category subscription
PUT /api/v1/notification-preferences/news
{
  "subscribed": true
}
```

## Troubleshooting

### Notification not appearing

- Check browser notification permissions
- Verify service worker is installed: `DevTools > Application > Service Workers`
- Check FCM token is registered in backend
- Verify user is subscribed to the notification category

### Notification click doesn't navigate

- Ensure service worker is properly handling `notificationclick` event
- Check that `notificationId` is present in `event.notification.data`
- Verify frontend route exists: `/notifications/{notificationId}`

### Only Chrome shows notifications

- This is expected behavior on web - different browsers have different notification support
- For mobile apps (iOS/Android), use native push notification implementations

## Environment Variables (Backend)

```bash
# Firebase configuration
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'

# Auto-subscribe topics when user registers token
NOTIFICATIONS_AUTO_SUBSCRIBE_TOPICS=all,news,updates,alerts,offer

# Whether to subscribe based on role (admin feature)
NOTIFICATIONS_SUBSCRIBE_ROLE_TOPIC=false
```

## API Endpoints

### User Endpoints

- `POST /api/v1/notifications/tokens` - Register push token
- `POST /api/v1/notifications/tokens/unlink` - Unregister token
- `GET /api/v1/notifications` - Get user's notifications
- `PUT /api/v1/notifications/{id}/read` - Mark as read
- `DELETE /api/v1/notifications/{id}` - Delete notification
- `GET /api/v1/notification-preferences` - Get preferences
- `PUT /api/v1/notification-preferences/{category}` - Toggle category
- `POST /api/v1/notification-preferences/mute-all` - Mute all
- `POST /api/v1/notification-preferences/unmute-all` - Unmute all

### Admin Endpoints

- `POST /api/v1/admin/notifications` - Create notification
- `GET /api/v1/admin/notifications` - List all notifications
- `PATCH /api/v1/admin/notifications/{id}` - Edit notification
- `DELETE /api/v1/admin/notifications/{id}` - Archive notification
- `GET /api/v1/admin/notifications/{id}/analytics` - View analytics
