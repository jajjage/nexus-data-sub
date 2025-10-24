import * as admin from 'firebase-admin';
import { FirebaseMulticastResponse } from '../types/firebase.types';
import { logger } from '../utils/logger.utils';

let serviceAccount: any;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (error) {
    console.error('Invalid FIREBASE_SERVICE_ACCOUNT JSON:', error);
  }
} else {
  throw new Error('Missing FIREBASE_SERVICE_ACCOUNT environment variable');
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  logger.info('Firebase Admin SDK initialized.');
}

// import * as fs from 'fs';
// import * as path from 'path';

// const serviceAccountPath = path.join(__dirname, '../../serviceAccountKey.json');

// let serviceAccount = {};

// if (fs.existsSync(serviceAccountPath)) {
//   const content = fs.readFileSync(serviceAccountPath, 'utf8');
//   if (content.trim().length > 0) {
//     try {
//       serviceAccount = JSON.parse(content);
//       admin.initializeApp({
//         credential: admin.credential.cert(
//           serviceAccount as admin.ServiceAccount
//         ),
//       });
//     } catch (err) {
//       console.error('Invalid JSON in serviceAccountKey.json:', err);
//     }
//   } else {
//     console.warn('⚠️ serviceAccountKey.json is empty');
//   }
// } else {
//   console.warn('⚠️ serviceAccountKey.json not found');
// }

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
  ): Promise<FirebaseMulticastResponse> {
    if (!admin.apps.length) {
      console.warn(
        'Firebase Admin SDK not initialized. Skipping notification.'
      );
      return {
        responses: [],
        successCount: 0,
        failureCount: 0,
      };
    }

    if (!tokens.length) {
      return {
        responses: [],
        successCount: 0,
        failureCount: 0,
      };
    }

    const message = {
      notification: {
        title,
        body,
      },
      tokens,
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);

      return {
        responses: response.responses.map(r => ({
          success: r.success,
          error: r.error
            ? {
                code: r.error.code,
                message: r.error.message,
              }
            : undefined,
        })),
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error) {
      console.error('Error sending multicast push notification:', error);
      throw error;
    }
  }
}
