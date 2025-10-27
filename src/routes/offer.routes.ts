// src/routes/offer.routes.ts
import { Router } from 'express';
import { OfferController } from '../controllers/offer.controller';
import { authenticate } from '../middleware/auth.middleware';
import { hasPermission } from '../middleware/rbac.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Offers
 *   description: Offer management and redemption.
 */

// All offer routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /offers:
 *   post:
 *     summary: Create a new offer
 *     tags: [Offers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOfferRequest'
 *     responses:
 *       201:
 *         description: Offer created successfully.
 *       400:
 *         description: Invalid input.
 */
router.post('/', hasPermission('offer:create'), OfferController.createOffer);

/**
 * @swagger
 * /offers/{offerId}:
 *   get:
 *     summary: Get an offer by ID
 *     tags: [Offers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: offerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Successfully retrieved the offer.
 *       404:
 *         description: Offer not found.
 */
router.get(
  '/:offerId',
  hasPermission('offer:read'),
  OfferController.getOfferById
);

/**
 * @swagger
 * /offers/{offerId}:
 *   put:
 *     summary: Update an offer
 *     tags: [Offers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: offerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateOfferRequest'
 *     responses:
 *       200:
 *         description: Offer updated successfully.
 *       404:
 *         description: Offer not found.
 */
router.put(
  '/:offerId',
  hasPermission('offer:update'),
  OfferController.updateOffer
);

/**
 * @swagger
 * /offers/{offerId}:
 *   delete:
 *     summary: Delete an offer
 *     tags: [Offers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: offerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Offer deleted successfully.
 *       404:
 *         description: Offer not found.
 */
router.delete(
  '/:offerId',
  hasPermission('offer:delete'),
  OfferController.deleteOffer
);

/**
 * @swagger
 * /offers/{offerId}/redeem:
 *   post:
 *     summary: Redeem an offer
 *     tags: [Offers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: offerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RedeemOfferRequest'
 *     responses:
 *       200:
 *         description: Offer redeemed successfully.
 *       400:
 *         description: Invalid input or offer not active.
 *       403:
 *         description: User not eligible or limit reached.
 *       404:
 *         description: Offer not found.
 */
router.post(
  '/:offerId/redeem',
  // This should probably have its own permission, e.g., 'offer:redeem'
  // For now, we'll use the 'offer:update' permission as a placeholder.
  hasPermission('offer:update'),
  OfferController.redeemOffer
);

export default router;
