import { Request, Response } from 'express';
import { ProductService } from '../services/product.service';
import { sendError, sendSuccess } from '../utils/response.utils';

export class PublicProductsController {
  static async listProducts(req: Request, res: Response): Promise<Response> {
    try {
      const { operatorId, productType, isActive, q, page, perPage } = req.query;

      const result = await ProductService.getPublicProducts({
        operatorId: operatorId as string | undefined,
        productType: productType as string | undefined,
        isActive: isActive ? isActive === 'true' : undefined,
        q: q as string | undefined,
        page: page ? Number(page) : undefined,
        perPage: perPage ? Number(perPage) : undefined,
      });

      return sendSuccess(res, 'Products retrieved successfully', result, 200);
    } catch (error: any) {
      console.error('PublicProductsController.listProducts error:', error);
      return sendError(
        res,
        error.message || 'Internal server error',
        error.statusCode || 500
      );
    }
  }
}
