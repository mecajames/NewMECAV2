import { Entity, PrimaryKey, Property, Enum, ManyToOne, OneToMany, Collection } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { VotingSessionStatus } from '@newmeca/shared';
import { Season } from '../../seasons/seasons.entity';
import { VotingCategory } from './voting-category.entity';

@Entity({ tableName: 'voting_sessions', schema: 'public' })
export class VotingSession {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Season, { fieldName: 'season_id' })
  season!: Season;

  @Property({ type: 'text' })
  title!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'timestamptz', fieldName: 'start_date' })
  startDate!: Date;

  @Property({ type: 'timestamptz', fieldName: 'end_date' })
  endDate!: Date;

  @Enum(() => VotingSessionStatus)
  @Property({ fieldName: 'status' })
  status: VotingSessionStatus = VotingSessionStatus.DRAFT;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'results_finalized_at' })
  resultsFinalizedAt?: Date;

  @OneToMany(() => VotingCategory, cat => cat.session)
  categories = new Collection<VotingCategory>(this);

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at' })
  updatedAt: Date = new Date();
}
