import { Entity, PrimaryKey, Property, ManyToOne, Enum } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { VotingAnswerType } from '@newmeca/shared';
import { VotingCategory } from './voting-category.entity';

@Entity({ tableName: 'voting_questions', schema: 'public' })
export class VotingQuestion {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => VotingCategory, { fieldName: 'category_id' })
  category!: VotingCategory;

  @Property({ type: 'text' })
  title!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'image_url' })
  imageUrl?: string;

  @Enum(() => VotingAnswerType)
  @Property({ fieldName: 'answer_type' })
  answerType!: VotingAnswerType;

  @Property({ type: 'integer', fieldName: 'display_order', default: 0 })
  displayOrder: number = 0;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at' })
  updatedAt: Date = new Date();
}
