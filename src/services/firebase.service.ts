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
   * Sends a push notification to a single device or multiple devices.
   * @param token - A single FCM token or array of FCM tokens.
   * @param title - The title of the notification.
   * @param body - The body of the notification.
   */
  static async sendPushNotification(
    token: string | string[],
    title: string,
    body: string
  ): Promise<any> {
    if (!admin.apps.length) {
      console.warn(
        'Firebase Admin SDK not initialized. Skipping notification.'
      );
      return;
    }

    // Handle array of tokens
    if (Array.isArray(token)) {
      if (token.length === 0) {
        console.warn('Empty token array provided');
        return {
          responses: [],
          successCount: 0,
          failureCount: 0,
        };
      }

      // Use multicast for arrays
      return await this.sendMulticastPushNotification(token, title, body);
    }

    // Handle single token
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

  /**
   * Sends a message to all devices subscribed to a topic.
   * @param topic - The topic name (no /topics/ prefix)
   * @param title - The title of the notification
   * @param body - The body of the notification
   * @returns Message ID if successful, null if failed
   */
  static async sendTopicMessage(
    topic: string,
    title: string,
    body: string
  ): Promise<string | null> {
    if (!admin.apps.length) {
      console.warn(
        'Firebase Admin SDK not initialized. Skipping topic notification.'
      );
      return null;
    }

    const message = {
      notification: {
        title,
        body,
      },
      topic,
    };

    try {
      const messageId = await admin.messaging().send(message);
      logger.info(
        `Successfully sent message to topic '${topic}'. Message ID: ${messageId}`
      );
      return messageId;
    } catch (error) {
      logger.error(`Error sending message to topic '${topic}':`, error);
      throw error;
    }
  }

  /**
   * Subscribes one or more tokens to a topic.
   * @param token - A single FCM token or array of FCM tokens
   * @param topic - topic name (no /topics/ prefix)
   */
  static async subscribeTokenToTopic(token: string | string[], topic: string) {
    if (!admin.apps.length) {
      console.warn(
        'Firebase Admin SDK not initialized. Skipping topic subscription.'
      );
      return;
    }

    // Normalize to array
    const tokens = Array.isArray(token) ? token : [token];

    if (tokens.length === 0) {
      console.warn('Empty token array provided for topic subscription');
      return;
    }

    try {
      await admin.messaging().subscribeToTopic(tokens, topic);
      logger.info(`Subscribed ${tokens.length} token(s) to topic: ${topic}`);
    } catch (error) {
      console.error(`Failed to subscribe token(s) to topic ${topic}:`, error);
    }
  }

  /**
   * Unsubscribes one or more tokens from a topic.
   * @param token - A single FCM token or array of FCM tokens
   * @param topic - topic name
   */
  static async unsubscribeTokenFromTopic(
    token: string | string[],
    topic: string
  ) {
    if (!admin.apps.length) {
      console.warn(
        'Firebase Admin SDK not initialized. Skipping topic unsubscription.'
      );
      return;
    }

    // Normalize to array
    const tokens = Array.isArray(token) ? token : [token];

    if (tokens.length === 0) {
      console.warn('Empty token array provided for topic unsubscription');
      return;
    }

    try {
      await admin.messaging().unsubscribeFromTopic(tokens, topic);
      logger.info(
        `Unsubscribed ${tokens.length} token(s) from topic: ${topic}`
      );
    } catch (error) {
      console.error(
        `Failed to unsubscribe token(s) from topic ${topic}:`,
        error
      );
    }
  }
}
