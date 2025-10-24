import db from '../../../../src/database/connection';
import { CreateUserInput, UserModel } from '../../../../src/models/User';
import { UserNotificationPreferenceService } from '../../../../src/services/userNotificationPreference.service';
import { ApiError } from '../../../../src/utils/ApiError';

describe('UserNotificationPreferenceService', () => {
  let testUser: any;

  beforeAll(async () => {
    // Create a user for testing
    const userData: CreateUserInput = {
      email: 'pref.service.user@example.com',
      fullName: 'Preference Service User',
      phoneNumber: '1234567890',
      password: 'Password123!',
      role: 'user',
    };
    const createdUser = await UserModel.create(userData);
    testUser = await UserModel.findForAuth(createdUser.email);
  });

  afterAll(async () => {
    // Clean up all test data
    if (testUser?.userId) {
      await db('user_notification_preferences')
        .where({ user_id: testUser.userId })
        .del();
      await db('users').where({ id: testUser.userId }).del();
    }
  });

  beforeEach(async () => {
    // Clean the preferences table before each test
    if (testUser?.userId) {
      await db('user_notification_preferences')
        .where({ user_id: testUser.userId })
        .del();
    }
  });

  describe('getPreferences', () => {
    it('should retrieve all notification preferences for a user', async () => {
      await UserNotificationPreferenceService.upsertPreference({
        userId: testUser.userId,
        category: 'promotional',
        subscribed: true,
      });
      await UserNotificationPreferenceService.upsertPreference({
        userId: testUser.userId,
        category: 'transactional',
        subscribed: false,
      });

      const result = await UserNotificationPreferenceService.getPreferences(
        testUser.userId
      );
      expect(result).toHaveLength(2);
    });
  });

  describe('upsertPreference', () => {
    it('should create a new preference if one does not exist', async () => {
      const preferenceData = {
        userId: testUser.userId,
        category: 'promotional' as const,
        subscribed: true,
      };
      const result =
        await UserNotificationPreferenceService.upsertPreference(
          preferenceData
        );
      expect(result).toBeDefined();
      expect(result.subscribed).toBe(true);
    });

    it('should update an existing preference', async () => {
      await UserNotificationPreferenceService.upsertPreference({
        userId: testUser.userId,
        category: 'promotional',
        subscribed: true,
      });
      const result = await UserNotificationPreferenceService.upsertPreference({
        userId: testUser.userId,
        category: 'promotional',
        subscribed: false,
      });
      expect(result).toBeDefined();
      expect(result.subscribed).toBe(false);
    });
  });

  describe('updatePreference', () => {
    it('should update a notification preference that exists', async () => {
      await UserNotificationPreferenceService.upsertPreference({
        userId: testUser.userId,
        category: 'promotional',
        subscribed: true,
      });
      const result = await UserNotificationPreferenceService.updatePreference(
        testUser.userId,
        'promotional',
        false
      );
      expect(result).toBeDefined();
      expect(result.subscribed).toBe(false);
    });

    it('should throw an ApiError if the preference to update does not exist', async () => {
      await expect(
        UserNotificationPreferenceService.updatePreference(
          testUser.userId,
          'non-existent-category',
          true
        )
      ).rejects.toThrow(new ApiError(404, 'Preference not found'));
    });
  });
});
