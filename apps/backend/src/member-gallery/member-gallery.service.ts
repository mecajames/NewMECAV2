import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { MemberGalleryImage } from './member-gallery-image.entity';

// DTOs
export interface CreateGalleryImageDto {
  imageUrl: string;
  caption?: string;
  sortOrder?: number;
  isPublic?: boolean;
}

export interface UpdateGalleryImageDto {
  caption?: string;
  sortOrder?: number;
  isPublic?: boolean;
}

@Injectable()
export class MemberGalleryService {
  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {}

  // ============================================
  // QUERY METHODS
  // ============================================

  /**
   * Get public gallery images for a member
   */
  async getPublicGalleryByMemberId(memberId: string): Promise<MemberGalleryImage[]> {
    const em = this.em.fork();
    return em.find(MemberGalleryImage, {
      member: memberId,
      isPublic: true,
    }, {
      orderBy: { sortOrder: 'ASC', uploadedAt: 'DESC' },
    });
  }

  /**
   * Get all gallery images for a member (including private)
   */
  async getGalleryByMemberId(
    memberId: string,
    includePrivate: boolean = false,
  ): Promise<MemberGalleryImage[]> {
    const em = this.em.fork();

    const criteria: any = { member: memberId };
    if (!includePrivate) {
      criteria.isPublic = true;
    }

    return em.find(MemberGalleryImage, criteria, {
      orderBy: { sortOrder: 'ASC', uploadedAt: 'DESC' },
    });
  }

  /**
   * Get a single image by ID
   */
  async getImageById(id: string): Promise<MemberGalleryImage> {
    const em = this.em.fork();
    const image = await em.findOne(MemberGalleryImage, { id });
    if (!image) {
      throw new NotFoundException(`Gallery image with ID ${id} not found`);
    }
    return image;
  }

  // ============================================
  // WRITE METHODS
  // ============================================

  /**
   * Add an image to a member's gallery
   */
  async addImage(
    memberId: string,
    data: CreateGalleryImageDto,
  ): Promise<MemberGalleryImage> {
    const em = this.em.fork();

    // Get the highest sort order for this member's gallery
    const existingImages = await em.find(MemberGalleryImage, { member: memberId }, {
      orderBy: { sortOrder: 'DESC' },
      limit: 1,
    });

    const nextSortOrder = existingImages.length > 0
      ? (existingImages[0].sortOrder || 0) + 1
      : 0;

    const image = em.create(MemberGalleryImage, {
      id: randomUUID(),
      member: memberId,
      imageUrl: data.imageUrl,
      caption: data.caption,
      sortOrder: data.sortOrder ?? nextSortOrder,
      isPublic: data.isPublic ?? true,
    } as any);

    await em.persistAndFlush(image);
    return image;
  }

  /**
   * Update an image (owner only, enforced by controller)
   */
  async updateImage(
    id: string,
    memberId: string,
    data: UpdateGalleryImageDto,
  ): Promise<MemberGalleryImage> {
    const em = this.em.fork();

    const image = await em.findOne(MemberGalleryImage, { id });
    if (!image) {
      throw new NotFoundException(`Gallery image with ID ${id} not found`);
    }

    // Verify ownership
    const imageMemberId = (image.member as any)?.id || image.member;
    if (imageMemberId !== memberId) {
      throw new ForbiddenException('You can only update your own gallery images');
    }

    em.assign(image, {
      caption: data.caption !== undefined ? data.caption : image.caption,
      sortOrder: data.sortOrder !== undefined ? data.sortOrder : image.sortOrder,
      isPublic: data.isPublic !== undefined ? data.isPublic : image.isPublic,
    });

    await em.flush();
    return image;
  }

  /**
   * Delete an image (owner only, enforced by controller)
   */
  async deleteImage(id: string, memberId: string): Promise<void> {
    const em = this.em.fork();

    const image = await em.findOne(MemberGalleryImage, { id });
    if (!image) {
      throw new NotFoundException(`Gallery image with ID ${id} not found`);
    }

    // Verify ownership
    const imageMemberId = (image.member as any)?.id || image.member;
    if (imageMemberId !== memberId) {
      throw new ForbiddenException('You can only delete your own gallery images');
    }

    await em.removeAndFlush(image);
  }

  /**
   * Admin delete an image (bypasses ownership check)
   */
  async adminDeleteImage(id: string): Promise<void> {
    const em = this.em.fork();

    const image = await em.findOne(MemberGalleryImage, { id });
    if (!image) {
      throw new NotFoundException(`Gallery image with ID ${id} not found`);
    }

    await em.removeAndFlush(image);
  }

  /**
   * Reorder images for a member's gallery
   */
  async reorderImages(memberId: string, imageIds: string[]): Promise<MemberGalleryImage[]> {
    const em = this.em.fork();

    const images: MemberGalleryImage[] = [];

    for (let i = 0; i < imageIds.length; i++) {
      const image = await em.findOne(MemberGalleryImage, { id: imageIds[i] });
      if (image) {
        // Verify ownership
        const imageMemberId = (image.member as any)?.id || image.member;
        if (imageMemberId !== memberId) {
          throw new ForbiddenException('You can only reorder your own gallery images');
        }

        image.sortOrder = i;
        images.push(image);
      }
    }

    await em.flush();
    return images;
  }

  /**
   * Set image visibility
   */
  async setImageVisibility(
    id: string,
    memberId: string,
    isPublic: boolean,
  ): Promise<MemberGalleryImage> {
    const em = this.em.fork();

    const image = await em.findOne(MemberGalleryImage, { id });
    if (!image) {
      throw new NotFoundException(`Gallery image with ID ${id} not found`);
    }

    // Verify ownership
    const imageMemberId = (image.member as any)?.id || image.member;
    if (imageMemberId !== memberId) {
      throw new ForbiddenException('You can only change visibility of your own gallery images');
    }

    image.isPublic = isPublic;
    await em.flush();

    return image;
  }
}
