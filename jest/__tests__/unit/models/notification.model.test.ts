import { config as envConfig } from '../../../../src/config/env';
import { NotificationModel } from '../../../../src/models/Notification';
import { FirebaseService } from '../../../../src/services/firebase.service';

jest.mock('../../../../src/services/firebase.service', () => ({
  FirebaseService: {
    unsubscribeTokenFromTopic: jest.fn(),
  },
}));

// Mock db implementation to handle push_tokens and users queries
jest.mock('../../../../src/database/connection', () => {
  return jest.fn().mockImplementation((table: string) => {
    if (table === 'push_tokens') {
      return {
        where: () => ({
          update: async () => {},
          first: async () => ({
            id: 'pt-1',
            token: 'tok-1',
            user_id: 'user-1',
          }),
        }),
      };
    }
    if (table === 'users') {
      return {
        where: () => ({
          first: async () => ({ id: 'user-1', role: 'admin' }),
        }),
      };
    }
    return { where: () => ({ first: async () => null }) };
  });
});

describe('NotificationModel.updateTokenStatus', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should unsubscribe invalid tokens from configured topics and role topic', async () => {
    (envConfig.notifications.autoSubscribeTopics as any) = ['all', 'news'];
    (envConfig.notifications.subscribeRoleTopic as any) = true;

    await NotificationModel.updateTokenStatus('tok-1', {
      status: 'invalid',
      failure_reason: 'test',
      last_failure: new Date(),
    });

    const unsubscribeMock = (FirebaseService as any)
      .unsubscribeTokenFromTopic as jest.Mock;
    expect(unsubscribeMock).toHaveBeenCalledWith('tok-1', 'all');
    expect(unsubscribeMock).toHaveBeenCalledWith('tok-1', 'news');
    expect(unsubscribeMock).toHaveBeenCalledWith('tok-1', 'role_admin');
  });
});
