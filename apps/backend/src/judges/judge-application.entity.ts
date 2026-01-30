import { Entity, PrimaryKey, Property, ManyToOne, OneToMany, Collection, Enum } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Profile } from '../profiles/profiles.entity';
import { ApplicationStatus, JudgeSpecialty, ApplicationEntryMethod, WeekendAvailability } from '@newmeca/shared';
import { JudgeApplicationReference } from './judge-application-reference.entity';

@Entity({ tableName: 'judge_applications', schema: 'public' })
export class JudgeApplication {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Profile, { fieldName: 'user_id' })
  user!: Profile;

  @Enum(() => ApplicationStatus)
  status: ApplicationStatus = ApplicationStatus.PENDING;

  @Property({ type: 'timestamptz', fieldName: 'application_date' })
  applicationDate: Date = new Date();

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'reviewed_date' })
  reviewedDate?: Date;

  @ManyToOne(() => Profile, { nullable: true, fieldName: 'reviewed_by' })
  reviewedBy?: Profile;

  @ManyToOne(() => Profile, { nullable: true, fieldName: 'entered_by' })
  enteredBy?: Profile;

  @Enum(() => ApplicationEntryMethod)
  entryMethod: ApplicationEntryMethod = ApplicationEntryMethod.SELF;

  // Personal Information
  @Property({ type: 'text', fieldName: 'full_name' })
  fullName!: string;

  @Property({ type: 'text', nullable: true, fieldName: 'preferred_name' })
  preferredName?: string;

  @Property({ type: 'date', fieldName: 'date_of_birth' })
  dateOfBirth!: Date;

  @Property({ type: 'text' })
  phone!: string;

  @Property({ type: 'text', nullable: true, fieldName: 'secondary_phone' })
  secondaryPhone?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'headshot_url' })
  headshotUrl?: string;

  // Location Information
  @Property({ type: 'text' })
  country!: string;

  @Property({ type: 'text' })
  state!: string;

  @Property({ type: 'text' })
  city!: string;

  @Property({ type: 'text' })
  zip!: string;

  @Property({ type: 'text', fieldName: 'travel_radius' })
  travelRadius!: string;

  @Property({ type: 'json', fieldName: 'additional_regions' })
  additionalRegions: string[] = [];

  // Availability
  @Enum(() => WeekendAvailability)
  weekendAvailability!: WeekendAvailability;

  @Property({ type: 'text', nullable: true, fieldName: 'availability_notes' })
  availabilityNotes?: string;

  // Experience
  @Property({ type: 'integer', fieldName: 'years_in_industry' })
  yearsInIndustry!: number;

  @Property({ type: 'text', fieldName: 'industry_positions' })
  industryPositions!: string;

  @Property({ type: 'text', nullable: true, fieldName: 'company_names' })
  companyNames?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'education_training' })
  educationTraining?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'competition_history' })
  competitionHistory?: string;

  @Property({ type: 'text', nullable: true, fieldName: 'judging_experience' })
  judgingExperience?: string;

  // Specialties
  @Enum(() => JudgeSpecialty)
  specialty!: JudgeSpecialty;

  @Property({ type: 'json', fieldName: 'sub_specialties' })
  subSpecialties: string[] = [];

  @Property({ type: 'text', nullable: true, fieldName: 'additional_skills' })
  additionalSkills?: string;

  // Essays
  @Property({ type: 'text', fieldName: 'essay_why_judge' })
  essayWhyJudge!: string;

  @Property({ type: 'text', fieldName: 'essay_qualifications' })
  essayQualifications!: string;

  @Property({ type: 'text', nullable: true, fieldName: 'essay_additional' })
  essayAdditional?: string;

  // Acknowledgments
  @Property({ type: 'boolean', fieldName: 'ack_independent_contractor' })
  ackIndependentContractor: boolean = false;

  @Property({ type: 'boolean', fieldName: 'ack_code_of_conduct' })
  ackCodeOfConduct: boolean = false;

  @Property({ type: 'boolean', fieldName: 'ack_background_check' })
  ackBackgroundCheck: boolean = false;

  @Property({ type: 'boolean', fieldName: 'ack_terms_conditions' })
  ackTermsConditions: boolean = false;

  // Admin
  @Property({ type: 'text', nullable: true, fieldName: 'admin_notes' })
  adminNotes?: string;

  // References
  @OneToMany(() => JudgeApplicationReference, ref => ref.application)
  references = new Collection<JudgeApplicationReference>(this);

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at' })
  updatedAt: Date = new Date();
}
