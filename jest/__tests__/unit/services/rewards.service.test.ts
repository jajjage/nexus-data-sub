/**
 * Unit Tests for RewardsService
 * Tests core reward business logic
 */

import db from '../../../../src/database/connection';
import { RewardsService } from '../../../../src/services/rewards.service';
import {
  awardTestBadge,
  cleanupTestData,
  createTestBadge,
  createTestReward,
  createTestUser,
  getUserBadgesFromDB,
  getUserRewardsSummary,
} from '../../fixtures/rewards.fixtures';

describe('RewardsService', () => {
  let testUserIds: string[] = [];

  afterEach(async () => {
    // Cleanup test data after each test
    await cleanupTestData(testUserIds);
    testUserIds = [];
  });

  describe('awardPoints', () => {
    it('should create a reward with pending status', async () => {
      const user = await createTestUser();
      testUserIds.push(user.id);

      const reward = await RewardsService.awardPoints(
        user.id,
        100,
        'test_reward'
      );

      expect(reward).toBeDefined();
      expect(reward.userId).toBe(user.id);
      expect(reward.points).toBe(100);
      expect(reward.reason).toBe('test_reward');
      expect(reward.status).toBe('pending');
    });

    it('should include metadata in reward if provided', async () => {
      const user = await createTestUser();
      testUserIds.push(user.id);

      const metadata = { transactionId: 'tx123', source: 'purchase' };
      const reward = await RewardsService.awardPoints(
        user.id,
        500,
        'purchase_reward',
        undefined,
        metadata
      );

      expect(reward.metadata).toEqual(metadata);
    });

    it('should set expiration date if provided', async () => {
      const user = await createTestUser();
      testUserIds.push(user.id);

      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      const reward = await RewardsService.awardPoints(
        user.id,
        100,
        'limited_reward',
        expiresAt
      );

      expect(reward.expiresAt).toBeDefined();
      expect(reward.expiresAt?.getTime()).toBeLessThanOrEqual(
        expiresAt.getTime()
      );
    });
  });

  describe('creditPendingPoints', () => {
    it('should credit all pending points for a user', async () => {
      const user = await createTestUser();
      testUserIds.push(user.id);

      // Create multiple pending rewards
      await createTestReward(user.id, { points: 100, status: 'pending' });
      await createTestReward(user.id, { points: 50, status: 'pending' });

      const creditedAmount = await RewardsService.creditPendingPoints(user.id);

      expect(creditedAmount).toBe(150);

      // Verify all rewards are now credited
      const summary = await getUserRewardsSummary(user.id);
      expect(summary.credited).toBe(150);
      expect(summary.pending).toBe(0);
    });

    it('should update user total_points when crediting', async () => {
      const user = await createTestUser();
      testUserIds.push(user.id);

      // Initialize total_points
      await db('users').where({ id: user.id }).update({ total_points: 0 });

      // Create and credit rewards
      await createTestReward(user.id, { points: 200, status: 'pending' });
      await RewardsService.creditPendingPoints(user.id);

      // Check user's total_points
      const updatedUser = await db('users')
        .where({ id: user.id })
        .select('total_points')
        .first();

      expect(updatedUser.total_points).toBe(200);
    });

    it('should not credit non-pending rewards', async () => {
      const user = await createTestUser();
      testUserIds.push(user.id);

      // Create a credited reward
      await createTestReward(user.id, { points: 100, status: 'credited' });

      const creditedAmount = await RewardsService.creditPendingPoints(user.id);

      expect(creditedAmount).toBe(0);
    });
  });

  describe('revokePendingPoints', () => {
    it('should revoke all pending points for a user', async () => {
      const user = await createTestUser();
      testUserIds.push(user.id);

      // Create pending rewards
      await createTestReward(user.id, { points: 100, status: 'pending' });
      await createTestReward(user.id, { points: 50, status: 'pending' });

      const revokedCount = await RewardsService.revokePendingPoints(user.id);

      expect(revokedCount).toBeGreaterThan(0);

      // Verify all are revoked
      const summary = await getUserRewardsSummary(user.id);
      expect(summary.pending).toBe(0);
      expect(summary.revoked).toBe(150);
    });
  });

  describe('getRewardsSummary', () => {
    it('should return correct reward summary', async () => {
      const user = await createTestUser();
      testUserIds.push(user.id);

      // Create rewards with different statuses
      await createTestReward(user.id, { points: 100, status: 'pending' });
      await createTestReward(user.id, { points: 200, status: 'credited' });
      await createTestReward(user.id, { points: 50, status: 'expired' });

      const summary = await RewardsService.getRewardsSummary(user.id);

      expect(summary.userId).toBe(user.id);
      expect(summary.pendingPoints).toBe(100);
      expect(summary.creditedPoints).toBe(200);
      expect(summary.expiredPoints).toBe(50);
      expect(summary.totalPoints).toBe(350);
    });
  });

  describe('awardBadge', () => {
    it('should award a badge to a user', async () => {
      const user = await createTestUser();
      testUserIds.push(user.id);

      const badge = await createTestBadge({ name: 'test_badge' });

      const result = await RewardsService.awardBadge(user.id, badge.id);

      expect(result).toBeDefined();

      // Verify badge was awarded
      const userBadges = await getUserBadgesFromDB(user.id);
      expect(userBadges.length).toBe(1);
      expect(userBadges[0].id).toBe(badge.id);
    });

    it('should not award duplicate badges', async () => {
      const user = await createTestUser();
      testUserIds.push(user.id);

      const badge = await createTestBadge({ name: 'unique_badge' });

      // Award badge twice
      await RewardsService.awardBadge(user.id, badge.id);
      const secondAward = await RewardsService.awardBadge(user.id, badge.id);

      // Should not fail, but should return existing
      expect(secondAward).toBeDefined();

      // Verify only one badge
      const userBadges = await getUserBadgesFromDB(user.id);
      expect(userBadges.length).toBe(1);
    });
  });

  describe('getUserBadges', () => {
    it('should return all badges earned by a user', async () => {
      const user = await createTestUser();
      testUserIds.push(user.id);

      const badge1 = await createTestBadge({ name: 'badge1' });
      const badge2 = await createTestBadge({ name: 'badge2' });

      await awardTestBadge(user.id, badge1.id);
      await awardTestBadge(user.id, badge2.id);

      const badges = await RewardsService.getUserBadges(user.id);

      expect(badges.length).toBe(2);
      expect(badges.map((b: any) => b.badgeId)).toContain(badge1.id);
      expect(badges.map((b: any) => b.badgeId)).toContain(badge2.id);
    });

    it('should return empty array if user has no badges', async () => {
      const user = await createTestUser();
      testUserIds.push(user.id);

      const badges = await RewardsService.getUserBadges(user.id);

      expect(badges).toEqual([]);
    });
  });

  describe('userHasBadge', () => {
    it('should return true if user has badge', async () => {
      const user = await createTestUser();
      testUserIds.push(user.id);

      const badge = await createTestBadge({ name: 'exclusive_badge' });

      await awardTestBadge(user.id, badge.id);

      const hasBadge = await RewardsService.userHasBadge(user.id, badge.id);

      expect(hasBadge).toBe(true);
    });

    it('should return false if user does not have badge', async () => {
      const user = await createTestUser();
      testUserIds.push(user.id);

      const badge = await createTestBadge({ name: 'other_badge' });

      const hasBadge = await RewardsService.userHasBadge(user.id, badge.id);

      expect(hasBadge).toBe(false);
    });
  });

  describe('revokeBadge', () => {
    it('should remove a badge from a user', async () => {
      const user = await createTestUser();
      testUserIds.push(user.id);

      const badge = await createTestBadge({ name: 'revokeable_badge' });

      await awardTestBadge(user.id, badge.id);
      await RewardsService.revokeBadge(user.id, badge.id);

      const userBadges = await getUserBadgesFromDB(user.id);

      expect(userBadges.length).toBe(0);
    });
  });

  describe('expireOldRewards', () => {
    it('should mark expired rewards with past expiration date', async () => {
      const user = await createTestUser();
      testUserIds.push(user.id);

      // Create reward that expired
      const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24); // 1 day ago
      await db('rewards').insert({
        user_id: user.id,
        points: 100,
        reason: 'expired_reward',
        status: 'pending',
        expires_at: pastDate,
        earned_at: db.fn.now(),
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      });

      const expiredCount = await RewardsService.expireOldRewards();

      expect(expiredCount).toBeGreaterThanOrEqual(1);

      // Verify reward is marked as expired
      const summary = await getUserRewardsSummary(user.id);
      expect(summary.expired).toBe(100);
      expect(summary.pending).toBe(0);
    });
  });

  describe('getTopPointHolders', () => {
    it('should return users with highest total_points', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const user3 = await createTestUser();
      testUserIds.push(user1.id, user2.id, user3.id);

      // Set different point values
      await db('users').where({ id: user1.id }).update({ total_points: 5000 });
      await db('users').where({ id: user2.id }).update({ total_points: 3000 });
      await db('users').where({ id: user3.id }).update({ total_points: 1000 });

      const topHolders = await RewardsService.getTopPointHolders(10);

      expect(topHolders.length).toBeGreaterThanOrEqual(1);

      // First should be user1
      const topUser = topHolders.find((u: any) => u.userId === user1.id);
      expect(topUser?.totalPoints).toBe(5000);
    });
  });
});
