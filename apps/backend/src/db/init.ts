import { MikroORM } from '@mikro-orm/core';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import mikroOrmConfig from './mikro-orm.config';

let orm: MikroORM<PostgreSqlDriver> | null = null;

export async function initializeDatabase() {
  if (orm) {
    return orm;
  }

  orm = await MikroORM.init(mikroOrmConfig);
  
  // Don't sync schema - we use Supabase migrations instead
  // If you need to sync schema for testing:
  // const schemaGenerator = orm.getSchemaGenerator();
  // await schemaGenerator.updateSchema({ safe: true });

  return orm;
}

export function getORM() {
  if (!orm) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return orm;
}

export function getEntityManager() {
  return getORM().em.fork();
}
