import { Knex } from 'knex';
import db from '../database/connection';
import {
  CreateSupplierData,
  Supplier,
  UpdateSupplierData,
} from '../types/supplier.types';

export class SupplierModel {
  /**
   * Retrieves a supplier by its ID
   * @param id The supplier ID
   * @param trx Optional Knex transaction
   * @returns The supplier object or null if not found
   */
  static async findById(
    id: string,
    trx?: Knex.Transaction
  ): Promise<Supplier | null> {
    const connection = trx || db;
    const result = await connection('suppliers')
      .select(
        'id',
        'name',
        'slug',
        'api_base as apiBase',
        'api_key as apiKey',
        'priority_int as priorityInt',
        'is_active as isActive',
        'created_at as createdAt'
      )
      .where({ id })
      .first();

    return result || null;
  }

  /**
   * Retrieves all suppliers
   * @param trx Optional Knex transaction
   * @returns List of all suppliers
   */
  static async findAll(trx?: Knex.Transaction): Promise<Supplier[]> {
    const connection = trx || db;
    const results = await connection('suppliers')
      .select(
        'id',
        'name',
        'slug',
        'api_base as apiBase',
        'api_key as apiKey',
        'priority_int as priorityInt',
        'is_active as isActive',
        'created_at as createdAt'
      )
      .orderBy('name');

    return results.map(result => ({
      id: result.id,
      name: result.name,
      slug: result.slug,
      apiBase: result.apiBase,
      apiKey: result.apiKey,
      priorityInt: result.priorityInt,
      isActive: result.isActive,
      createdAt: result.createdAt,
    }));
  }

  /**
   * Creates a new supplier
   * @param supplierData The supplier data to create
   * @param trx Optional Knex transaction
   * @returns The created supplier
   */
  static async create(
    supplierData: CreateSupplierData,
    trx?: Knex.Transaction
  ): Promise<Supplier> {
    const connection = trx || db;
    const [result] = await connection('suppliers')
      .insert({
        name: supplierData.name,
        slug: supplierData.slug,
        api_base: supplierData.apiBase,
        api_key: supplierData.apiKey,
        priority_int: supplierData.priorityInt || 100,
        is_active:
          supplierData.isActive !== undefined ? supplierData.isActive : true,
      })
      .returning('*');

    return {
      id: result.id,
      name: result.name,
      slug: result.slug,
      apiBase: result.api_base,
      apiKey: result.api_key,
      priorityInt: result.priority_int,
      isActive: result.is_active,
      createdAt: result.created_at,
    };
  }

  /**
   * Updates a supplier
   * @param id The supplier ID to update
   * @param supplierData The data to update
   * @param trx Optional Knex transaction
   * @returns The updated supplier
   */
  static async update(
    id: string,
    supplierData: UpdateSupplierData,
    trx?: Knex.Transaction
  ): Promise<Supplier> {
    const connection = trx || db;
    const results = await connection('suppliers')
      .where({ id })
      .update({
        name: supplierData.name,
        api_base: supplierData.apiBase,
        api_key: supplierData.apiKey,
        priority_int: supplierData.priorityInt,
        is_active: supplierData.isActive,
        updated_at: db.fn.now(),
      })
      .returning('*');

    if (results.length === 0) {
      throw new Error('Supplier not found');
    }

    const result = results[0];
    return {
      id: result.id,
      name: result.name,
      slug: result.slug,
      apiBase: result.api_base,
      apiKey: result.api_key,
      priorityInt: result.priority_int,
      isActive: result.is_active,
      createdAt: result.created_at,
    };
  }

  /**
   * Deletes a supplier
   * @param id The supplier ID to delete
   * @param trx Optional Knex transaction
   * @returns True if deleted, false if not found
   */
  static async delete(id: string, trx?: Knex.Transaction): Promise<boolean> {
    const connection = trx || db;
    const deletedCount = await connection('suppliers').where({ id }).del();

    return deletedCount > 0;
  }
}
