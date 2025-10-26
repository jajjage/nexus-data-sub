import knex from 'knex';
import knexConfig from '../knexfile';
import { logger } from '../utils/logger.utils';

const environment = process.env.NODE_ENV || 'development';
const db = knex(knexConfig[environment]);

export const testConnection = async () => {
  try {
    await db.raw('SELECT NOW()');
    logger.info('Database connection successful.');
  } catch (err) {
    logger.error('Database connection error:', err);
    process.exit(1);
  }
};

export const close = async () => {
  await db.destroy();
};

export default db;
