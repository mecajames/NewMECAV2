import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Ticket } from './ticket.entity';
import { TicketComment } from './ticket-comment.entity';
import { Profile } from '../profiles/profiles.entity';

@Entity({ tableName: 'ticket_attachments', schema: 'public' })
export class TicketAttachment {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Ticket, { fieldName: 'ticket_id', serializedName: 'ticket_id' })
  ticket!: Ticket;

  @ManyToOne(() => TicketComment, { nullable: true, fieldName: 'comment_id', serializedName: 'comment_id' })
  comment?: TicketComment;

  @ManyToOne(() => Profile, { fieldName: 'uploader_id', serializedName: 'uploader_id' })
  uploader!: Profile;

  @Property({ type: 'text', fieldName: 'file_name', serializedName: 'file_name' })
  fileName!: string;

  @Property({ type: 'text', fieldName: 'file_path', serializedName: 'file_path' })
  filePath!: string;

  @Property({ type: 'integer', fieldName: 'file_size', serializedName: 'file_size' })
  fileSize!: number;

  @Property({ type: 'text', fieldName: 'mime_type', serializedName: 'mime_type' })
  mimeType!: string;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at', serializedName: 'created_at' })
  createdAt: Date = new Date();
}
