import * as admin from 'firebase-admin';

// Note: You'll need to set up a Firebase project and get your service account credentials.
// Store them securely, for example, in environment variables.
const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}'
);

if (Object.keys(serviceAccount).length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log('Firebase Admin SDK initialized.');
}

export class FirebaseService {
  /**
   * Sends a push notification to a single device.
   * @param token - The device's FCM token.
   * @param title - The title of the notification.
   * @param body - The body of the notification.
   */
  static async sendPushNotification(
    token: string,
    title: string,
    body: string
  ) {
    if (!admin.apps.length) {
      console.warn(
        'Firebase Admin SDK not initialized. Skipping notification.'
      );
      return;
    }

    const message = {
      notification: {
        title,
        body,
      },
      token,
    };

    try {
      await admin.messaging().send(message);
    } catch (error) {
      console.error('Error sending push notification:', error);
      // You might want to handle token cleanup if it's invalid
    }
  }

  /**
   * Sends a push notification to multiple devices.
   * @param tokens - A list of FCM tokens.
   * @param title - The title of the notification.
   * @param body - The body of the notification.
   */
  static async sendMulticastPushNotification(
    tokens: string[],
    title: string,
    body: string
  ) {
    if (!admin.apps.length) {
      console.warn(
        'Firebase Admin SDK not initialized. Skipping notification.'
      );
      return;
    }

    if (!tokens.length) {
      return;
    }

    const message = {
      notification: {
        title,
        body,
      },
      tokens,
    };

    try {
      await admin.messaging().sendEachForMulticast(message);
    } catch (error) {
      console.error('Error sending multicast push notification:', error);
    }
  }
}
