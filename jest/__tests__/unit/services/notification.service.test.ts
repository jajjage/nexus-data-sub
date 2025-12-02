import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { config as envConfig } from '../../../../src/config/env';
import db from '../../../../src/database/connection';
import { NotificationModel } from '../../../../src/models/Notification';
import { FirebaseService } from '../../../../src/services/firebase.service';
import { NotificationService } from '../../../../src/services/notification.service';

jest.mock('../../../../src/models/Notification');

const mockRegister = jest.fn();
(NotificationModel as any).registerPushToken = mockRegister;

jest.mock('../../../../src/services/firebase.service', () => ({
  FirebaseService: {
    subscribeTokenToTopic: jest.fn(() => Promise.resolve()),
  },
}));

describe('NotificationService.registerPushToken', () => {
  let userId: string;
  let roleId: string;

  beforeAll(async () => {
    const userRole = await db('roles').where({ name: 'user' }).first();
    if (!userRole) {
      throw new Error('Role "user" not found. Please run seeds.');
    }
    roleId = userRole.id;
    userId = uuidv4();
    const hashedPassword = await bcrypt.hash('password123', 10);

    await db('users').insert({
      id: userId,
      email: 'test.user@notification.service.test',
      password: hashedPassword,
      role: 'user',
      role_id: roleId,
      is_verified: true,
    });
  });

  afterAll(async () => {
    await db('users').where({ id: userId }).del();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should register token and subscribe to configured topics and role topic', async () => {
    // Arrange
    const tokenData = { userId: userId, token: 'tok-1', platform: 'web' };

    // Ensure config has expected topics for this test
    (envConfig.notifications.autoSubscribeTopics as any) = ['all', 'news'];
    (envConfig.notifications.subscribeRoleTopic as any) = true;

    // Act
    await NotificationService.registerPushToken(tokenData as any);

    // Assert
    expect(mockRegister).toHaveBeenCalledWith(tokenData);
    const subscribeMock = (FirebaseService as any)
      .subscribeTokenToTopic as jest.Mock;
    // Should be called for 'all', 'news', and 'role_user' with token as array
    expect(subscribeMock).toHaveBeenCalledWith(['tok-1'], 'all');
    expect(subscribeMock).toHaveBeenCalledWith(['tok-1'], 'news');
    expect(subscribeMock).toHaveBeenCalledWith(['tok-1'], 'role_user');
  });
});
