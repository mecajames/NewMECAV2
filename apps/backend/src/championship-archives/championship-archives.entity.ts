import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Season } from '../seasons/seasons.entity';
import { Event } from '../events/events.entity';

@Entity({ tableName: 'championship_archives', schema: 'public' })
export class ChampionshipArchive {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Season, { nullable: false, fieldName: 'season_id', serializedName: 'season_id' })
  season!: Season;

  @Property({ type: 'integer' })
  year!: number;

  @Property({ type: 'text' })
  title!: string;

  @Property({ type: 'text', nullable: true, fieldName: 'hero_image_url', serializedName: 'hero_image_url' })
  heroImageUrl?: string;

  @ManyToOne(() => Event, { nullable: true, fieldName: 'world_finals_event_id', serializedName: 'world_finals_event_id' })
  worldFinalsEvent?: Event;

  @Property({ type: 'boolean', default: false })
  published: boolean = false;

  @Property({ type: 'json', nullable: true, fieldName: 'special_awards_content', serializedName: 'special_awards_content' })
  specialAwardsContent?: any;

  @Property({ type: 'json', nullable: true, fieldName: 'club_awards_content', serializedName: 'club_awards_content' })
  clubAwardsContent?: any;

  @Property({ type: 'json', nullable: true, fieldName: 'additional_content', serializedName: 'additional_content' })
  additionalContent?: any;

  @Property({ onCreate: () => new Date(), serializedName: 'created_at', fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), serializedName: 'updated_at', fieldName: 'updated_at' })
  updatedAt: Date = new Date();
}
