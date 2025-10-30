import { Module, Global } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/core';
import mikroOrmConfig from './mikro-orm.config';

@Global()
@Module({
  providers: [
    {
      provide: MikroORM,
      useFactory: async () => {
        const orm = await MikroORM.init(mikroOrmConfig);
        return orm;
      },
    },
    {
      provide: 'EntityManager',
      useFactory: (orm: MikroORM) => orm.em,
      inject: [MikroORM],
    },
  ],
  exports: [MikroORM, 'EntityManager'],
})
export class DatabaseModule {}
