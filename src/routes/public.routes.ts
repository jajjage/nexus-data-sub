import { Router } from 'express';
import { PublicProductsController } from '../controllers/publicProducts.controller';

const router = Router();

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Get public operator products
 *     tags: [Public]
 *     parameters:
 *       - in: query
 *         name: operatorId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by operator id
 *       - in: query
 *         name: productType
 *         schema:
 *           type: string
 *         description: Filter by product type (airtime, data, etc.)
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter active products
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query for name or product_code
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: perPage
 *         schema:
 *           type: integer
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of public products
 */
router.get('/products', PublicProductsController.listProducts);

export default router;
