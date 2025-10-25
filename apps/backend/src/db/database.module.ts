import { Global, Module } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/core';
import type { EntityManager } from '@mikro-orm/core';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import mikroOrmConfig from './mikro-orm.config';

/**
 * Injection token for EntityManager
 */
export const ENTITY_MANAGER = Symbol('ENTITY_MANAGER');

/**
 * Global DatabaseModule that provides MikroORM and EntityManager
 * to all other modules via dependency injection.
 *
 * Usage in services:
 * constructor(@Inject(ENTITY_MANAGER) private readonly em: EntityManager) {}
 */
@Global()
@Module({
  providers: [
    {
      provide: MikroORM,
      useFactory: async () => {
        const orm = await MikroORM.init<PostgreSqlDriver>(mikroOrmConfig);
        console.log('✅ MikroORM initialized successfully');
        return orm;
      },
    },
    {
      provide: ENTITY_MANAGER,
      useFactory: (orm: MikroORM<PostgreSqlDriver>): EntityManager => {
        // Return the base EntityManager (MikroORM handles identity map internally)
        return orm.em;
      },
      inject: [MikroORM],
    },
  ],
  exports: [MikroORM, ENTITY_MANAGER],
})
export class DatabaseModule {}
