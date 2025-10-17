import { Knex } from 'knex';
import db from '../database/connection';
import {
  CreateOperatorData,
  Operator,
  UpdateOperatorData,
} from '../types/operator.types';

export class OperatorModel {
  /**
   * Retrieves an operator by its ID
   * @param id The operator ID
   * @param trx Optional Knex transaction
   * @returns The operator object or null if not found
   */
  static async findById(id: string, trx?: Knex): Promise<Operator | null> {
    const connection = trx || db;
    const result = await connection('operators')
      .select(
        'id',
        'code',
        'name',
        'iso_country as isoCountry',
        'created_at as createdAt'
      )
      .where({ id })
      .first();

    return result || null;
  }

  /**
   * Retrieves all operators
   * @param trx Optional Knex transaction
   * @returns List of all operators
   */
  static async findAll(trx?: Knex): Promise<Operator[]> {
    const connection = trx || db;
    const results = await connection('operators')
      .select(
        'id',
        'code',
        'name',
        'iso_country as isoCountry',
        'created_at as createdAt'
      )
      .orderBy('name');

    return results.map(result => ({
      id: result.id,
      code: result.code,
      name: result.name,
      isoCountry: result.isoCountry,
      createdAt: result.createdAt,
    }));
  }

  /**
   * Creates a new operator
   * @param operatorData The operator data to create
   * @param trx Optional Knex transaction
   * @returns The created operator
   */
  static async create(
    operatorData: CreateOperatorData,
    trx?: Knex
  ): Promise<Operator> {
    const connection = trx || db;
    const [result] = await connection('operators')
      .insert({
        code: operatorData.code,
        name: operatorData.name,
        iso_country: operatorData.isoCountry || 'NG',
      })
      .returning('*');

    return {
      id: result.id,
      code: result.code,
      name: result.name,
      isoCountry: result.iso_country,
      createdAt: result.created_at,
    };
  }

  /**
   * Updates an operator
   * @param id The operator ID to update
   * @param operatorData The data to update
   * @param trx Optional Knex transaction
   * @returns The updated operator
   */
  static async update(
    id: string,
    operatorData: UpdateOperatorData,
    trx?: Knex
  ): Promise<Operator> {
    const connection = trx || db;
    const results = await connection('operators')
      .where({ id })
      .update({
        name: operatorData.name,
        iso_country: operatorData.isoCountry,
        updated_at: db.fn.now(),
      })
      .returning('*');

    if (results.length === 0) {
      throw new Error('Operator not found');
    }

    const result = results[0];
    return {
      id: result.id,
      code: result.code,
      name: result.name,
      isoCountry: result.iso_country,
      createdAt: result.created_at,
    };
  }

  /**
   * Deletes an operator
   * @param id The operator ID to update
   * @param trx Optional Knex transaction
   * @returns True if deleted, false if not found
   */
  static async delete(id: string, trx?: Knex): Promise<boolean> {
    const connection = trx || db;
    const deletedCount = await connection('operators').where({ id }).del();

    return deletedCount > 0;
  }
}
