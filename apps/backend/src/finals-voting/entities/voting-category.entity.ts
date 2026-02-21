import { Entity, PrimaryKey, Property, ManyToOne, OneToMany, Collection } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { VotingSession } from './voting-session.entity';
import { VotingQuestion } from './voting-question.entity';

@Entity({ tableName: 'voting_categories', schema: 'public' })
export class VotingCategory {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => VotingSession, { fieldName: 'session_id' })
  session!: VotingSession;

  @Property({ type: 'text' })
  name!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'integer', fieldName: 'display_order', default: 0 })
  displayOrder: number = 0;

  @OneToMany(() => VotingQuestion, question => question.category)
  questions = new Collection<VotingQuestion>(this);

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at' })
  updatedAt: Date = new Date();
}
