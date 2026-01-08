import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { JudgeApplication } from './judge-application.entity';
import { Profile } from '../profiles/profiles.entity';

@Entity({ tableName: 'judge_application_references', schema: 'public' })
export class JudgeApplicationReference {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => JudgeApplication, { fieldName: 'application_id' })
  application!: JudgeApplication;

  @Property({ type: 'text', fieldName: 'full_name' })
  fullName!: string;

  @Property({ type: 'text', nullable: true })
  relationship?: string;

  @Property({ type: 'text', nullable: true })
  company?: string;

  @Property({ type: 'text', nullable: true })
  phone?: string;

  @Property({ type: 'text', nullable: true })
  email?: string;

  @Property({ type: 'integer', nullable: true, fieldName: 'years_known' })
  yearsKnown?: number;

  @Property({ type: 'boolean', fieldName: 'reference_checked' })
  referenceChecked: boolean = false;

  @Property({ type: 'text', nullable: true, fieldName: 'reference_notes' })
  referenceNotes?: string;

  @ManyToOne(() => Profile, { nullable: true, fieldName: 'checked_by' })
  checkedBy?: Profile;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'checked_date' })
  checkedDate?: Date;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at' })
  updatedAt: Date = new Date();
}
