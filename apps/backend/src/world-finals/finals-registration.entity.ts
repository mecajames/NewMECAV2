import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Profile } from '../profiles/profiles.entity';
import { Season } from '../seasons/seasons.entity';

@Entity({ tableName: 'finals_registrations', schema: 'public' })
export class FinalsRegistration {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Profile, { fieldName: 'user_id', nullable: true })
  user?: Profile;

  @ManyToOne(() => Season, { fieldName: 'season_id', nullable: true })
  season?: Season;

  @Property({ type: 'varchar', nullable: true })
  division?: string;

  @Property({ type: 'varchar', nullable: true, fieldName: 'competition_class', serializedName: 'competition_class' })
  competitionClass?: string;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'registered_at', serializedName: 'registered_at' })
  registeredAt?: Date;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'created_at', serializedName: 'created_at', onCreate: () => new Date() })
  createdAt?: Date = new Date();

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'updated_at', serializedName: 'updated_at', onUpdate: () => new Date() })
  updatedAt?: Date = new Date();
}
