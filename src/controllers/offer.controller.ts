// src/controllers/offer.controller.ts
import { Request, Response } from 'express';
import { OfferService } from '../services/offer.service';
import { sendError, sendSuccess } from '../utils/response.utils';

export class OfferController {
  static async createOffer(req: Request, res: Response) {
    try {
      const offer = await OfferService.createOffer(req.body);
      return sendSuccess(res, 'Offer created successfully', { offer }, 201);
    } catch (error: any) {
      console.error('Create offer error:', error);
      return sendError(
        res,
        error.message || 'Internal server error',
        error.statusCode || 500
      );
    }
  }

  static async getOfferById(req: Request, res: Response) {
    try {
      const { offerId } = req.params;
      const offer = await OfferService.getOfferById(offerId);
      if (!offer) {
        return sendError(res, 'Offer not found', 404);
      }
      return sendSuccess(res, 'Offer retrieved successfully', { offer });
    } catch (error: any) {
      console.error('Get offer by ID error:', error);
      return sendError(
        res,
        error.message || 'Internal server error',
        error.statusCode || 500
      );
    }
  }

  static async updateOffer(req: Request, res: Response) {
    try {
      const { offerId } = req.params;
      const offer = await OfferService.updateOffer(offerId, req.body);
      return sendSuccess(res, 'Offer updated successfully', { offer });
    } catch (error: any) {
      console.error('Update offer error:', error);
      return sendError(
        res,
        error.message || 'Internal server error',
        error.statusCode || 500
      );
    }
  }

  static async deleteOffer(req: Request, res: Response) {
    try {
      const { offerId } = req.params;
      await OfferService.deleteOffer(offerId);
      return sendSuccess(res, 'Offer deleted successfully');
    } catch (error: any) {
      console.error('Delete offer error:', error);
      return sendError(
        res,
        error.message || 'Internal server error',
        error.statusCode || 500
      );
    }
  }

  static async redeemOffer(req: Request, res: Response) {
    try {
      const { offerId } = req.params;
      const {
        userId,
        price,
        discount,
        operatorProductId,
        supplierProductMappingId,
      } = req.body;
      await OfferService.redeemOffer(
        offerId,
        userId,
        price,
        discount,
        operatorProductId,
        supplierProductMappingId
      );
      return sendSuccess(res, 'Offer redeemed successfully');
    } catch (error: any) {
      console.error('Redeem offer error:', error);
      return sendError(
        res,
        error.message || 'Internal server error',
        error.statusCode || 500
      );
    }
  }
}
