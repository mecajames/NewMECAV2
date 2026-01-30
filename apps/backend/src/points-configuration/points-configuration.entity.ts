import { Entity, PrimaryKey, Property, ManyToOne, Index } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Season } from '../seasons/seasons.entity';
import { Profile } from '../profiles/profiles.entity';

@Entity({ tableName: 'points_configuration', schema: 'public' })
@Index({ properties: ['seasonId'] })
export class PointsConfiguration {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  // Season association
  @ManyToOne(() => Season, { fieldName: 'season_id' })
  season!: Season;

  @Property({ type: 'uuid', fieldName: 'season_id', persist: false })
  get seasonId(): string {
    return this.season?.id;
  }

  // Standard Event Base Points (multiplied by 1X, 2X, 3X)
  @Property({ type: 'integer', fieldName: 'standard_1st_place' })
  standard1stPlace: number = 5;

  @Property({ type: 'integer', fieldName: 'standard_2nd_place' })
  standard2ndPlace: number = 4;

  @Property({ type: 'integer', fieldName: 'standard_3rd_place' })
  standard3rdPlace: number = 3;

  @Property({ type: 'integer', fieldName: 'standard_4th_place' })
  standard4thPlace: number = 2;

  @Property({ type: 'integer', fieldName: 'standard_5th_place' })
  standard5thPlace: number = 1;

  // 4X Event Points (SQ, Install, RTA, etc.)
  @Property({ type: 'integer', fieldName: 'four_x_1st_place' })
  fourX1stPlace: number = 30;

  @Property({ type: 'integer', fieldName: 'four_x_2nd_place' })
  fourX2ndPlace: number = 27;

  @Property({ type: 'integer', fieldName: 'four_x_3rd_place' })
  fourX3rdPlace: number = 24;

  @Property({ type: 'integer', fieldName: 'four_x_4th_place' })
  fourX4thPlace: number = 21;

  @Property({ type: 'integer', fieldName: 'four_x_5th_place' })
  fourX5thPlace: number = 18;

  // Extended 4X Placement Points (6th-50th place)
  @Property({ type: 'boolean', fieldName: 'four_x_extended_enabled' })
  fourXExtendedEnabled: boolean = false;

  @Property({ type: 'integer', fieldName: 'four_x_extended_points' })
  fourXExtendedPoints: number = 15;

  @Property({ type: 'integer', fieldName: 'four_x_extended_max_place' })
  fourXExtendedMaxPlace: number = 50;

  // Metadata
  @Property({ type: 'boolean', fieldName: 'is_active' })
  isActive: boolean = true;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @ManyToOne(() => Profile, { fieldName: 'updated_by', nullable: true })
  updatedBy?: Profile;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at' })
  updatedAt: Date = new Date();

  /**
   * Convert to API response format with snake_case keys
   */
  toJSON() {
    return {
      id: this.id,
      season_id: this.season?.id,
      standard_1st_place: this.standard1stPlace,
      standard_2nd_place: this.standard2ndPlace,
      standard_3rd_place: this.standard3rdPlace,
      standard_4th_place: this.standard4thPlace,
      standard_5th_place: this.standard5thPlace,
      four_x_1st_place: this.fourX1stPlace,
      four_x_2nd_place: this.fourX2ndPlace,
      four_x_3rd_place: this.fourX3rdPlace,
      four_x_4th_place: this.fourX4thPlace,
      four_x_5th_place: this.fourX5thPlace,
      four_x_extended_enabled: this.fourXExtendedEnabled,
      four_x_extended_points: this.fourXExtendedPoints,
      four_x_extended_max_place: this.fourXExtendedMaxPlace,
      is_active: this.isActive,
      description: this.description,
      updated_by: this.updatedBy?.id,
      updated_at: this.updatedAt,
      created_at: this.createdAt,
    };
  }
}
