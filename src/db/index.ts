import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Create the connection
const client = postgres(connectionString, {
  ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
});

// Create the database instance
export const db = drizzle(client, { schema });

export * from './schema.js';