import { Entity, PrimaryKey, Property, Enum } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { VerificationPurpose } from '@newmeca/shared';

@Entity({ tableName: 'email_verification_tokens', schema: 'public' })
export class EmailVerificationToken {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'text', unique: true })
  token!: string;

  @Property({ type: 'text' })
  email!: string;

  @Enum(() => VerificationPurpose)
  purpose!: VerificationPurpose;

  @Property({ type: 'uuid', fieldName: 'related_entity_id' })
  relatedEntityId!: string;

  @Property({ type: 'timestamptz', fieldName: 'expires_at' })
  expiresAt!: Date;

  @Property({ type: 'boolean', fieldName: 'is_used' })
  isUsed: boolean = false;

  @Property({ type: 'timestamptz', nullable: true, fieldName: 'used_at' })
  usedAt?: Date;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  createdAt: Date = new Date();
}
