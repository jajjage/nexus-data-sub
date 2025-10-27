// src/services/offer.service.ts
import db from '../database/connection';
import { OfferModel } from '../models/Offer';
import { Offer } from '../types/offer.type';
import { ApiError } from '../utils/ApiError';

export class OfferService {
  /**
   * Creates a new offer.
   * @param offerData - The data for the new offer.
   * @returns The newly created offer.
   */
  static async createOffer(
    offerData: Omit<
      Offer,
      'id' | 'usage_count' | 'created_at' | 'updated_at' | 'deleted_at'
    >
  ): Promise<Offer> {
    return db.transaction(async trx => {
      const offer = await OfferModel.create(offerData, trx);
      // Here you could add logic to create related entities like offer_products,
      // offer_allowed_users, etc., within the same transaction.
      return offer;
    });
  }

  /**
   * Gets an offer by its ID.
   * @param offerId - The ID of the offer to retrieve.
   * @returns The offer, or null if not found.
   */
  static async getOfferById(offerId: string): Promise<Offer | null> {
    return OfferModel.findById(offerId);
  }

  /**
   * Updates an existing offer.
   * @param offerId - The ID of the offer to update.
   * @param offerData - The data to update the offer with.
   * @returns The updated offer.
   */
  static async updateOffer(
    offerId: string,
    offerData: Partial<Omit<Offer, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<Offer> {
    const offer = await OfferModel.update(offerId, offerData);
    if (!offer) {
      throw new ApiError(404, 'Offer not found');
    }
    return offer;
  }

  /**
   * Soft deletes an offer.
   * @param offerId - The ID of the offer to delete.
   */
  static async deleteOffer(offerId: string): Promise<void> {
    const success = await OfferModel.softDelete(offerId);
    if (!success) {
      throw new ApiError(404, 'Offer not found');
    }
  }

  /**
   * Redeems an offer for a user.
   * This is a transactional operation.
   * @param offerId - The ID of the offer to redeem.
   * @param userId - The ID of the user redeeming the offer.
   * @param price - The price being paid.
   * @param discount - The discount amount.
   */
  static async redeemOffer(
    offerId: string,
    userId: string,
    price: number,
    discount: number,
    operatorProductId?: string,
    supplierProductMappingId?: string
  ): Promise<void> {
    await db.transaction(async trx => {
      const offer = await trx('offers')
        .where('id', offerId)
        .andWhere('status', 'active')
        .forUpdate() // Lock the row for the duration of the transaction
        .first();

      if (!offer) {
        throw new ApiError(400, 'Offer inactive or not found');
      }

      // Check eligibility using the PostgreSQL function
      const { rows } = await trx.raw(
        'SELECT is_user_eligible_for_offer(?, ?) AS eligible',
        [offerId, userId]
      );

      if (!rows[0].eligible) {
        throw new ApiError(403, 'User not eligible for this offer');
      }

      // Check per-user limit
      if (offer.per_user_limit) {
        const redemptionCount = await trx('offer_redemptions')
          .where({ offer_id: offerId, user_id: userId })
          .count('* as count')
          .first();

        if (
          redemptionCount &&
          Number(redemptionCount.count) >= offer.per_user_limit
        ) {
          throw new ApiError(403, 'Per-user limit reached for this offer');
        }
      }

      // NOTE: a DB trigger enforces eligibility and increments usage_count
      // atomically when inserting into `offer_redemptions`. Do not increment
      // usage_count here to avoid double-incrementing; the trigger will
      // perform the update and raise errors on concurrent exhaustion.

      // Validate product ID requirements
      if (!operatorProductId && !supplierProductMappingId) {
        throw new ApiError(
          400,
          'Either operator_product_id or supplier_product_mapping_id is required'
        );
      }
      if (operatorProductId && supplierProductMappingId) {
        throw new ApiError(
          400,
          'Cannot provide both operator_product_id and supplier_product_mapping_id'
        );
      }

      // Insert redemption record
      await trx('offer_redemptions').insert({
        offer_id: offerId,
        user_id: userId,
        price_paid: price,
        discount_amount: discount,
        operator_product_id: operatorProductId,
        supplier_product_mapping_id: supplierProductMappingId,
      });
    });
  }
}
