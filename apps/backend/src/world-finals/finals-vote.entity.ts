import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Profile } from '../profiles/profiles.entity';

@Entity({ tableName: 'finals_votes', schema: 'public' })
export class FinalsVote {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Profile, { fieldName: 'voter_id', nullable: true })
  voter?: Profile;

  @Property({ type: 'varchar' })
  category!: string;

  @Property({ type: 'text', fieldName: 'vote_value', serializedName: 'vote_value' })
  voteValue!: string;

  @Property({ type: 'jsonb', nullable: true })
  details?: Record<string, unknown>;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'created_at', serializedName: 'created_at', onCreate: () => new Date() })
  createdAt?: Date = new Date();
}
