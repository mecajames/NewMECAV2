import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as fs from 'fs';
import { AchievementTemplate } from '../achievement-template.entity';
import { AchievementRecipient } from '../achievement-recipient.entity';

// Canvas imports - we'll use dynamic import for ESM module
let createCanvas: any;
let loadImage: any;
let registerFont: any;

@Injectable()
export class AchievementImageService {
  private readonly logger = new Logger(AchievementImageService.name);
  private readonly supabase;
  private readonly assetsPath: string;
  private readonly templatesPath: string;
  private readonly fontsPath: string;
  private canvasInitialized = false;

  constructor(private readonly em: EntityManager) {
    // Initialize Supabase client
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Set paths for assets (need to go up 4 levels from dist/achievements/image-generator to reach backend root)
    this.assetsPath = path.join(__dirname, '..', '..', '..', '..', 'assets');
    this.templatesPath = path.join(this.assetsPath, 'achievement-templates');
    this.fontsPath = path.join(this.assetsPath, 'fonts');
  }

  /**
   * Initialize canvas library (must be done async for ESM module)
   */
  private async initCanvas(): Promise<boolean> {
    if (this.canvasInitialized) return true;

    try {
      // Try to import canvas
      const canvas = await import('canvas');
      createCanvas = canvas.createCanvas;
      loadImage = canvas.loadImage;
      registerFont = canvas.registerFont;

      // Register Impact font if available
      const fontPath = path.join(this.fontsPath, 'impact.ttf');
      if (fs.existsSync(fontPath)) {
        registerFont(fontPath, { family: 'Impact' });
        this.logger.log('Registered Impact font for achievement images');
      } else {
        this.logger.warn(`Impact font not found at ${fontPath}`);
      }

      this.canvasInitialized = true;
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize canvas library:', error);
      return false;
    }
  }

  /**
   * Generate an achievement image with the score/value overlaid on the template
   */
  async generateImage(templateKey: string, value: number | string): Promise<Buffer | null> {
    this.logger.debug(`generateImage called: templateKey=${templateKey}, value=${value}`);

    const initialized = await this.initCanvas();
    if (!initialized) {
      this.logger.error('Canvas not available - cannot generate achievement image');
      return null;
    }

    // Get template config from database
    const template = await this.em.findOne(AchievementTemplate, { key: templateKey });
    if (!template) {
      this.logger.error(`Template not found in database: "${templateKey}"`);
      // List available templates for debugging
      const allTemplates = await this.em.find(AchievementTemplate, {});
      this.logger.error(`Available templates: ${allTemplates.map(t => t.key).join(', ')}`);
      return null;
    }

    this.logger.debug(`Template found: ${template.name}, baseImagePath=${template.baseImagePath}`);

    const imagePath = path.join(this.templatesPath, template.baseImagePath);
    if (!fs.existsSync(imagePath)) {
      this.logger.error(`Template image not found on disk: ${imagePath}`);
      this.logger.error(`Templates path: ${this.templatesPath}`);
      // List available files in templates directory
      if (fs.existsSync(this.templatesPath)) {
        const files = fs.readdirSync(this.templatesPath);
        this.logger.error(`Available files in templates dir: ${files.join(', ')}`);
      } else {
        this.logger.error(`Templates directory does not exist: ${this.templatesPath}`);
      }
      return null;
    }

    try {
      // Load the base image
      this.logger.debug(`Loading base image from: ${imagePath}`);
      const baseImage = await loadImage(imagePath);

      // Create canvas with same dimensions as base image
      const canvas = createCanvas(baseImage.width, baseImage.height);
      const ctx = canvas.getContext('2d');

      // Draw base image
      ctx.drawImage(baseImage, 0, 0);

      // Set text properties
      ctx.font = `${template.fontSize}px Impact`;
      ctx.fillStyle = template.textColor;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic'; // Match PHP imagettftext behavior where Y is baseline

      // Format the value (round to 1 decimal for dB scores)
      const displayValue = typeof value === 'number'
        ? value.toFixed(1).replace(/\.0$/, '')
        : value;

      this.logger.debug(`Drawing text "${displayValue}" at (${template.textX}, ${template.textY})`);

      // Draw the text
      ctx.fillText(displayValue, template.textX, template.textY);

      // Return as PNG buffer
      const buffer = canvas.toBuffer('image/png');
      this.logger.debug(`Image generated successfully, buffer size: ${buffer.length} bytes`);
      return buffer;
    } catch (error: any) {
      this.logger.error(`Error generating achievement image: ${error.message}`);
      this.logger.error(error.stack);
      return null;
    }
  }

  /**
   * Generate and upload an achievement image to Supabase storage
   */
  async generateAndUploadImage(
    templateKey: string,
    value: number | string,
    recipientId: string
  ): Promise<string | null> {
    this.logger.debug(`generateAndUploadImage: templateKey=${templateKey}, value=${value}, recipientId=${recipientId}`);

    const imageBuffer = await this.generateImage(templateKey, value);
    if (!imageBuffer) {
      this.logger.error(`Image generation returned null for templateKey=${templateKey}`);
      return null;
    }

    // Create a unique filename
    const filename = `${recipientId}-${Date.now()}.png`;
    const storagePath = `achievements/${filename}`;

    this.logger.debug(`Uploading to Supabase storage: bucket=achievement-images, path=${storagePath}`);

    try {
      // Upload to Supabase storage
      const { data, error } = await this.supabase.storage
        .from('achievement-images')
        .upload(storagePath, imageBuffer, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: true,
        });

      if (error) {
        this.logger.error(`Failed to upload achievement image to Supabase: ${error.message}`);
        this.logger.error(`Upload error details: ${JSON.stringify(error)}`);
        return null;
      }

      this.logger.debug(`Upload successful: ${JSON.stringify(data)}`);

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from('achievement-images')
        .getPublicUrl(storagePath);

      this.logger.debug(`Public URL: ${urlData.publicUrl}`);
      return urlData.publicUrl;
    } catch (error: any) {
      this.logger.error(`Exception uploading achievement image: ${error.message}`);
      this.logger.error(error.stack);
      return null;
    }
  }

  /**
   * Generate image for a recipient and update their record
   */
  async generateImageForRecipient(recipientId: string): Promise<boolean> {
    const recipient = await this.em.findOne(AchievementRecipient, { id: recipientId }, {
      populate: ['achievement'],
    });

    if (!recipient) {
      this.logger.error(`Recipient not found: ${recipientId}`);
      return false;
    }

    if (!recipient.achievement) {
      this.logger.error(`Recipient ${recipientId} has no linked achievement`);
      return false;
    }

    // Use render_value from definition if available (for consistent display like "185" instead of "185.3")
    // Otherwise fall back to achieved_value
    const renderValue = recipient.achievement.renderValue ?? Number(recipient.achievedValue);
    const templateKey = recipient.achievement.templateKey;

    this.logger.log(`Generating image for recipient ${recipientId}:`);
    this.logger.log(`  - Achievement: ${recipient.achievement.name} (${recipient.achievement.id})`);
    this.logger.log(`  - Template key: ${templateKey}`);
    this.logger.log(`  - Render value: ${renderValue} (definition: ${recipient.achievement.renderValue}, achieved: ${recipient.achievedValue})`);

    try {
      const imageUrl = await this.generateAndUploadImage(
        templateKey,
        renderValue,
        recipientId
      );

      if (imageUrl) {
        recipient.imageUrl = imageUrl;
        recipient.imageGeneratedAt = new Date();
        await this.em.flush();
        this.logger.log(`Generated achievement image for recipient ${recipientId}: ${imageUrl}`);
        return true;
      }

      this.logger.error(`Failed to generate/upload image for recipient ${recipientId} - no URL returned`);
      return false;
    } catch (error: any) {
      this.logger.error(`Exception generating image for recipient ${recipientId}: ${error.message}`);
      this.logger.error(error.stack);
      return false;
    }
  }

  /**
   * Generate images for all recipients that don't have one yet
   */
  async generateMissingImages(): Promise<{ generated: number; failed: number }> {
    const recipients = await this.em.find(AchievementRecipient, {
      imageUrl: null,
    }, {
      populate: ['achievement'],
    });

    let generated = 0;
    let failed = 0;

    for (const recipient of recipients) {
      const success = await this.generateImageForRecipient(recipient.id);
      if (success) {
        generated++;
      } else {
        failed++;
      }
    }

    this.logger.log(`Image generation complete: ${generated} generated, ${failed} failed`);
    return { generated, failed };
  }

  /**
   * Delete an achievement image from Supabase storage
   */
  async deleteImage(imageUrl: string): Promise<boolean> {
    try {
      // Extract the path from the URL
      // URL format: https://xxx.supabase.co/storage/v1/object/public/achievement-images/achievements/xxx.png
      const urlParts = imageUrl.split('/achievement-images/');
      if (urlParts.length !== 2) {
        this.logger.warn(`Could not parse image URL for deletion: ${imageUrl}`);
        return false;
      }

      const storagePath = urlParts[1];
      this.logger.debug(`Deleting image from storage: ${storagePath}`);

      const { error } = await this.supabase.storage
        .from('achievement-images')
        .remove([storagePath]);

      if (error) {
        this.logger.error(`Failed to delete achievement image: ${error.message}`);
        return false;
      }

      this.logger.log(`Successfully deleted achievement image: ${storagePath}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Exception deleting achievement image: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if the canvas library is available
   */
  async isCanvasAvailable(): Promise<boolean> {
    return this.initCanvas();
  }

  /**
   * Check if template assets are properly configured
   */
  async checkAssets(): Promise<{
    assetsPath: string;
    templatesPath: string;
    fontsPath: string;
    templatesExist: boolean;
    fontsExist: boolean;
    canvasAvailable: boolean;
    templateFiles: string[];
    fontFiles: string[];
    supabaseBucketAccessible: boolean;
    supabaseBucketError?: string;
  }> {
    // Check Supabase bucket accessibility
    let supabaseBucketAccessible = false;
    let supabaseBucketError: string | undefined;
    try {
      const { data, error } = await this.supabase.storage.from('achievement-images').list('', { limit: 1 });
      if (error) {
        supabaseBucketError = error.message;
      } else {
        supabaseBucketAccessible = true;
      }
    } catch (err: any) {
      supabaseBucketError = err.message || 'Unknown error accessing bucket';
    }

    // Get list of template files
    let templateFiles: string[] = [];
    if (fs.existsSync(this.templatesPath)) {
      try {
        templateFiles = fs.readdirSync(this.templatesPath);
      } catch (err) {
        // ignore
      }
    }

    // Get list of font files
    let fontFiles: string[] = [];
    if (fs.existsSync(this.fontsPath)) {
      try {
        fontFiles = fs.readdirSync(this.fontsPath);
      } catch (err) {
        // ignore
      }
    }

    return {
      assetsPath: this.assetsPath,
      templatesPath: this.templatesPath,
      fontsPath: this.fontsPath,
      templatesExist: fs.existsSync(this.templatesPath),
      fontsExist: fs.existsSync(this.fontsPath),
      canvasAvailable: await this.isCanvasAvailable(),
      templateFiles,
      fontFiles,
      supabaseBucketAccessible,
      supabaseBucketError,
    };
  }
}
