import { Knex } from 'knex';
import db from '../database/connection';
import {
  CreateOperatorProductData,
  OperatorProduct,
  UpdateOperatorProductData,
} from '../types/product.types';

export class OperatorProductModel {
  /**
   * Retrieves an operator product by its ID
   * @param id The operator product ID
   * @returns The operator product object or null if not found
   */
  static async findById(id: string): Promise<OperatorProduct | null> {
    const result = await db('operator_products')
      .select(
        'id',
        'operator_id as operatorId',
        'product_code as productCode',
        'name',
        'product_type as productType',
        'denom_amount as denomAmount',
        'data_mb as dataMb',
        'validity_days as validityDays',
        'is_active as isActive',
        'metadata',
        'created_at as createdAt'
      )
      .where({ id })
      .first();

    return result || null;
  }

  /**
   * Retrieves all operator products with optional filters
   * @returns List of all operator products
   */
  static async findAll(operatorId?: string): Promise<OperatorProduct[]> {
    let query = db('operator_products')
      .select(
        'id',
        'operator_id as operatorId',
        'product_code as productCode',
        'name',
        'product_type as productType',
        'denom_amount as denomAmount',
        'data_mb as dataMb',
        'validity_days as validityDays',
        'is_active as isActive',
        'metadata',
        'created_at as createdAt'
      )
      .orderBy('name');

    if (operatorId) {
      query = query.where({ operator_id: operatorId });
    }

    const results = await query;

    return results.map(result => ({
      id: result.id,
      operatorId: result.operatorId,
      productCode: result.productCode,
      name: result.name,
      productType: result.productType,
      denomAmount: result.denomAmount,
      dataMb: result.dataMb,
      validityDays: result.validityDays,
      isActive: result.isActive,
      metadata: result.metadata,
      createdAt: result.createdAt,
    }));
  }

  /**
   * Creates a new operator product
   * @param productData The product data to create
   * @returns The created operator product
   */
  static async create(
    productData: CreateOperatorProductData,
    trx?: Knex.Transaction
  ): Promise<OperatorProduct> {
    const connection = trx || db;
    const [result] = await connection('operator_products')
      .insert({
        operator_id: productData.operatorId,
        product_code: productData.productCode,
        name: productData.name,
        product_type: productData.productType,
        denom_amount: productData.denomAmount,
        data_mb: productData.dataMb,
        validity_days: productData.validityDays,
        is_active:
          productData.isActive !== undefined ? productData.isActive : true,
        metadata: productData.metadata || '{}',
      })
      .returning('*');

    return {
      id: result.id,
      operatorId: result.operator_id,
      productCode: result.product_code,
      name: result.name,
      productType: result.product_type,
      denomAmount: result.denom_amount,
      dataMb: result.data_mb,
      validityDays: result.validity_days,
      isActive: result.is_active,
      metadata: result.metadata,
      createdAt: result.created_at,
    };
  }

  /**
   * Updates an operator product
   * @param id The operator product ID to update
   * @param productData The data to update
   * @returns The updated operator product
   */
  static async update(
    id: string,
    productData: UpdateOperatorProductData,
    trx?: Knex.Transaction
  ): Promise<OperatorProduct> {
    const connection = trx || db;
    const [result] = await connection('operator_products')
      .where({ id })
      .update({
        name: productData.name,
        product_code: productData.productCode,
        product_type: productData.productType,
        denom_amount: productData.denomAmount,
        data_mb: productData.dataMb,
        validity_days: productData.validityDays,
        is_active: productData.isActive,
        metadata: productData.metadata,
        updated_at: db.fn.now(),
      })
      .returning('*');

    return {
      id: result.id,
      operatorId: result.operator_id,
      productCode: result.product_code,
      name: result.name,
      productType: result.product_type,
      denomAmount: result.denom_amount,
      dataMb: result.data_mb,
      validityDays: result.validity_days,
      isActive: result.is_active,
      metadata: result.metadata,
      createdAt: result.created_at,
    };
  }

  /**
   * Deletes an operator product
   * @param id The operator product ID to delete
   * @returns True if deleted, false if not found
   */
  static async delete(id: string, trx?: Knex.Transaction): Promise<boolean> {
    const connection = trx || db;
    const deletedCount = await connection('operator_products')
      .where({ id })
      .del();

    return deletedCount > 0;
  }
}
