import db from '../../../../src/database/connection';
import { NotificationModel } from '../../../../src/models/Notification';
import { NotificationAnalyticsModel } from '../../../../src/models/NotificationAnalytics';
import { CreateUserInput, UserModel } from '../../../../src/models/User';
import { NotificationAnalyticsService } from '../../../../src/services/notificationAnalytics.service';

jest.mock('../../../../src/models/NotificationAnalytics');

describe('NotificationAnalyticsService', () => {
  let testUser: any;
  let testNotification: any;

  beforeAll(async () => {
    // Create a user for testing
    const userData: CreateUserInput = {
      email: 'analytics.service@example.com',
      fullName: 'Analytics Service User',
      phoneNumber: '1234567890',
      password: 'Password123!',
      role: 'user',
    };
    const createdUser = await UserModel.create(userData);
    testUser = await UserModel.findForAuth(createdUser.email);

    // Create a notification for testing
    testNotification = await NotificationModel.create(
      {
        title: 'Analytics Service Test Notification',
        body: 'This is a test notification for analytics service',
      },
      testUser.userId
    );
  });

  afterAll(async () => {
    // Clean up test data
    if (testUser?.userId) {
      await db('notifications').where({ created_by: testUser.userId }).del();
      await db('users').where({ id: testUser.userId }).del();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a notification analytics record', async () => {
      const analyticsData = {
        notification_id: testNotification.id,
        user_id: testUser.userId,
        status: 'sent' as const,
      };

      const mockAnalytics = {
        id: 1,
        notification_id: analyticsData.notification_id,
        user_id: analyticsData.user_id,
        status: analyticsData.status,
        created_at: new Date(),
      };

      (NotificationAnalyticsModel.create as jest.Mock).mockResolvedValue(
        mockAnalytics
      );

      const result = await NotificationAnalyticsService.create(analyticsData);

      expect(NotificationAnalyticsModel.create).toHaveBeenCalledWith(
        analyticsData
      );
      expect(result).toEqual(mockAnalytics);
      expect(result.status).toBe('sent');
      expect(result.notification_id).toBe(testNotification.id);
    });

    it('should handle different status types', async () => {
      const statuses = ['sent', 'delivered', 'opened', 'failed'] as const;

      for (const status of statuses) {
        const analyticsData = {
          notification_id: testNotification.id,
          user_id: testUser.userId,
          status,
        };

        const mockAnalytics = {
          id: Math.random(),
          notification_id: analyticsData.notification_id,
          user_id: analyticsData.user_id,
          status: analyticsData.status,
          created_at: new Date(),
        };

        (NotificationAnalyticsModel.create as jest.Mock).mockResolvedValue(
          mockAnalytics
        );

        const result = await NotificationAnalyticsService.create(analyticsData);

        expect(result.status).toBe(status);
      }
    });
  });

  describe('getByNotificationId', () => {
    it('should retrieve analytics records by notification ID', async () => {
      const mockAnalytics = [
        {
          id: 1,
          notification_id: testNotification.id,
          user_id: testUser.userId,
          status: 'sent' as const,
          created_at: new Date(),
        },
      ];

      (
        NotificationAnalyticsModel.findByNotificationId as jest.Mock
      ).mockResolvedValue(mockAnalytics);

      const result = await NotificationAnalyticsService.getByNotificationId(
        testNotification.id
      );

      expect(
        NotificationAnalyticsModel.findByNotificationId
      ).toHaveBeenCalledWith(testNotification.id);
      expect(result).toEqual(mockAnalytics);
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no analytics found', async () => {
      (
        NotificationAnalyticsModel.findByNotificationId as jest.Mock
      ).mockResolvedValue([]);

      const result =
        await NotificationAnalyticsService.getByNotificationId(
          'non-existent-id'
        );

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should return multiple analytics records for same notification', async () => {
      const mockAnalytics = [
        {
          id: 1,
          notification_id: testNotification.id,
          user_id: testUser.userId,
          status: 'sent' as const,
          created_at: new Date(),
        },
        {
          id: 2,
          notification_id: testNotification.id,
          user_id: testUser.userId,
          status: 'delivered' as const,
          created_at: new Date(),
        },
        {
          id: 3,
          notification_id: testNotification.id,
          user_id: testUser.userId,
          status: 'opened' as const,
          created_at: new Date(),
        },
      ];

      (
        NotificationAnalyticsModel.findByNotificationId as jest.Mock
      ).mockResolvedValue(mockAnalytics);

      const result = await NotificationAnalyticsService.getByNotificationId(
        testNotification.id
      );

      expect(result).toHaveLength(3);
      expect(result[0].status).toBe('sent');
      expect(result[1].status).toBe('delivered');
      expect(result[2].status).toBe('opened');
    });
  });

  describe('getByUserId', () => {
    it('should retrieve analytics records by user ID', async () => {
      const mockAnalytics = [
        {
          id: 1,
          notification_id: testNotification.id,
          user_id: testUser.userId,
          status: 'sent' as const,
          created_at: new Date(),
        },
      ];

      (NotificationAnalyticsModel.findByUserId as jest.Mock).mockResolvedValue(
        mockAnalytics
      );

      const result = await NotificationAnalyticsService.getByUserId(
        testUser.userId
      );

      expect(NotificationAnalyticsModel.findByUserId).toHaveBeenCalledWith(
        testUser.userId
      );
      expect(result).toEqual(mockAnalytics);
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no analytics found for user', async () => {
      (NotificationAnalyticsModel.findByUserId as jest.Mock).mockResolvedValue(
        []
      );

      const result = await NotificationAnalyticsService.getByUserId(
        'non-existent-user-id'
      );

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should return multiple analytics records for same user', async () => {
      const mockAnalytics = [
        {
          id: 1,
          notification_id: 'notif-1',
          user_id: testUser.userId,
          status: 'sent' as const,
          created_at: new Date(),
        },
        {
          id: 2,
          notification_id: 'notif-2',
          user_id: testUser.userId,
          status: 'delivered' as const,
          created_at: new Date(),
        },
        {
          id: 3,
          notification_id: 'notif-3',
          user_id: testUser.userId,
          status: 'opened' as const,
          created_at: new Date(),
        },
      ];

      (NotificationAnalyticsModel.findByUserId as jest.Mock).mockResolvedValue(
        mockAnalytics
      );

      const result = await NotificationAnalyticsService.getByUserId(
        testUser.userId
      );

      expect(result).toHaveLength(3);
      expect(result.every(r => r.user_id === testUser.userId)).toBe(true);
    });
  });

  describe('Service method delegation', () => {
    it('should properly delegate create calls to model', async () => {
      const analyticsData = {
        notification_id: 'test-notif-id',
        user_id: 'test-user-id',
        status: 'delivered' as const,
      };

      const mockResult = {
        id: 100,
        notification_id: analyticsData.notification_id,
        user_id: analyticsData.user_id,
        status: analyticsData.status,
        created_at: new Date(),
      };

      (NotificationAnalyticsModel.create as jest.Mock).mockResolvedValue(
        mockResult
      );

      const result = await NotificationAnalyticsService.create(analyticsData);

      expect(result.id).toBe(100);
      expect(result.notification_id).toBe('test-notif-id');
      expect(result.user_id).toBe('test-user-id');
      expect(result.status).toBe('delivered');
    });

    it('should handle errors from model operations', async () => {
      const analyticsData = {
        notification_id: 'test-notif-id',
        user_id: 'test-user-id',
        status: 'failed' as const,
      };

      const error = new Error('Database error');
      (NotificationAnalyticsModel.create as jest.Mock).mockRejectedValue(error);

      await expect(
        NotificationAnalyticsService.create(analyticsData)
      ).rejects.toThrow('Database error');
    });
  });
});
