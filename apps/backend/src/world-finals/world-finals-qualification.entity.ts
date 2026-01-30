import { Entity, PrimaryKey, Property, ManyToOne, Unique } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Season } from '../seasons/seasons.entity';
import { Profile } from '../profiles/profiles.entity';

@Entity({ tableName: 'world_finals_qualifications', schema: 'public' })
@Unique({ properties: ['season', 'mecaId', 'competitionClass'] })
export class WorldFinalsQualification {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Season, { fieldName: 'season_id' })
  season!: Season;

  @Property({ type: 'integer', fieldName: 'meca_id', serializedName: 'meca_id' })
  mecaId!: number;

  @Property({ type: 'text', fieldName: 'competitor_name', serializedName: 'competitor_name' })
  competitorName!: string;

  @Property({ type: 'text', fieldName: 'competition_class', serializedName: 'competition_class' })
  competitionClass!: string;

  @ManyToOne(() => Profile, { fieldName: 'user_id', nullable: true })
  user?: Profile;

  @Property({ type: 'integer', fieldName: 'total_points', serializedName: 'total_points', default: 0 })
  totalPoints: number = 0;

  @Property({ type: 'timestamptz', fieldName: 'qualified_at', serializedName: 'qualified_at' })
  qualifiedAt: Date = new Date();

  @Property({ type: 'boolean', fieldName: 'notification_sent', serializedName: 'notification_sent', default: false })
  notificationSent: boolean = false;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'notification_sent_at', serializedName: 'notification_sent_at' })
  notificationSentAt?: Date;

  @Property({ type: 'boolean', fieldName: 'email_sent', serializedName: 'email_sent', default: false })
  emailSent: boolean = false;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'email_sent_at', serializedName: 'email_sent_at' })
  emailSentAt?: Date;

  @Property({ type: 'boolean', fieldName: 'invitation_sent', serializedName: 'invitation_sent', default: false })
  invitationSent: boolean = false;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'invitation_sent_at', serializedName: 'invitation_sent_at' })
  invitationSentAt?: Date;

  @Property({ type: 'text', nullable: true, fieldName: 'invitation_token', serializedName: 'invitation_token' })
  invitationToken?: string;

  @Property({ type: 'boolean', fieldName: 'invitation_redeemed', serializedName: 'invitation_redeemed', default: false })
  invitationRedeemed: boolean = false;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'invitation_redeemed_at', serializedName: 'invitation_redeemed_at' })
  invitationRedeemedAt?: Date;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at', serializedName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at', serializedName: 'updated_at' })
  updatedAt: Date = new Date();
}
