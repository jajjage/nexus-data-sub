import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { config as envConfig } from '../../../../src/config/env';
import db from '../../../../src/database/connection';
import { NotificationModel } from '../../../../src/models/Notification';
import { FirebaseService } from '../../../../src/services/firebase.service';

jest.mock('../../../../src/services/firebase.service', () => ({
  FirebaseService: {
    unsubscribeTokenFromTopic: jest.fn(() => Promise.resolve()),
  },
}));

describe('NotificationModel.updateTokenStatus', () => {
  let adminId: string;
  let token: string;

  beforeAll(async () => {
    const adminRole = await db('roles').where({ name: 'admin' }).first();
    if (!adminRole) {
      throw new Error('Role "admin" not found. Please run seeds.');
    }

    adminId = uuidv4();
    const hashedPassword = await bcrypt.hash('password123', 10);

    await db('users').insert({
      id: adminId,
      email: `test.admin.${adminId}@model.test`,
      password: hashedPassword,
      role: 'admin',
      role_id: adminRole.id,
      is_verified: true,
    });

    token = `tok-${adminId}`;
    await db('push_tokens').insert({
      id: uuidv4(),
      user_id: adminId,
      token: token,
      platform: 'web',
    });
  });

  afterAll(async () => {
    await db('users').where({ id: adminId }).del();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    envConfig.notifications.autoSubscribeTopics = ['all', 'news'];
    envConfig.notifications.subscribeRoleTopic = true;
  });

  it('should unsubscribe invalid tokens from configured topics and role topic', async () => {
    console.log(
      'Test config topics:',
      envConfig.notifications.autoSubscribeTopics
    );
    console.log(
      'Test role topic enabled:',
      envConfig.notifications.subscribeRoleTopic
    );
    // Arrange
    envConfig.notifications.autoSubscribeTopics = ['all', 'news'];
    envConfig.notifications.subscribeRoleTopic = true;

    // Act
    await NotificationModel.updateTokenStatus(token, {
      status: 'invalid',
      failure_reason: 'test',
      last_failure: new Date(),
    });

    // Assert
    const unsubscribeMock = (FirebaseService as any)
      .unsubscribeTokenFromTopic as jest.Mock;
    expect(unsubscribeMock).toHaveBeenCalledWith(token, 'all');
    expect(unsubscribeMock).toHaveBeenCalledWith(token, 'news');
    expect(unsubscribeMock).toHaveBeenCalledWith(token, 'role_admin');
  });
});
