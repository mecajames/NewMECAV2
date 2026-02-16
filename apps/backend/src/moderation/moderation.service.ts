import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { ModeratedImage } from './moderated-image.entity';
import { ModerationLog } from './moderation-log.entity';
import { Notification } from '../notifications/notifications.entity';

@Injectable()
export class ModerationService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  async getHiddenImages(userId: string): Promise<string[]> {
    const em = this.em.fork();
    const images = await em.find(ModeratedImage, {
      user: userId,
      isHidden: true,
    });
    return images.map(img => img.imageUrl);
  }

  async toggleImageVisibility(data: {
    userId: string;
    imageUrl: string;
    imageType: string;
    hide: boolean;
    moderatorId: string;
  }): Promise<{ isHidden: boolean }> {
    const em = this.em.fork();

    // Find existing record or create new one
    let record = await em.findOne(ModeratedImage, {
      user: data.userId,
      imageUrl: data.imageUrl,
    });

    if (record) {
      record.isHidden = data.hide;
      record.imageType = data.imageType;
    } else {
      record = em.create(ModeratedImage, {
        user: data.userId,
        imageUrl: data.imageUrl,
        imageType: data.imageType,
        isHidden: data.hide,
      } as any);
    }

    // Send notification if hiding
    if (data.hide) {
      const typeLabel = data.imageType === 'profile' ? 'profile' : 'team gallery';
      em.create(Notification, {
        user: data.userId,
        fromUser: data.moderatorId,
        title: 'Image Hidden from Public View',
        message: `One of your ${typeLabel} images has been hidden from public view by an administrator. Please review your images and ensure they comply with MECA guidelines.`,
        type: 'alert',
        link: data.imageType === 'profile' ? '/public-profile' : undefined,
      } as any);
    }

    await em.flush();
    return { isHidden: data.hide };
  }

  async logModerationAction(data: {
    userId: string;
    moderatorId: string;
    action: string;
    reason?: string;
    details?: Record<string, any>;
  }): Promise<void> {
    const em = this.em.fork();
    em.create(ModerationLog, {
      user: data.userId,
      moderator: data.moderatorId,
      action: data.action,
      reason: data.reason,
      details: data.details,
    } as any);
    await em.flush();
  }

  async sendModerationNotification(data: {
    userId: string;
    moderatorId: string;
    title: string;
    message: string;
    link?: string;
  }): Promise<void> {
    const em = this.em.fork();
    em.create(Notification, {
      user: data.userId,
      fromUser: data.moderatorId,
      title: data.title,
      message: data.message,
      type: 'alert',
      link: data.link,
    } as any);
    await em.flush();
  }
}
