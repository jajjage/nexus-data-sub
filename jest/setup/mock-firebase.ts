// jest/setup/mock-firebase.ts
jest.mock('../../src/services/firebase.service', () => ({
  FirebaseService: {
    sendMulticastPushNotification: jest.fn(),
  },
}));
