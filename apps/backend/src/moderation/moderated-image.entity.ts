import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { Profile } from '../profiles/profiles.entity';

@Entity({ tableName: 'moderated_images', schema: 'public' })
export class ModeratedImage {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Profile, { fieldName: 'user_id' })
  user!: Profile;

  @Property({ type: 'text', fieldName: 'image_url' })
  imageUrl!: string;

  @Property({ type: 'varchar', length: 20, fieldName: 'image_type', default: 'profile' })
  imageType: string = 'profile';

  @Property({ type: 'boolean', fieldName: 'is_hidden', default: false })
  isHidden: boolean = false;

  @Property({ onCreate: () => new Date(), fieldName: 'created_at' })
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date(), fieldName: 'updated_at' })
  updatedAt: Date = new Date();
}
