import { Router } from 'express';
import { MobileAuthController } from '../controllers/mobileAuth.controller';
import { authenticateRefresh } from '../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Mobile Auth
 *   description: Authentication for mobile devices
 */

/**
 * @swagger
 * /mobile/auth/login:
 *   post:
 *     summary: Login for mobile users
 *     tags: [Mobile Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               deviceId:
 *                 type: string
 *               totpCode:
 *                 type: string
 *               backupCode:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Successful login
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 email:
 *                   type: string
 *                 role:
 *                   type: string
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       '400':
 *         description: Bad request
 *       '401':
 *         description: Unauthorized
 */
router.post('/login', MobileAuthController.login);

/**
 * @swagger
 * /mobile/auth/refresh:
 *   post:
 *     summary: Refresh access token for mobile users
 *     tags: [Mobile Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Tokens refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 email:
 *                   type: string
 *                 role:
 *                   type: string
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       '401':
 *         description: Invalid refresh token
 */
router.post('/refresh', authenticateRefresh, MobileAuthController.refresh);

export default router;
