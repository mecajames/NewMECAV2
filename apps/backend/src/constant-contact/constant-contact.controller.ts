import {
  Controller,
  Post,
  Get,
  Body,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConstantContactService } from './constant-contact.service';

interface NewsletterSignupDto {
  email: string;
  firstName?: string;
  lastName?: string;
}

@Controller('api/newsletter')
export class ConstantContactController {
  private readonly logger = new Logger(ConstantContactController.name);

  constructor(private readonly constantContactService: ConstantContactService) {}

  /**
   * POST /api/newsletter/signup
   * Subscribe a user to the newsletter
   */
  @Post('signup')
  async signup(@Body() dto: NewsletterSignupDto) {
    // Validate email
    if (!dto.email || !this.isValidEmail(dto.email)) {
      throw new HttpException('Invalid email address', HttpStatus.BAD_REQUEST);
    }

    try {
      await this.constantContactService.addContact({
        email: dto.email.toLowerCase().trim(),
        firstName: dto.firstName?.trim(),
        lastName: dto.lastName?.trim(),
      });

      return {
        success: true,
        message: 'Successfully subscribed to newsletter!',
      };
    } catch (error: any) {
      this.logger.error(`Newsletter signup failed for ${dto.email}: ${error.message}`);

      // Return user-friendly error
      if (error.status === 409) {
        return {
          success: true,
          message: 'You are already subscribed to our newsletter!',
        };
      }

      throw new HttpException(
        'Failed to subscribe. Please try again later.',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * GET /api/newsletter/lists
   * Get all contact lists (admin use - for finding list IDs)
   */
  @Get('lists')
  async getLists() {
    try {
      const lists = await this.constantContactService.getLists();
      return lists;
    } catch (error: any) {
      this.logger.error(`Failed to fetch lists: ${error.message}`);
      throw new HttpException(
        'Failed to fetch newsletter lists',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
