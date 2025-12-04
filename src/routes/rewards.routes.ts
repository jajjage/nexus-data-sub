import { Router } from 'express';
import { ReferralLinkController } from '../controllers/referralLink.controller';
import { ReferralsController } from '../controllers/referrals.controller';
import { RewardsController } from '../controllers/rewards.controller';
import { authenticate } from '../middleware/auth.middleware';
import { hasPermission, requireRole } from '../middleware/rbac.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Rewards & Referrals
 *   description: Rewards, badges, and referral management
 */

// ============================================
// Rewards Endpoints
// ============================================

/**
 * @swagger
 * /api/v1/dashboard/rewards:
 *   get:
 *     summary: Get rewards summary for authenticated user
 *     tags: [Rewards & Referrals]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Rewards summary retrieved successfully
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/rewards', authenticate, RewardsController.getRewardsSummary);

/**
 * @swagger
 * /api/v1/dashboard/rewards/badges:
 *   get:
 *     summary: Get all badges earned by authenticated user
 *     tags: [Rewards & Referrals]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User badges retrieved successfully
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/rewards/badges', authenticate, RewardsController.getUserBadges);

/**
 * @swagger
 * /api/v1/dashboard/rewards/leaderboard:
 *   get:
 *     summary: Get top point holders (leaderboard)
 *     tags: [Rewards & Referrals]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 100
 *         description: Maximum number of results
 *     responses:
 *       200:
 *         description: Leaderboard retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/rewards/leaderboard', RewardsController.getLeaderboard);

/**
 * @swagger
 * /api/v1/dashboard/badges/{badgeId}/holders:
 *   get:
 *     summary: Get users who have earned a specific badge
 *     tags: [Rewards & Referrals]
 *     parameters:
 *       - in: path
 *         name: badgeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Badge ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 200
 *         description: Maximum number of results
 *     responses:
 *       200:
 *         description: Badge holders retrieved successfully
 *       400:
 *         description: Badge ID is required
 *       500:
 *         description: Internal server error
 */
router.get('/badges/:badgeId/holders', RewardsController.getBadgeHolders);

/**
 * @swagger
 * /api/v1/dashboard/rewards/check-badges:
 *   post:
 *     summary: Check and award eligible badges for a user (Admin)
 *     tags: [Rewards & Referrals]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID to check badges for
 *             required:
 *               - userId
 *     responses:
 *       200:
 *         description: Badge check completed
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Permission denied
 *       500:
 *         description: Internal server error
 */
router.post(
  '/rewards/check-badges',
  authenticate,
  hasPermission('manage_rewards'),
  RewardsController.checkAndAwardBadges
);

/**
 * @swagger
 * /api/v1/dashboard/rewards/credit-points:
 *   post:
 *     summary: Credit pending points for a user (Admin)
 *     tags: [Rewards & Referrals]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID to credit points for
 *             required:
 *               - userId
 *     responses:
 *       200:
 *         description: Points credited successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Permission denied
 *       500:
 *         description: Internal server error
 */
router.post(
  '/rewards/credit-points',
  authenticate,
  hasPermission('manage_rewards'),
  RewardsController.creditPendingPoints
);

// ============================================
// Referrals Endpoints
// ============================================

/**
 * @swagger
 * /api/v1/dashboard/referrals:
 *   get:
 *     summary: Get referral statistics for authenticated user
 *     tags: [Rewards & Referrals]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Referral statistics retrieved successfully
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.get('/referrals', authenticate, ReferralsController.getReferralStats);

/**
 * @swagger
 * /api/v1/dashboard/referrals/list:
 *   get:
 *     summary: Get paginated referral list for authenticated user
 *     tags: [Rewards & Referrals]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, active, completed, cancelled]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: Referral list retrieved successfully
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.get(
  '/referrals/list',
  authenticate,
  ReferralsController.getReferralList
);

// INTERNAL ADMIN ONLY - Not exposed in public API
// Used for testing and admin manual intervention only
router.post(
  '/referrals/_admin/create',
  authenticate,
  requireRole('admin'),
  ReferralsController.createReferral
);

/**
 * @swagger
 * /api/v1/dashboard/referrals/link:
 *   get:
 *     summary: Get or create user's personal referral link
 *     tags: [Rewards & Referrals]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Referral link retrieved successfully
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.get(
  '/referrals/link',
  authenticate,
  ReferralLinkController.getOrCreateLink
);

/**
 * @swagger
 * /api/v1/dashboard/referrals/link/stats:
 *   get:
 *     summary: Get referral link statistics
 *     tags: [Rewards & Referrals]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Referral link statistics retrieved successfully
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.get(
  '/referrals/link/stats',
  authenticate,
  ReferralLinkController.getLinkStats
);

/**
 * @swagger
 * /api/v1/dashboard/referrals/link/regenerate:
 *   post:
 *     summary: Regenerate referral code
 *     tags: [Rewards & Referrals]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Referral code regenerated successfully
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.post(
  '/referrals/link/regenerate',
  authenticate,
  ReferralLinkController.regenerateCode
);

/**
 * @swagger
 * /api/v1/dashboard/referrals/link/deactivate:
 *   post:
 *     summary: Deactivate referral link
 *     tags: [Rewards & Referrals]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Referral link deactivated successfully
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.post(
  '/referrals/link/deactivate',
  authenticate,
  ReferralLinkController.deactivateLink
);

/**
 * @swagger
 * /api/v1/dashboard/referrals/leaderboard:
 *   get:
 *     summary: Get top referrers (leaderboard)
 *     tags: [Rewards & Referrals]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 100
 *         description: Maximum number of results
 *     responses:
 *       200:
 *         description: Top referrers retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get(
  '/referrals/leaderboard',
  authenticate,
  ReferralsController.getTopReferrers
);

/**
 * @swagger
 * /api/v1/dashboard/referrals/{referralId}/complete:
 *   post:
 *     summary: Mark a referral as completed (Admin)
 *     tags: [Rewards & Referrals]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: referralId
 *         required: true
 *         schema:
 *           type: string
 *         description: Referral ID
 *     responses:
 *       200:
 *         description: Referral completed successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Referral not found
 *       500:
 *         description: Internal server error
 */
router.post(
  '/referrals/:referralId/complete',
  authenticate,
  requireRole('admin'),
  ReferralsController.completeReferral
);

/**
 * @swagger
 * /api/v1/dashboard/referrals/{referralId}/process-reward:
 *   post:
 *     summary: Process reward for a completed referral (Admin)
 *     tags: [Rewards & Referrals]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: referralId
 *         required: true
 *         schema:
 *           type: string
 *         description: Referral ID
 *     responses:
 *       200:
 *         description: Referral reward processed successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Referral not found
 *       500:
 *         description: Internal server error
 */
router.post(
  '/referrals/:referralId/process-reward',
  authenticate,
  requireRole('admin'),
  ReferralsController.processReferralReward
);

/**
 * @swagger
 * /api/v1/dashboard/referrals/batch-process:
 *   post:
 *     summary: Batch process pending referral rewards (Admin)
 *     tags: [Rewards & Referrals]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               limit:
 *                 type: integer
 *                 default: 100
 *                 maximum: 500
 *                 description: Max referrals to process
 *     responses:
 *       200:
 *         description: Batch processing completed
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Permission denied
 *       500:
 *         description: Internal server error
 */
router.post(
  '/referrals/batch-process',
  authenticate,
  requireRole('admin'),
  ReferralsController.batchProcessPendingReferrals
);

export default router;
