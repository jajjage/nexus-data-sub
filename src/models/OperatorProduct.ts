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
        'slug',
        'created_at as createdAt'
      )
      .where({ id })
      .first();

    return result || null;
  }

  /**
   * Retrieves public operator products with filters and pagination.
   * Includes active supplier offers for each product.
   */
  static async findPublic(filters?: {
    operatorId?: string;
    productType?: string;
    isActive?: boolean;
    q?: string;
    page?: number;
    perPage?: number;
  }) {
    const page = filters?.page && filters.page > 0 ? filters.page : 1;
    const perPage =
      filters?.perPage && filters.perPage > 0 ? filters.perPage : 50;

    const baseQuery = db('operator_products')
      .leftJoin('operators', 'operator_products.operator_id', 'operators.id')
      .where(function () {
        if (filters?.operatorId) {
          this.where({ 'operator_products.operator_id': filters.operatorId });
        }
        if (filters?.productType) {
          this.where({ 'operator_products.product_type': filters.productType });
        }
        if (typeof filters?.isActive === 'boolean') {
          this.where({ 'operator_products.is_active': filters.isActive });
        }
        if (filters?.q) {
          const q = `%${filters.q}%`;
          this.where(function (this: any) {
            this.where('operator_products.name', 'ilike', q).orWhere(
              'operator_products.product_code',
              'ilike',
              q
            );
          });
        }
      });

    // count
    const countResult = await baseQuery
      .clone()
      .clearSelect()
      .count('operator_products.id as total');
    const total = Number((countResult && (countResult as any)[0]?.total) || 0);

    const offset = (page - 1) * perPage;

    const rows = await baseQuery
      .clone()
      .select(
        'operator_products.id',
        'operator_products.operator_id as operatorId',
        'operator_products.product_code as productCode',
        'operator_products.name',
        'operator_products.product_type as productType',
        'operator_products.denom_amount as denomAmount',
        'operator_products.data_mb as dataMb',
        'operator_products.validity_days as validityDays',
        'operator_products.is_active as isActive',
        'operator_products.metadata',
        'operator_products.created_at',
        // Operator details
        'operators.name as operatorName',
        'operators.code as operatorCode',
        'operators.iso_country as operatorCountryISO',
        'operators.logo_url as operatorLogoUrl'
      )
      .orderBy('operator_products.name')
      .limit(perPage)
      .offset(offset);

    const products = rows.map((result: any) => ({
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
      slug: result.slug,
      createdAt: result.created_at,
      // Operator data
      operator: result.operatorName
        ? {
            name: result.operatorName,
            code: result.operatorScode,
            countryCode: result.operatorCountryISO,
            logoUrl: result.operatorLogoUrl,
          }
        : null,
    }));

    // Fetch supplier offers for these products (only active suppliers and active mappings)
    const productIds = products.map(p => p.id).filter(Boolean);
    let offersByProduct: Record<string, any[]> = {};
    if (productIds.length > 0) {
      const offers = await db('supplier_product_mapping as spm')
        .join('suppliers as s', 'spm.supplier_id', 's.id')
        .select(
          'spm.id as mappingId',
          'spm.operator_product_id as operatorProductId',
          'spm.supplier_product_code as supplierProductCode',
          'spm.supplier_price as supplierPrice',
          'spm.lead_time_seconds as leadTimeSeconds',
          's.id as supplierId',
          's.name as supplierName',
          's.slug as supplierSlug'
        )
        .whereIn('spm.operator_product_id', productIds)
        .andWhere('spm.is_active', true)
        .andWhere('s.is_active', true);

      offersByProduct = offers.reduce(
        (acc: any, row: any) => {
          const key = row.operatorProductId;
          if (!acc[key]) acc[key] = [];
          acc[key].push({
            mappingId: row.mappingId,
            supplierId: row.supplierId,
            supplierName: row.supplierName,
            supplierSlug: row.supplierSlug,
            supplierProductCode: row.supplierProductCode,
            supplierPrice: row.supplierPrice,
            leadTimeSeconds: row.leadTimeSeconds,
          });
          return acc;
        },
        {} as Record<string, any[]>
      );
    }

    // Sanitize metadata using an allowlist
    const allowedMeta = new Set([
      'shortDescription',
      'short_description',
      'iconUrl',
      'icon_url',
      'displayName',
      'display_name',
      'image',
      'icon',
    ]);

    const sanitize = (meta: any) => {
      if (!meta || typeof meta !== 'object') return {};
      const out: Record<string, any> = {};
      for (const k of Object.keys(meta)) {
        if (allowedMeta.has(k)) out[k] = meta[k];
      }
      return out;
    };

    // Attach offers and sanitized metadata
    const finalProducts = products.map(p => ({
      ...p,
      metadata: sanitize(p.metadata),
      supplierOffers: offersByProduct[p.id] || [],
    }));

    return {
      products: finalProducts,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    };
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
        'slug',
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
        slug: productData.slug || null,
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
        slug: productData.slug,
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
      slug: result.slug,
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
