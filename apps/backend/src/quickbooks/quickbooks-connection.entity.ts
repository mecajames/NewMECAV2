import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

@Entity({ tableName: 'quickbooks_connections', schema: 'public' })
export class QuickBooksConnection {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  // QuickBooks realm/company ID
  @Property({ type: 'text', fieldName: 'realm_id' })
  realmId!: string;

  // OAuth tokens (encrypted in production)
  @Property({ type: 'text', fieldName: 'access_token' })
  accessToken!: string;

  @Property({ type: 'text', fieldName: 'refresh_token' })
  refreshToken!: string;

  @Property({ type: 'timestamp', fieldName: 'access_token_expires_at' })
  accessTokenExpiresAt!: Date;

  @Property({ type: 'timestamp', fieldName: 'refresh_token_expires_at' })
  refreshTokenExpiresAt!: Date;

  // Company info from QuickBooks
  @Property({ type: 'text', nullable: true, fieldName: 'company_name' })
  companyName?: string;

  // Connection status
  @Property({ type: 'boolean', fieldName: 'is_active', default: true })
  isActive: boolean = true;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at' })
  updatedAt: Date = new Date();

  @Property({ type: 'timestamp', nullable: true, fieldName: 'last_sync_at' })
  lastSyncAt?: Date;
}
