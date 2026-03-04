const { defineConfig } = require('@mikro-orm/core');
const { PostgreSqlDriver } = require('@mikro-orm/postgresql');
const { Migrator } = require('@mikro-orm/migrations');
const { SeedManager } = require('@mikro-orm/seeder');

module.exports = defineConfig({
  driver: PostgreSqlDriver,
  clientUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
  entities: ['./dist/**/*.entity.js'],
  entitiesTs: ['./src/**/*.entity.ts'],
  debug: process.env.NODE_ENV === 'development',
  extensions: [Migrator, SeedManager],
  migrations: {
    tableName: 'mikro_orm_migrations',
    path: './dist/migrations',
    pathTs: './src/migrations',
    glob: '!(*.d).{js,ts}',
    transactional: true,
    disableForeignKeys: false,
    allOrNothing: true,
    dropTables: false,
    safe: true,
    snapshot: true,
    emit: 'ts',
  },
  seeder: {
    path: './dist/seeders',
    pathTs: './src/seeders',
    defaultSeeder: 'DatabaseSeeder',
    glob: '!(*.d).{js,ts}',
    emit: 'ts',
  },
  schemaGenerator: {
    disableForeignKeys: false,
    createForeignKeyConstraints: true,
  },
  pool: {
    min: 2,
    max: 10,
  },
});
