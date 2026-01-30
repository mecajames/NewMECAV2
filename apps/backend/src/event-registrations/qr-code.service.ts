import { Injectable, Logger } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';

@Injectable()
export class QrCodeService {
  private readonly logger = new Logger(QrCodeService.name);

  /**
   * Generate a unique check-in code for a registration.
   * Format: REG-{shortId}-{checksum}
   * e.g., REG-A1B2C3-X9Y8
   */
  generateCheckInCode(registrationId: string): string {
    // Generate a short unique ID from random bytes
    const randomPart = randomBytes(3).toString('hex').toUpperCase();

    // Create a checksum from the registration ID and random part
    const checksumInput = `${registrationId}-${randomPart}`;
    const checksum = createHash('sha256')
      .update(checksumInput)
      .digest('hex')
      .substring(0, 4)
      .toUpperCase();

    return `REG-${randomPart}-${checksum}`;
  }

  /**
   * Validate check-in code format.
   * Expected format: REG-XXXXXX-YYYY where X is hex and Y is hex
   */
  validateCheckInCode(code: string): boolean {
    if (!code) return false;

    // Check format: REG-XXXXXX-YYYY
    const pattern = /^REG-[A-F0-9]{6}-[A-F0-9]{4}$/;
    return pattern.test(code.toUpperCase());
  }

  /**
   * Generate QR code as base64 PNG image.
   * Uses the qrcode npm package.
   */
  async generateQrCodeImage(checkInCode: string): Promise<string> {
    try {
      // Dynamic import to avoid requiring the package if not used
      // @ts-ignore - Package may not be installed, handled at runtime
      const QRCode = await import('qrcode');

      // Generate QR code as data URL (base64 PNG)
      const qrCodeDataUrl = await QRCode.toDataURL(checkInCode, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });

      return qrCodeDataUrl;
    } catch (error) {
      // If qrcode package is not installed, log and return empty string
      if ((error as any)?.code === 'MODULE_NOT_FOUND') {
        this.logger.error('QR code package not installed. Run: rush add -p qrcode && rush add -p @types/qrcode --dev');
        return '';
      }
      this.logger.error(`Failed to generate QR code: ${error}`);
      throw error;
    }
  }

  /**
   * Generate both check-in code and QR code image for a registration.
   */
  async generateCheckInData(registrationId: string): Promise<{
    checkInCode: string;
    qrCodeData: string;
  }> {
    const checkInCode = this.generateCheckInCode(registrationId);
    const qrCodeData = await this.generateQrCodeImage(checkInCode);

    return {
      checkInCode,
      qrCodeData,
    };
  }
}
