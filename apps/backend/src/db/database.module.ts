import { Module, Global } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { EntityManager } from '@mikro-orm/postgresql';
import mikroOrmConfig from './mikro-orm.config';

@Global()
@Module({
  imports: [MikroOrmModule.forRoot(mikroOrmConfig)],
  providers: [
    // Provide EntityManager with string token for legacy services that use @Inject('EntityManager')
    {
      provide: 'EntityManager',
      useExisting: EntityManager,
    },
  ],
  exports: ['EntityManager'],
})
export class DatabaseModule {}
