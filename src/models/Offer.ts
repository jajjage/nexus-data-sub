// src/models/Offer.ts
import { Knex } from 'knex';
import db from '../database/connection';
import { Offer, OfferProduct } from '../types/offer.type';

// =================================================================
// Offer Model Class
// =================================================================

export class OfferModel {
  private static readonly TABLE_NAME = 'offers';

  static async create(
    data: Omit<
      Offer,
      'id' | 'usage_count' | 'created_at' | 'updated_at' | 'deleted_at'
    >,
    client?: Knex.Transaction
  ): Promise<Offer> {
    const dbConnection = client || db;
    const [offer] = await dbConnection(this.TABLE_NAME)
      .insert(data)
      .returning('*');
    return offer;
  }

  static async findById(id: string): Promise<Offer | null> {
    const offer = await db(this.TABLE_NAME).where({ id }).first();
    return offer || null;
  }

  static async update(
    id: string,
    data: Partial<Omit<Offer, 'id' | 'created_at' | 'updated_at'>>,
    client?: Knex.Transaction
  ): Promise<Offer | null> {
    const dbConnection = client || db;
    const [updatedOffer] = await dbConnection(this.TABLE_NAME)
      .where({ id })
      .update({ ...data, updated_at: db.fn.now() })
      .returning('*');
    return updatedOffer || null;
  }

  static async softDelete(
    id: string,
    client?: Knex.Transaction
  ): Promise<boolean> {
    const dbConnection = client || db;
    const result = await dbConnection(this.TABLE_NAME)
      .where({ id })
      .update({ deleted_at: db.fn.now() });
    return result > 0;
  }
}

// =================================================================
// OfferProduct Model Class
// =================================================================

export class OfferProductModel {
  private static readonly TABLE_NAME = 'offer_products';

  static async create(
    data: Omit<OfferProduct, 'id' | 'created_at'>,
    client?: Knex.Transaction
  ): Promise<OfferProduct> {
    const dbConnection = client || db;
    const [offerProduct] = await dbConnection(this.TABLE_NAME)
      .insert(data)
      .returning('*');
    return offerProduct;
  }
}

// ... and so on for the other models
