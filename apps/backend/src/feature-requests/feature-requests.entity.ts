import { Entity, PrimaryKey, Property, ManyToOne, Enum, Index, Unique } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { FeatureRequestStatus, FeatureRequestVote, FeatureRequestCategory } from '@newmeca/shared';
import { Profile } from '../profiles/profiles.entity';

@Entity({ tableName: 'feature_requests', schema: 'public' })
export class FeatureRequest {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Profile, { fieldName: 'user_id' })
  user!: Profile;

  @Property({ type: 'text' })
  title!: string;

  @Property({ type: 'text' })
  description!: string;

  @Index()
  @Enum({ items: () => FeatureRequestStatus, type: 'string' })
  status: FeatureRequestStatus = FeatureRequestStatus.GATHERING_INTEREST;

  @Index()
  @Enum({ items: () => FeatureRequestCategory, type: 'string' })
  category: FeatureRequestCategory = FeatureRequestCategory.WEBSITE;

  // Support ticket this idea was converted from (admin conversion flow).
  @Property({ type: 'uuid', fieldName: 'source_ticket_id', serializedName: 'source_ticket_id', nullable: true })
  sourceTicketId?: string;

  // NEEDS_DETAILS drafts: the member must complete the idea by this instant
  // (site_setting feature_request_details_deadline_days; default 72h)...
  @Property({ type: 'timestamptz', fieldName: 'details_deadline_at', serializedName: 'details_deadline_at', nullable: true })
  detailsDeadlineAt?: Date;

  // ...and they get exactly ONE edit-and-submit to do it.
  @Property({ type: 'boolean', fieldName: 'revision_used', serializedName: 'revision_used', default: false })
  revisionUsed: boolean = false;

  // End of the 3-month community voting window (countdown shown to members).
  @Property({ type: 'timestamptz', fieldName: 'voting_ends_at', serializedName: 'voting_ends_at' })
  votingEndsAt!: Date;

  // Interest bar as % of ACTIVE members — HIDDEN from members, admin-tunable.
  @Property({ type: 'decimal', fieldName: 'threshold_pct', hidden: true })
  thresholdPct: string = '10';

  @ManyToOne(() => FeatureRequest, { fieldName: 'resubmitted_from_id', nullable: true, hidden: true })
  resubmittedFrom?: FeatureRequest;

  // Free text: a date ("Sept 2026"), a version ("v2.4"), or a time frame
  // ("next quarter", "within 6 months").
  @Property({ type: 'text', fieldName: 'planned_release', serializedName: 'planned_release', nullable: true })
  plannedRelease?: string;

  @Property({ type: 'text', fieldName: 'admin_note_public', serializedName: 'admin_note_public', nullable: true })
  adminNotePublic?: string;

  // Declines are private by default; when false a declined request is hidden
  // from member-facing lists (the submitter still sees their own).
  @Property({ type: 'boolean', fieldName: 'decline_public', serializedName: 'decline_public', default: false })
  declinePublic: boolean = false;

  // Denormalized tallies, recomputed on every vote write.
  @Property({ type: 'integer', default: 0 })
  upvotes: number = 0;

  @Property({ type: 'integer', default: 0 })
  downvotes: number = 0;

  @Property({ type: 'decimal', fieldName: 'avg_rating', serializedName: 'avg_rating', nullable: true })
  avgRating?: string;

  @Property({ type: 'timestamptz', fieldName: 'status_changed_at', serializedName: 'status_changed_at', nullable: true })
  statusChangedAt?: Date;

  @Property({ type: 'uuid', fieldName: 'status_changed_by', nullable: true, hidden: true })
  statusChangedBy?: string;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at', serializedName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onCreate: () => new Date(), onUpdate: () => new Date(), fieldName: 'updated_at', serializedName: 'updated_at' })
  updatedAt: Date = new Date();
}

@Entity({ tableName: 'feature_request_votes', schema: 'public' })
@Unique({ properties: ['request', 'user'] })
export class FeatureRequestVoteEntity {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => FeatureRequest, { fieldName: 'request_id' })
  request!: FeatureRequest;

  @ManyToOne(() => Profile, { fieldName: 'user_id' })
  user!: Profile;

  @Enum({ items: () => FeatureRequestVote, type: 'string' })
  vote!: FeatureRequestVote;

  // 1–10 "how likely are you to use this?" — required with 👍, null with 👎.
  @Property({ type: 'integer', nullable: true })
  rating?: number;

  // Member's comment — ADMIN-EYES-ONLY, never serialized to other members.
  @Property({ type: 'text', nullable: true, hidden: true })
  comment?: string;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at', serializedName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onCreate: () => new Date(), onUpdate: () => new Date(), fieldName: 'updated_at', serializedName: 'updated_at' })
  updatedAt: Date = new Date();
}

@Entity({ tableName: 'feature_request_messages', schema: 'public' })
export class FeatureRequestMessage {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => FeatureRequest, { fieldName: 'request_id' })
  request!: FeatureRequest;

  // Whose private thread this is (the submitter's or a voter's). A member only
  // ever sees their own thread; admins see all.
  @ManyToOne(() => Profile, { fieldName: 'member_user_id' })
  memberUser!: Profile;

  @Property({ type: 'text', fieldName: 'author_role', serializedName: 'author_role' })
  authorRole!: 'admin' | 'member';

  @Property({ type: 'uuid', fieldName: 'author_id', hidden: true })
  authorId!: string;

  @Property({ type: 'text' })
  body!: string;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at', serializedName: 'created_at' })
  createdAt: Date = new Date();
}
