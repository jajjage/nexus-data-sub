import { config as envConfig } from '../../../../src/config/env';
import { NotificationModel } from '../../../../src/models/Notification';
import { FirebaseService } from '../../../../src/services/firebase.service';
import { NotificationService } from '../../../../src/services/notification.service';

jest.mock('../../../../src/models/Notification');

const mockRegister = jest.fn();
(NotificationModel as any).registerPushToken = mockRegister;

jest.mock('../../../../src/services/firebase.service', () => ({
  FirebaseService: {
    subscribeTokenToTopic: jest.fn(),
  },
}));

// Mock db to return a user with role
jest.mock('../../../../src/database/connection', () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return jest.fn().mockImplementation((table: string) => {
    return {
      where: () => ({
        first: async () => ({ id: 'user-1', role: 'user' }),
      }),
    };
  });
});

describe('NotificationService.registerPushToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should register token and subscribe to configured topics and role topic', async () => {
    // Arrange
    const tokenData = { userId: 'user-1', token: 'tok-1', platform: 'web' };

    // Ensure config has expected topics for this test
    (envConfig.notifications.autoSubscribeTopics as any) = ['all', 'news'];
    (envConfig.notifications.subscribeRoleTopic as any) = true;

    // Act
    await NotificationService.registerPushToken(tokenData as any);

    // Assert
    expect(mockRegister).toHaveBeenCalledWith(tokenData);
    const subscribeMock = (FirebaseService as any)
      .subscribeTokenToTopic as jest.Mock;
    // Should be called for 'all', 'news', and 'role_user'
    expect(subscribeMock).toHaveBeenCalledWith('tok-1', 'all');
    expect(subscribeMock).toHaveBeenCalledWith('tok-1', 'news');
    expect(subscribeMock).toHaveBeenCalledWith('tok-1', 'role_user');
  });
});
