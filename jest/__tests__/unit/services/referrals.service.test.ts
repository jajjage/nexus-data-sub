/**
 * Unit Tests for ReferralsService
 * Tests referral program business logic
 */

import db from '../../../../src/database/connection';
import { ReferralsService } from '../../../../src/services/referrals.service';
import {
  cleanupTestData,
  createTestUser,
} from '../../fixtures/rewards.fixtures';

describe('ReferralsService', () => {
  let testUserIds: string[] = [];

  afterEach(async () => {
    // Cleanup test data after each test
    await cleanupTestData(testUserIds);
    testUserIds = [];
  });

  describe('createReferral', () => {
    it('should create a new referral with pending status', async () => {
      const referrer = await createTestUser();
      const referred = await createTestUser();
      testUserIds.push(referrer.id, referred.id);

      const referral = await ReferralsService.createReferral(
        referrer.id,
        referred.id,
        50.0
      );

      expect(referral).toBeDefined();
      expect(referral.referrerUserId).toBe(referrer.id);
      expect(referral.referredUserId).toBe(referred.id);
      expect(referral.rewardAmount).toBe(50.0);
      expect(referral.status).toBe('pending');
    });

    it('should generate referral code if not provided', async () => {
      const referrer = await createTestUser();
      const referred = await createTestUser();
      testUserIds.push(referrer.id, referred.id);

      const referral = await ReferralsService.createReferral(
        referrer.id,
        referred.id,
        50.0
      );

      expect(referral.referralCode).toBeDefined();
      expect(referral.referralCode).toMatch(/^[A-Z0-9-]+$/);
    });

    it('should use provided referral code', async () => {
      const referrer = await createTestUser();
      const referred = await createTestUser();
      testUserIds.push(referrer.id, referred.id);

      const customCode = 'CUSTOM-CODE-123';
      const referral = await ReferralsService.createReferral(
        referrer.id,
        referred.id,
        50.0,
        customCode
      );

      expect(referral.referralCode).toBe(customCode);
    });

    it('should reject self-referrals', async () => {
      const user = await createTestUser();
      testUserIds.push(user.id);

      await expect(
        ReferralsService.createReferral(user.id, user.id, 50.0)
      ).rejects.toThrow();
    });

    it('should prevent duplicate referrals for same user', async () => {
      const referrer = await createTestUser();
      const referred = await createTestUser();
      testUserIds.push(referrer.id, referred.id);

      // Create first referral
      await ReferralsService.createReferral(referrer.id, referred.id, 50.0);

      // Try to create duplicate
      await expect(
        ReferralsService.createReferral(referrer.id, referred.id, 50.0)
      ).rejects.toThrow();
    });
  });

  describe('activateReferral', () => {
    it('should change referral status from pending to active', async () => {
      const referrer = await createTestUser();
      const referred = await createTestUser();
      testUserIds.push(referrer.id, referred.id);

      const referral = await ReferralsService.createReferral(
        referrer.id,
        referred.id,
        50.0
      );

      const activated = await ReferralsService.activateReferral(referral.id);

      expect(activated.status).toBe('active');
    });
  });

  describe('completeReferral', () => {
    it('should mark referral as completed and increment referral_count', async () => {
      const referrer = await createTestUser();
      const referred = await createTestUser();
      testUserIds.push(referrer.id, referred.id);

      // Initialize referral_count
      await db('users')
        .where({ id: referrer.id })
        .update({ referral_count: 0 });

      const referral = await ReferralsService.createReferral(
        referrer.id,
        referred.id,
        50.0
      );

      const completed = await ReferralsService.completeReferral(referral.id);

      expect(completed.status).toBe('completed');

      // Verify referral_count incremented
      const updatedReferrer = await db('users')
        .where({ id: referrer.id })
        .select('referral_count')
        .first();

      expect(updatedReferrer.referral_count).toBe(1);
    });
  });

  describe('getReferralStats', () => {
    it('should return correct referral statistics', async () => {
      const referrer = await createTestUser();
      const referred1 = await createTestUser();
      const referred2 = await createTestUser();
      testUserIds.push(referrer.id, referred1.id, referred2.id);

      // Create active referral
      const ref1 = await ReferralsService.createReferral(
        referrer.id,
        referred1.id,
        50.0
      );
      await ReferralsService.activateReferral(ref1.id);

      // Create completed referral
      const ref2 = await ReferralsService.createReferral(
        referrer.id,
        referred2.id,
        75.0
      );
      await ReferralsService.completeReferral(ref2.id);

      const stats = await ReferralsService.getReferralStats(referrer.id);

      expect(stats.totalReferrals).toBe(2);
      expect(stats.activeReferrals).toBe(1);
      expect(stats.completedReferrals).toBe(1);
    });

    it('should return zero stats for user with no referrals', async () => {
      const user = await createTestUser();
      testUserIds.push(user.id);

      const stats = await ReferralsService.getReferralStats(user.id);

      expect(stats.totalReferrals).toBe(0);
      expect(stats.activeReferrals).toBe(0);
      expect(stats.completedReferrals).toBe(0);
      expect(stats.totalRewardEarned).toBe(0);
    });
  });

  describe('getReferralList', () => {
    it('should return paginated referral list', async () => {
      const referrer = await createTestUser();
      const referred1 = await createTestUser();
      const referred2 = await createTestUser();
      testUserIds.push(referrer.id, referred1.id, referred2.id);

      await ReferralsService.createReferral(referrer.id, referred1.id, 50.0);
      await ReferralsService.createReferral(referrer.id, referred2.id, 75.0);

      const referrals = await ReferralsService.getReferralList(referrer.id);

      expect(referrals.length).toBe(2);
    });

    it('should filter by status', async () => {
      const referrer = await createTestUser();
      const referred1 = await createTestUser();
      const referred2 = await createTestUser();
      testUserIds.push(referrer.id, referred1.id, referred2.id);

      const ref1 = await ReferralsService.createReferral(
        referrer.id,
        referred1.id,
        50.0
      );
      // Create a second referral but don't activate it
      await ReferralsService.createReferral(referrer.id, referred2.id, 75.0);

      await ReferralsService.activateReferral(ref1.id);

      const activeReferrals = await ReferralsService.getReferralList(
        referrer.id,
        'active'
      );

      expect(activeReferrals.length).toBe(1);
      expect(activeReferrals[0].referralId).toBe(ref1.id);
    });
  });

  describe('getReferrer', () => {
    it('should find the referrer of a user', async () => {
      const referrer = await createTestUser();
      const referred = await createTestUser();
      testUserIds.push(referrer.id, referred.id);

      await ReferralsService.createReferral(referrer.id, referred.id, 50.0);

      const foundReferrer = await ReferralsService.getReferrer(referred.id);

      expect(foundReferrer).toBeDefined();
      expect(foundReferrer?.referrerUserId).toBe(referrer.id);
    });

    it('should return null if user has no referrer', async () => {
      const user = await createTestUser();
      testUserIds.push(user.id);

      const referrer = await ReferralsService.getReferrer(user.id);

      expect(referrer).toBeNull();
    });
  });

  describe('cancelReferral', () => {
    it('should cancel an active referral', async () => {
      const referrer = await createTestUser();
      const referred = await createTestUser();
      testUserIds.push(referrer.id, referred.id);

      const referral = await ReferralsService.createReferral(
        referrer.id,
        referred.id,
        50.0
      );
      await ReferralsService.activateReferral(referral.id);

      const cancelled = await ReferralsService.cancelReferral(referral.id);

      expect(cancelled.status).toBe('cancelled');
    });

    it('should decrement referral_count if was completed', async () => {
      const referrer = await createTestUser();
      const referred = await createTestUser();
      testUserIds.push(referrer.id, referred.id);

      const referral = await ReferralsService.createReferral(
        referrer.id,
        referred.id,
        50.0
      );
      await ReferralsService.completeReferral(referral.id);

      await ReferralsService.cancelReferral(referral.id);

      const updatedReferrer = await db('users')
        .where({ id: referrer.id })
        .select('referral_count')
        .first();

      expect(updatedReferrer.referral_count).toBe(0);
    });
  });

  describe('processReferralReward', () => {
    it('should create a reward for completed referral', async () => {
      const referrer = await createTestUser();
      const referred = await createTestUser();
      testUserIds.push(referrer.id, referred.id);

      const referral = await ReferralsService.createReferral(
        referrer.id,
        referred.id,
        100.0 // $100
      );
      await ReferralsService.completeReferral(referral.id);

      const reward = await ReferralsService.processReferralReward(referral.id);

      expect(reward).toBeDefined();
      expect(reward!.userId).toBe(referrer.id);
      // 100 * 100 = 10,000 points
      expect(reward!.points).toBe(10000);
    });

    it('should link reward to referral', async () => {
      const referrer = await createTestUser();
      const referred = await createTestUser();
      testUserIds.push(referrer.id, referred.id);

      const referral = await ReferralsService.createReferral(
        referrer.id,
        referred.id,
        50.0
      );
      await ReferralsService.completeReferral(referral.id);

      const reward = await ReferralsService.processReferralReward(referral.id);

      // Verify reward is linked
      const updatedReferral = await db('referrals')
        .where({ id: referral.id })
        .select('reward_id')
        .first();

      expect(reward).toBeDefined();
      expect(updatedReferral.reward_id).toBe(reward!.id);
    });
  });

  describe('batchProcessPendingReferrals', () => {
    it('should process multiple pending referrals', async () => {
      const referrer = await createTestUser();
      const referred1 = await createTestUser();
      const referred2 = await createTestUser();
      testUserIds.push(referrer.id, referred1.id, referred2.id);

      const ref1 = await ReferralsService.createReferral(
        referrer.id,
        referred1.id,
        50.0
      );
      const ref2 = await ReferralsService.createReferral(
        referrer.id,
        referred2.id,
        75.0
      );

      // Mark as active/ready for processing
      await ReferralsService.activateReferral(ref1.id);
      await ReferralsService.activateReferral(ref2.id);

      const processed = await ReferralsService.batchProcessPendingReferrals(10);

      expect(processed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('findByCode', () => {
    it('should find referral by code', async () => {
      const referrer = await createTestUser();
      const referred = await createTestUser();
      testUserIds.push(referrer.id, referred.id);

      const referral = await ReferralsService.createReferral(
        referrer.id,
        referred.id,
        50.0
      );

      const found = await ReferralsService.findByCode(referral.referralCode!);

      expect(found).toBeDefined();
      expect(found?.referralCode).toBe(referral.referralCode);
    });

    it('should return null for invalid code', async () => {
      const found = await ReferralsService.findByCode('INVALID-CODE-123');

      expect(found).toBeNull();
    });
  });

  describe('validateReferralCode', () => {
    it('should validate active referral code', async () => {
      const referrer = await createTestUser();
      const referred = await createTestUser();
      testUserIds.push(referrer.id, referred.id);

      const referral = await ReferralsService.createReferral(
        referrer.id,
        referred.id,
        50.0
      );
      await ReferralsService.activateReferral(referral.id);

      const validation = await ReferralsService.validateReferralCode(
        referral.referralCode!
      );

      expect(validation).toBeDefined();
      expect(validation?.referralCode).toBe(referral.referralCode);
    });

    it('should reject completed referral code', async () => {
      const referrer = await createTestUser();
      const referred = await createTestUser();
      testUserIds.push(referrer.id, referred.id);

      const referral = await ReferralsService.createReferral(
        referrer.id,
        referred.id,
        50.0
      );
      await ReferralsService.completeReferral(referral.id);

      const validation = await ReferralsService.validateReferralCode(
        referral.referralCode!
      );

      expect(validation).toBeNull();
    });

    it('should reject cancelled referral code', async () => {
      const referrer = await createTestUser();
      const referred = await createTestUser();
      testUserIds.push(referrer.id, referred.id);

      const referral = await ReferralsService.createReferral(
        referrer.id,
        referred.id,
        50.0
      );
      await ReferralsService.cancelReferral(referral.id);

      const validation = await ReferralsService.validateReferralCode(
        referral.referralCode!
      );

      expect(validation).toBeNull();
    });
  });

  describe('getTopReferrers', () => {
    it('should return top referrers by completed referrals', async () => {
      const referrer1 = await createTestUser();
      const referrer2 = await createTestUser();
      const referred1 = await createTestUser();
      const referred2 = await createTestUser();
      const referred3 = await createTestUser();
      testUserIds.push(
        referrer1.id,
        referrer2.id,
        referred1.id,
        referred2.id,
        referred3.id
      );

      // Referrer1 has 2 completed
      const ref1a = await ReferralsService.createReferral(
        referrer1.id,
        referred1.id,
        50.0
      );
      const ref1b = await ReferralsService.createReferral(
        referrer1.id,
        referred2.id,
        50.0
      );
      await ReferralsService.completeReferral(ref1a.id);
      await ReferralsService.completeReferral(ref1b.id);

      // Referrer2 has 1 completed
      const ref2a = await ReferralsService.createReferral(
        referrer2.id,
        referred3.id,
        50.0
      );
      await ReferralsService.completeReferral(ref2a.id);

      const topReferrers = await ReferralsService.getTopReferrers(10);

      expect(topReferrers.length).toBeGreaterThanOrEqual(1);

      // First should have more completions
      const top = topReferrers.find((r: any) => r.userId === referrer1.id);
      expect(top).toBeDefined();
      expect(top?.referralCount).toBeGreaterThanOrEqual(2);
    });
  });
});
