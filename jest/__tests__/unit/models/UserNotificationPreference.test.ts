import db from '../../../../src/database/connection';
import { CreateUserInput, UserModel } from '../../../../src/models/User';
import { UserNotificationPreferenceModel } from '../../../../src/models/UserNotificationPreference';

describe('UserNotificationPreferenceModel', () => {
  let testUser: any;

  beforeAll(async () => {
    // Create a user for testing
    const userData: CreateUserInput = {
      email: 'preference.user@example.com',
      fullName: 'Preference User',
      phoneNumber: '1234567890',
      password: 'Password123!',
      role: 'user',
    };
    const createdUser = await UserModel.create(userData);
    testUser = await UserModel.findForAuth(createdUser.email);
  });

  afterAll(async () => {
    // Clean up test data
    if (testUser?.userId) {
      await db('user_notification_preferences')
        .where({ user_id: testUser.userId })
        .del();
      await db('users').where({ id: testUser.userId }).del();
    }
  });

  afterEach(async () => {
    await db('user_notification_preferences').del();
  });

  describe('create', () => {
    it('should create a new user notification preference', async () => {
      const preferenceData = {
        userId: testUser.userId,
        category: 'promotional' as const,
        subscribed: true,
      };
      const preference =
        await UserNotificationPreferenceModel.create(preferenceData);
      expect(preference).toBeDefined();
      expect(preference.subscribed).toBe(true);
    });
  });

  describe('findByUserId', () => {
    it('should find all notification preferences for a user', async () => {
      await UserNotificationPreferenceModel.create({
        userId: testUser.userId,
        category: 'promotional',
        subscribed: true,
      });
      await UserNotificationPreferenceModel.create({
        userId: testUser.userId,
        category: 'transactional',
        subscribed: false,
      });
      const preferences = await UserNotificationPreferenceModel.findByUserId(
        testUser.userId
      );
      expect(preferences).toHaveLength(2);
    });
  });

  describe('findByUserIdAndCategory', () => {
    it('should find a notification preference by user ID and category', async () => {
      await UserNotificationPreferenceModel.create({
        userId: testUser.userId,
        category: 'promotional',
        subscribed: true,
      });
      const preference =
        await UserNotificationPreferenceModel.findByUserIdAndCategory(
          testUser.userId,
          'promotional'
        );
      expect(preference).toBeDefined();
      expect(preference?.subscribed).toBe(true);
    });
  });

  describe('upsert', () => {
    it('should insert a new preference if it does not exist', async () => {
      const preference = await UserNotificationPreferenceModel.upsert({
        userId: testUser.userId,
        category: 'promotional',
        subscribed: true,
      });
      expect(preference).toBeDefined();
      expect(preference.subscribed).toBe(true);
    });

    it('should update an existing preference', async () => {
      await UserNotificationPreferenceModel.create({
        userId: testUser.userId,
        category: 'promotional',
        subscribed: true,
      });
      const updatedPreference = await UserNotificationPreferenceModel.upsert({
        userId: testUser.userId,
        category: 'promotional',
        subscribed: false,
      });
      expect(updatedPreference).toBeDefined();
      expect(updatedPreference.subscribed).toBe(false);
    });
  });

  describe('update', () => {
    it('should update a notification preference', async () => {
      await UserNotificationPreferenceModel.create({
        userId: testUser.userId,
        category: 'promotional',
        subscribed: true,
      });
      const preference = await UserNotificationPreferenceModel.update(
        testUser.userId,
        'promotional',
        false
      );
      expect(preference).toBeDefined();
      expect(preference?.subscribed).toBe(false);
    });
  });
});
