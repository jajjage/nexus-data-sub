import db from '../database/connection';

/**
 * Helper to create a JSONB raw binding for Knex inserts/updates.
 * Centralises the db.raw('?::jsonb', [JSON.stringify(...)]) pattern so callers
 * can be DB-agnostic and tests/consumers are clearer.
 */
export function jsonb(value: any) {
  return db.raw('?::jsonb', [JSON.stringify(value)]);
}

export default { jsonb };
