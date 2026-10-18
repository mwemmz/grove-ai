import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../../src/server/db/schema';

export type Db = typeof db;
export type DbUser = schema.User;

const globalForDb = globalThis as unknown as { dbPool?: Pool };

function createPool(): Pool {
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error('POSTGRES_URL is not set');
  }
  return new Pool({
    connectionString,
    max: 1,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}

const pool = globalForDb.dbPool ?? createPool();
globalForDb.dbPool = pool;

export const db = drizzle({ client: pool, schema });
