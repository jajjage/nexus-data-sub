/**
 * Test Fixtures and Helper Functions
 * Factory functions for creating test data for rewards and referrals tests
 */

import db from '../../../src/database/connection';

export interface TestUser {
  id: string;
  email: string;
  fullName: string;
}

export interface TestReward {
  id: string;
  userId: string;
  points: number;
  reason: string;
  status: string;
}

export interface TestReferral {
  id: string;
  referrerUserId: string;
  referredUserId: string;
  rewardAmount: number;
  status: string;
}

/**
 * Creates a test user in the database
 */
export async function createTestUser(
  override: Partial<TestUser> = {}
): Promise<TestUser> {
  const email = override.email || `test-${Date.now()}@example.com`;
  const fullName = override.fullName || 'Test User';
  // Generate a simple test password hash (in real tests, use proper hashing)
  const password = 'test_password_hash_' + Date.now();

  const [user] = await db('users')
    .insert({
      email,
      full_name: fullName,
      phone_number: '+234' + Math.random().toString().slice(2, 12),
      password,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    })
    .returning('*');

  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
  };
}

/**
 * Creates a test reward for a user
 */
export async function createTestReward(
  userId: string,
  override: Partial<TestReward> = {}
): Promise<TestReward> {
  const points = override.points || 100;
  const reason = override.reason || 'test_reward';
  const status = override.status || 'pending';

  const [reward] = await db('rewards')
    .insert({
      user_id: userId,
      points,
      reason,
      status,
      earned_at: db.fn.now(),
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    })
    .returning('*');

  return {
    id: reward.id,
    userId: reward.user_id,
    points: reward.points,
    reason: reward.reason,
    status: reward.status,
  };
}

/**
 * Creates a test referral between two users
 */
export async function createTestReferral(
  referrerId: string,
  referredId: string,
  override: Partial<TestReferral> = {}
): Promise<TestReferral> {
  const rewardAmount = override.rewardAmount || 50.0;
  const status = override.status || 'pending';
  const referralCode = `TEST-${Math.random().toString(36).substring(7).toUpperCase()}`;

  const [referral] = await db('referrals')
    .insert({
      referrer_user_id: referrerId,
      referred_user_id: referredId,
      reward_amount: rewardAmount,
      status,
      referral_code: referralCode,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    })
    .returning('*');

  return {
    id: referral.id,
    referrerUserId: referral.referrer_user_id,
    referredUserId: referral.referred_user_id,
    rewardAmount: parseFloat(referral.reward_amount),
    status: referral.status,
  };
}

/**
 * Creates a test badge
 */
export async function createTestBadge(override: Record<string, any> = {}) {
  const name = override.name || `test_badge_${Date.now()}`;
  const requiredAction = override.required_action || `action_${Date.now()}`;

  const [badge] = await db('badges')
    .insert({
      name,
      description: override.description || 'Test Badge',
      icon: override.icon || 'https://example.com/icon.png',
      required_action: requiredAction,
      required_value: override.required_value || 0,
      category: override.category || 'achievement',
      is_active: override.is_active !== false,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    })
    .returning('*');

  return badge;
}

/**
 * Awards a test badge to a user
 */
export async function awardTestBadge(userId: string, badgeId: string) {
  const [userBadge] = await db('user_badges')
    .insert({
      user_id: userId,
      badge_id: badgeId,
      earned_at: db.fn.now(),
      created_at: db.fn.now(),
    })
    .returning('*');

  return userBadge;
}

/**
 * Creates a test transaction for a user
 */
export async function createTestTransaction(
  userId: string,
  override: Record<string, any> = {}
) {
  const amount = override.amount || 1000;
  const direction = override.direction || 'credit';
  const method = override.method || 'topup';

  const [transaction] = await db('transactions')
    .insert({
      user_id: userId,
      wallet_id: override.wallet_id || userId, // Assuming wallet_id equals user_id
      amount,
      direction,
      method,
      description: override.description || 'Test Transaction',
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    })
    .returning('*');

  return transaction;
}

/**
 * Cleans up test data from the database
 */
export async function cleanupTestData(userIds: string[] = []) {
  try {
    // Delete in reverse order to respect foreign key constraints
    if (userIds.length > 0) {
      // Delete rewards
      await db('rewards').whereIn('user_id', userIds).delete();

      // Delete user_badges
      await db('user_badges').whereIn('user_id', userIds).delete();

      // Delete referrals (both as referrer and referred)
      await db('referrals')
        .where(function () {
          this.whereIn('referrer_user_id', userIds).orWhereIn(
            'referred_user_id',
            userIds
          );
        })
        .delete();

      // Delete transactions
      await db('transactions').whereIn('user_id', userIds).delete();

      // Delete users
      await db('users').whereIn('id', userIds).delete();
    }
  } catch (error) {
    console.error('Error cleaning up test data:', error);
    // Don't throw - allow tests to continue even if cleanup fails
  }
}

/**
 * Gets user's current reward summary from database
 */
export async function getUserRewardsSummary(userId: string) {
  const rewards = await db('rewards').where({ user_id: userId }).select('*');

  const summary = {
    total: 0,
    pending: 0,
    credited: 0,
    expired: 0,
    revoked: 0,
  };

  rewards.forEach(reward => {
    summary.total += reward.points;
    switch (reward.status) {
      case 'pending':
        summary.pending += reward.points;
        break;
      case 'credited':
        summary.credited += reward.points;
        break;
      case 'expired':
        summary.expired += reward.points;
        break;
      case 'revoked':
        summary.revoked += reward.points;
        break;
    }
  });

  return summary;
}

/**
 * Gets user's current referral stats from database
 */
export async function getUserReferralStats(userId: string) {
  const referrals = await db('referrals')
    .where({ referrer_user_id: userId })
    .select('*');

  const stats = {
    totalReferrals: referrals.length,
    activeReferrals: 0,
    completedReferrals: 0,
    totalRewardEarned: 0,
  };

  referrals.forEach(referral => {
    if (referral.status === 'active') {
      stats.activeReferrals++;
    } else if (referral.status === 'completed') {
      stats.completedReferrals++;
      stats.totalRewardEarned += parseFloat(referral.reward_amount);
    }
  });

  return stats;
}

/**
 * Gets a user's badges from database
 */
export async function getUserBadgesFromDB(userId: string) {
  return db('user_badges')
    .where({ user_id: userId })
    .join('badges', 'user_badges.badge_id', 'badges.id')
    .select('badges.*', 'user_badges.earned_at')
    .orderBy('user_badges.earned_at', 'desc');
}
