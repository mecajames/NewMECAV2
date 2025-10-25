import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { Profile } from '../profiles/profiles.entity';

@Entity({ tableName: 'teams', schema: 'public' })
export class Team {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ type: 'text' })
  name!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'text', nullable: true })
  logoUrl?: string;

  @ManyToOne(() => Profile, { fieldName: 'owner_id' })
  owner!: Profile;

  @Property({ type: 'timestamptz' })
  createdAt: Date = new Date();

  @Property({ type: 'timestamptz', onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}

@Entity({ tableName: 'team_members', schema: 'public' })
export class TeamMember {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @ManyToOne(() => Team, { fieldName: 'team_id' })
  team!: Team;

  @ManyToOne(() => Profile, { fieldName: 'member_id' })
  member!: Profile;

  @Property({ type: 'text', default: 'member' })
  role: string = 'member';

  @Property({ type: 'timestamptz' })
  joinedAt: Date = new Date();
}
