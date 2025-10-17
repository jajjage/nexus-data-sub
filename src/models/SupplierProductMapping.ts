import { Knex } from 'knex';
import db from '../database/connection';
import {
  CreateSupplierProductMappingData,
  SupplierProductMapping,
  UpdateSupplierProductMappingData,
} from '../types/product.types';

export class SupplierProductMappingModel {
  /**
   * Retrieves a supplier product mapping by its ID
   * @param id The supplier product mapping ID
   * @param trx Optional Knex transaction
   * @returns The supplier product mapping object or null if not found
   */
  static async findById(
    id: string,
    trx?: Knex.Transaction
  ): Promise<SupplierProductMapping | null> {
    const connection = trx || db;
    const result = await connection('supplier_product_mapping')
      .select(
        'id',
        'supplier_id as supplierId',
        'operator_product_id as operatorProductId',
        'supplier_product_code as supplierProductCode',
        'supplier_price as supplierPrice',
        'min_order_amount as minOrderAmount',
        'max_order_amount as maxOrderAmount',
        'lead_time_seconds as leadTimeSeconds',
        'is_active as isActive',
        'created_at as createdAt'
      )
      .where({ id })
      .first();

    return result || null;
  }

  /**
   * Retrieves all supplier product mappings for an operator product
   * @param operatorProductId The operator product ID to filter by
   * @param trx Optional Knex transaction
   * @returns List of supplier product mappings
   */
  static async findByOperatorProduct(
    operatorProductId: string,
    trx?: Knex.Transaction
  ): Promise<SupplierProductMapping[]> {
    const connection = trx || db;
    const results = await connection('supplier_product_mapping')
      .select(
        'id',
        'supplier_id as supplierId',
        'operator_product_id as operatorProductId',
        'supplier_product_code as supplierProductCode',
        'supplier_price as supplierPrice',
        'min_order_amount as minOrderAmount',
        'max_order_amount as maxOrderAmount',
        'lead_time_seconds as leadTimeSeconds',
        'is_active as isActive',
        'created_at as createdAt'
      )
      .where({ operator_product_id: operatorProductId })
      .orderBy('supplier_price');

    return results.map(result => ({
      id: result.id,
      supplierId: result.supplierId,
      operatorProductId: result.operatorProductId,
      supplierProductCode: result.supplierProductCode,
      supplierPrice: result.supplierPrice,
      minOrderAmount: result.minOrderAmount,
      maxOrderAmount: result.maxOrderAmount,
      leadTimeSeconds: result.leadTimeSeconds,
      isActive: result.isActive,
      createdAt: result.createdAt,
    }));
  }

  /**
   * Retrieves all supplier product mappings with optional filters
   * @returns List of supplier product mappings
   */
  static async findAll(
    supplierId?: string,
    operatorProductId?: string,
    trx?: Knex.Transaction
  ): Promise<SupplierProductMapping[]> {
    const connection = trx || db;
    let query = connection('supplier_product_mapping')
      .select(
        'id',
        'supplier_id as supplierId',
        'operator_product_id as operatorProductId',
        'supplier_product_code as supplierProductCode',
        'supplier_price as supplierPrice',
        'min_order_amount as minOrderAmount',
        'max_order_amount as maxOrderAmount',
        'lead_time_seconds as leadTimeSeconds',
        'is_active as isActive',
        'created_at as createdAt'
      )
      .orderBy('created_at', 'desc');

    if (supplierId) {
      query = query.where({ supplier_id: supplierId });
    }

    if (operatorProductId) {
      query = query.where({ operator_product_id: operatorProductId });
    }

    const results = await query;

    return results.map(result => ({
      id: result.id,
      supplierId: result.supplierId,
      operatorProductId: result.operatorProductId,
      supplierProductCode: result.supplierProductCode,
      supplierPrice: result.supplierPrice,
      minOrderAmount: result.minOrderAmount,
      maxOrderAmount: result.maxOrderAmount,
      leadTimeSeconds: result.leadTimeSeconds,
      isActive: result.isActive,
      createdAt: result.createdAt,
    }));
  }

  /**
   * Creates a new supplier product mapping
   * @param mappingData The mapping data to create
   * @returns The created supplier product mapping
   */
  static async create(
    mappingData: CreateSupplierProductMappingData,
    trx?: Knex.Transaction
  ): Promise<SupplierProductMapping> {
    const connection = trx || db;
    const [result] = await connection('supplier_product_mapping')
      .insert({
        supplier_id: mappingData.supplierId,
        operator_product_id: mappingData.operatorProductId,
        supplier_product_code: mappingData.supplierProductCode,
        supplier_price: mappingData.supplierPrice,
        min_order_amount: mappingData.minOrderAmount,
        max_order_amount: mappingData.maxOrderAmount,
        lead_time_seconds: mappingData.leadTimeSeconds,
        is_active:
          mappingData.isActive !== undefined ? mappingData.isActive : true,
      })
      .returning('*');

    return {
      id: result.id,
      supplierId: result.supplier_id,
      operatorProductId: result.operator_product_id,
      supplierProductCode: result.supplier_product_code,
      supplierPrice: result.supplier_price,
      minOrderAmount: result.min_order_amount,
      maxOrderAmount: result.max_order_amount,
      leadTimeSeconds: result.lead_time_seconds,
      isActive: result.is_active,
      createdAt: result.created_at,
    };
  }

  /**
   * Updates a supplier product mapping
   * @param id The supplier product mapping ID to update
   * @param mappingData The data to update
   * @returns The updated supplier product mapping
   */
  static async update(
    id: string,
    mappingData: UpdateSupplierProductMappingData,
    trx?: Knex.Transaction
  ): Promise<SupplierProductMapping> {
    const connection = trx || db;
    const [result] = await connection('supplier_product_mapping')
      .where({ id })
      .update({
        supplier_product_code: mappingData.supplierProductCode,
        supplier_price: mappingData.supplierPrice,
        min_order_amount: mappingData.minOrderAmount,
        max_order_amount: mappingData.maxOrderAmount,
        lead_time_seconds: mappingData.leadTimeSeconds,
        is_active: mappingData.isActive,
        updated_at: db.fn.now(),
      })
      .returning('*');

    return {
      id: result.id,
      supplierId: result.supplier_id,
      operatorProductId: result.operator_product_id,
      supplierProductCode: result.supplier_product_code,
      supplierPrice: result.supplier_price,
      minOrderAmount: result.min_order_amount,
      maxOrderAmount: result.max_order_amount,
      leadTimeSeconds: result.lead_time_seconds,
      isActive: result.is_active,
      createdAt: result.created_at,
    };
  }

  /**
   * Deletes a supplier product mapping
   * @param id The supplier product mapping ID to delete
   * @returns True if deleted, false if not found
   */
  static async delete(id: string, trx?: Knex.Transaction): Promise<boolean> {
    const connection = trx || db;
    const deletedCount = await connection('supplier_product_mapping')
      .where({ id })
      .del();

    return deletedCount > 0;
  }
}
