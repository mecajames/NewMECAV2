import { Entity, PrimaryKey, Property, ManyToOne, OneToMany, Collection } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

// Team types for categorization
export enum TeamType {
  COMPETITIVE = 'competitive',
  CASUAL = 'casual',
  SHOP = 'shop',
  CLUB = 'club',
}

@Entity({ tableName: 'teams', schema: 'public' })
export class Team {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'text' })
  name!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  // Detailed bio/about section for team profile (longer than description)
  @Property({ type: 'text', nullable: true })
  bio?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'logo_url' })
  logoUrl?: string;

  @Property({ type: 'uuid', fieldName: 'captain_id' })
  captainId!: string;

  @Property({ type: 'uuid', nullable: true, fieldName: 'season_id' })
  seasonId?: string;

  // Team type (competitive, casual, shop, club)
  @Property({ type: 'varchar', length: 50, fieldName: 'team_type', default: 'competitive' })
  teamType: string = 'competitive';

  // Location (City, State format)
  @Property({ type: 'varchar', length: 255, nullable: true })
  location?: string;

  // Maximum number of team members allowed
  @Property({ type: 'integer', fieldName: 'max_members', default: 50 })
  maxMembers: number = 50;

  // Team website URL
  @Property({ type: 'varchar', length: 500, nullable: true })
  website?: string;

  // Whether this team is publicly visible
  @Property({ type: 'boolean', fieldName: 'is_public', default: true })
  isPublic: boolean = true;

  // Whether joining this team requires approval from captain
  @Property({ type: 'boolean', fieldName: 'requires_approval', default: true })
  requiresApproval: boolean = true;

  // Gallery images (up to 6 images for team gallery)
  @Property({ type: 'json', fieldName: 'gallery_images', nullable: true })
  galleryImages?: string[];

  @Property({ type: 'boolean', default: true, fieldName: 'is_active' })
  isActive: boolean = true;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'created_at' })
  createdAt?: Date;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'updated_at' })
  updatedAt?: Date;
}
