import { Entity, PrimaryKey, Property, ManyToOne, Index } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Profile } from '../profiles/profiles.entity';
import { HallOfFameInductee } from './hall-of-fame.entity';

@Entity({ tableName: 'hall_of_fame_comments', schema: 'public' })
@Index({ properties: ['inductee', 'createdAt'] })
export class HallOfFameComment {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => HallOfFameInductee, { fieldName: 'inductee_id' })
  inductee!: HallOfFameInductee;

  @ManyToOne(() => Profile, { fieldName: 'user_id' })
  user!: Profile;

  @Property({ type: 'text' })
  body!: string;

  @Property({ type: 'boolean', fieldName: 'is_hidden', serializedName: 'is_hidden' })
  isHidden: boolean = false;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at', serializedName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ type: 'timestamptz', onUpdate: () => new Date(), fieldName: 'updated_at', serializedName: 'updated_at', nullable: true })
  updatedAt?: Date;
}
