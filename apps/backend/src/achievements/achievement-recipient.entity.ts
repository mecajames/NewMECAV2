import { Entity, PrimaryKey, Property, ManyToOne, Unique } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { AchievementDefinition } from './achievement-definition.entity';
import { Profile } from '../profiles/profiles.entity';
import { CompetitionResult } from '../competition-results/competition-results.entity';
import { Event } from '../events/events.entity';
import { Season } from '../seasons/seasons.entity';

@Entity({ tableName: 'achievement_recipients', schema: 'public' })
@Unique({ properties: ['achievement', 'profile'] })
export class AchievementRecipient {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => AchievementDefinition, { fieldName: 'achievement_id' })
  achievement!: AchievementDefinition;

  @ManyToOne(() => Profile, { fieldName: 'profile_id' })
  profile!: Profile;

  @Property({ type: 'varchar', length: 50, nullable: true, fieldName: 'meca_id', serializedName: 'meca_id' })
  mecaId?: string;

  @Property({ type: 'decimal', precision: 10, scale: 2, fieldName: 'achieved_value', serializedName: 'achieved_value' })
  achievedValue!: number;

  @Property({ type: 'timestamptz', fieldName: 'achieved_at', serializedName: 'achieved_at' })
  achievedAt: Date = new Date();

  @ManyToOne(() => CompetitionResult, { fieldName: 'competition_result_id', nullable: true })
  competitionResult?: CompetitionResult;

  @ManyToOne(() => Event, { fieldName: 'event_id', nullable: true })
  event?: Event;

  @ManyToOne(() => Season, { fieldName: 'season_id', nullable: true })
  season?: Season;

  @Property({ type: 'varchar', length: 500, nullable: true, fieldName: 'image_url', serializedName: 'image_url' })
  imageUrl?: string;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'image_generated_at', serializedName: 'image_generated_at' })
  imageGeneratedAt?: Date;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at', serializedName: 'created_at' })
  createdAt: Date = new Date();
}
