// jest/setup/mock-firebase.ts
jest.mock('../../src/services/firebase.service', () => ({
  FirebaseService: {
    sendMulticastPushNotification: jest.fn().mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      responses: [],
    }),
    subscribeTokenToTopic: jest.fn().mockResolvedValue(undefined),
    unsubscribeTokenFromTopic: jest.fn().mockResolvedValue(undefined),
  },
}));
