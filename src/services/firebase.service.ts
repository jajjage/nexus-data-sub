import * as admin from 'firebase-admin';
import { FirebaseMulticastResponse } from '../types/firebase.types';
import { logger } from '../utils/logger.utils';

// Firebase service account credentials are stored in a JSON file
import * as fs from 'fs';
import * as path from 'path';

const serviceAccountPath = path.join(
  __dirname,
  '../../nexus-1837e-firebase-adminsdk-fbsvc-9d77ea24dd.json'
);
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

if (Object.keys(serviceAccount).length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  logger.info('Firebase Admin SDK initialized.');
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
