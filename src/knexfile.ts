// knexfile.ts
import type { Knex } from 'knex';
import { config } from './config/env';

const knexConfig: { [key: string]: Knex.Config } = {
  development: {
    client: 'pg',
    connection: config.database.url,
    migrations: {
      directory: '../migrations',
      extension: 'ts',
    },
    seeds: {
      directory: './seeds',
    },
  },

  test: {
    client: 'pg',
    connection: config.database.url,
    migrations: {
      directory: '../migrations',
      extension: 'ts',
    },
  },

  production: {
    client: 'pg',
    connection: config.database.url,
    migrations: {
      directory: '../migrations',
      extension: 'ts',
    },
  },
};

export default knexConfig;
