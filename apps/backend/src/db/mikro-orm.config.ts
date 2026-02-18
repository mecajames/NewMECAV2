import { defineConfig, LoadStrategy, LoggerNamespace } from '@mikro-orm/core';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { Migrator } from '@mikro-orm/migrations';
import { SeedManager } from '@mikro-orm/seeder';

// Custom logger to abbreviate long SQL queries
const abbreviateQuery = (message: string): string => {
  // Extract the SQL part after [query] prefix if present
  const queryMatch = message.match(/^\[query\]\s*(.+)$/);
  const sql = queryMatch ? queryMatch[1] : message;

  // Abbreviate long SELECT column lists (match greedy to get all columns before FROM)
  const selectMatch = sql.match(/^(select\s+)(.+)(\s+from\s+"[^"]+".+)$/i);
  if (selectMatch && selectMatch[2].length > 80) {
    const columnsPart = selectMatch[2];
    const columns = columnsPart.split(',');
    if (columns.length > 3) {
      // Get table name from first column alias (e.g., "c0" from "c0"."id")
      const tableMatch = columns[0].match(/"(\w+)"\./);
      const tableName = tableMatch ? tableMatch[1] : 'table';
      return `select ${tableName}.* (${columns.length} cols)${selectMatch[3]}`;
    }
  }
  return sql;
};

export default defineConfig({
  driver: PostgreSqlDriver,
  clientUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54622/postgres',
  entities: ['./dist/**/*.entity.js'],
  entitiesTs: ['./src/**/*.entity.ts'],
  debug: process.env.NODE_ENV === 'development' ? ['query'] as LoggerNamespace[] : false,
  logger: (message: string) => {
    // Abbreviate long queries in log output
    const abbreviated = abbreviateQuery(message);
    console.log(abbreviated);
  },
  loadStrategy: LoadStrategy.SELECT_IN,
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
