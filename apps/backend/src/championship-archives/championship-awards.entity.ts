import { Entity, PrimaryKey, Property, ManyToOne, Enum } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { ChampionshipArchive } from './championship-archives.entity';

export enum AwardSection {
  SPECIAL_AWARDS = 'special_awards',
  CLUB_AWARDS = 'club_awards'
}

@Entity({ tableName: 'championship_awards', schema: 'public' })
export class ChampionshipAward {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => ChampionshipArchive, { nullable: false, fieldName: 'archive_id', serializedName: 'archive_id' })
  archive!: ChampionshipArchive;

  @Enum(() => AwardSection)
  section!: AwardSection;

  @Property({ type: 'text', fieldName: 'award_name', serializedName: 'award_name' })
  awardName!: string;

  @Property({ type: 'text', fieldName: 'recipient_name', serializedName: 'recipient_name' })
  recipientName!: string;

  @Property({ type: 'text', nullable: true, fieldName: 'recipient_team', serializedName: 'recipient_team' })
  recipientTeam?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'recipient_state', serializedName: 'recipient_state' })
  recipientState?: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'integer', default: 0, fieldName: 'display_order', serializedName: 'display_order' })
  displayOrder: number = 0;

  @Property({ onCreate: () => new Date(), serializedName: 'created_at', fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), serializedName: 'updated_at', fieldName: 'updated_at' })
  updatedAt: Date = new Date();
}
