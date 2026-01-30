import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Membership } from '../memberships/memberships.entity';

// Team member roles:
// - owner: Full control, manages billing, can delete team (only one per team)
// - co_owner: Same as owner but cannot manage billing or delete team
// - moderator: Can add/remove members, but cannot change roles
// - member: Basic member, no management privileges
export type TeamMemberRole = 'owner' | 'co_owner' | 'moderator' | 'member';

// Team member status:
// - active: Full active member
// - pending_approval: User requested to join, waiting for owner/co-owner approval
// - pending_invite: Owner/co-owner invited user, waiting for user to accept
// - pending_renewal: Member's MECA membership expired, hidden until they renew
// - inactive: Manually deactivated or removed
export type TeamMemberStatus = 'active' | 'pending_approval' | 'pending_invite' | 'pending_renewal' | 'inactive';

@Entity({ tableName: 'team_members', schema: 'public' })
export class TeamMember {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'uuid', fieldName: 'team_id' })
  teamId!: string;

  @Property({ type: 'uuid', fieldName: 'user_id' })
  userId!: string;

  // The membership this team member is registered with (for MECA ID tracking)
  @ManyToOne(() => Membership, { nullable: true, fieldName: 'membership_id' })
  membership?: Membership;

  @Property({ type: 'text', default: 'member' })
  role: TeamMemberRole = 'member';

  // Member status within the team
  @Property({ type: 'text', default: 'active' })
  status: TeamMemberStatus = 'active';

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'joined_at' })
  joinedAt?: Date;

  // When the invite/request was sent (for pending statuses)
  @Property({ type: 'timestamptz', nullable: true, fieldName: 'requested_at' })
  requestedAt?: Date;

  // Optional message with join request or invite
  @Property({ type: 'text', nullable: true, fieldName: 'request_message' })
  requestMessage?: string;
}
