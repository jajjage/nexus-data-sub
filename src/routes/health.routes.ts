import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Health
 *   description: Service health and monitoring
 */

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Get service health status
 *     tags: [Health]
 *     description: Returns the overall health status of the service including database and Redis connections
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: integer
 *                   example: 12345
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *                 services:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: string
 *                       example: healthy
 *                     redis:
 *                       type: string
 *                       example: healthy
 *                     application:
 *                       type: string
 *                       example: healthy
 *                 system:
 *                   type: object
 *                   properties:
 *                     memory:
 *                       type: object
 *                       properties:
 *                         used:
 *                           type: number
 *                           example: 45.5
 *                         total:
 *                           type: number
 *                           example: 128.0
 *                         unit:
 *                           type: string
 *                           example: MB
 *                     cpu:
 *                       type: object
 *                       properties:
 *                         load:
 *                           type: integer
 *                           example: 1234
 *       503:
 *         description: Service is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 error:
 *                   type: string
 *                   example: Health check failed
 */
router.get('/health', HealthController.getHealth);

/**
 * @swagger
 * /ready:
 *   get:
 *     summary: Get service readiness status
 *     tags: [Health]
 *     description: Returns whether the service is ready to serve requests
 *     responses:
 *       200:
 *         description: Service is ready
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ready
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 services:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: string
 *                       example: ready
 *                     redis:
 *                       type: string
 *                       example: ready
 *       503:
 *         description: Service is not ready
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: not ready
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 services:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: string
 *                       example: not ready
 *                     redis:
 *                       type: string
 *                       example: not ready
 */
router.get('/ready', HealthController.getReadiness);

/**
 * @swagger
 * /alive:
 *   get:
 *     summary: Get service liveness status
 *     tags: [Health]
 *     description: Returns whether the service process is alive
 *     responses:
 *       200:
 *         description: Service is alive
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: alive
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 pid:
 *                   type: integer
 *                   example: 12345
 */
router.get('/alive', HealthController.getLiveness);

export default router;
