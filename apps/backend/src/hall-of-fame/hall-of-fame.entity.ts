import { Entity, PrimaryKey, Property, ManyToOne, Index, Unique } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Profile } from '../profiles/profiles.entity';

@Entity({ tableName: 'hall_of_fame_inductees', schema: 'public' })
@Unique({ properties: ['category', 'inductionYear', 'name'] })
@Index({ properties: ['category', 'inductionYear'] })
export class HallOfFameInductee {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'text' })
  category!: string;

  @Property({ type: 'integer', fieldName: 'induction_year', serializedName: 'induction_year' })
  inductionYear!: number;

  @Property({ type: 'text' })
  name!: string;

  @Property({ type: 'text', nullable: true })
  state?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'team_affiliation', serializedName: 'team_affiliation' })
  teamAffiliation?: string;

  @Property({ type: 'text', nullable: true })
  location?: string;

  @Property({ type: 'text', nullable: true })
  bio?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'image_url', serializedName: 'image_url' })
  imageUrl?: string;

  @Property({ type: 'uuid', fieldName: 'created_by', serializedName: 'created_by', nullable: true, persist: false })
  createdBy?: string;

  @ManyToOne(() => Profile, { fieldName: 'created_by', nullable: true, hidden: true })
  creator?: Profile;

  @Property({ type: 'uuid', fieldName: 'updated_by', serializedName: 'updated_by', nullable: true, persist: false })
  updatedBy?: string;

  @ManyToOne(() => Profile, { fieldName: 'updated_by', nullable: true, hidden: true })
  updater?: Profile;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at', serializedName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ type: 'timestamptz', onUpdate: () => new Date(), fieldName: 'updated_at', serializedName: 'updated_at', nullable: true })
  updatedAt?: Date;
}
