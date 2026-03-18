import { Injectable, Logger } from '@nestjs/common';
import { SiteSettingsService } from '../site-settings/site-settings.service';

export interface TaxCalculation {
  taxAmount: number;
  taxRate: number;
  taxName: string;
}

interface CachedTaxConfig {
  taxRate: number;
  taxName: string;
  enabled: boolean;
  fetchedAt: number;
}

const CACHE_TTL_MS = 60_000; // 60 seconds

@Injectable()
export class TaxService {
  private readonly logger = new Logger(TaxService.name);
  private cache: CachedTaxConfig | null = null;

  // Env var fallbacks (read once at startup)
  private readonly envTaxRate: number;
  private readonly envTaxName: string;

  constructor(
    private readonly siteSettingsService: SiteSettingsService,
  ) {
    const ratePercent = parseFloat(process.env.TAX_RATE_PERCENT || '0');
    this.envTaxRate = isNaN(ratePercent) ? 0 : ratePercent / 100;
    this.envTaxName = process.env.TAX_NAME || 'KY Sales Tax';
  }

  private async loadConfig(): Promise<CachedTaxConfig> {
    if (this.cache && Date.now() - this.cache.fetchedAt < CACHE_TTL_MS) {
      return this.cache;
    }

    try {
      const [enabledSetting, rateSetting, nameSetting] = await Promise.all([
        this.siteSettingsService.findByKey('shop_tax_enabled'),
        this.siteSettingsService.findByKey('shop_tax_rate_percent'),
        this.siteSettingsService.findByKey('shop_tax_name'),
      ]);

      // If no DB settings exist at all, fall back to env vars
      const hasDbSettings = enabledSetting || rateSetting || nameSetting;

      let enabled: boolean;
      let taxRate: number;
      let taxName: string;

      if (hasDbSettings) {
        enabled = enabledSetting ? enabledSetting.setting_value === 'true' : true;
        const ratePercent = rateSetting ? parseFloat(rateSetting.setting_value) : 0;
        taxRate = isNaN(ratePercent) ? 0 : ratePercent / 100;
        taxName = nameSetting ? nameSetting.setting_value : 'KY Sales Tax';
      } else {
        // Fall back to env vars
        enabled = this.envTaxRate > 0;
        taxRate = this.envTaxRate;
        taxName = this.envTaxName;
      }

      this.cache = { taxRate, taxName, enabled, fetchedAt: Date.now() };
      return this.cache;
    } catch (error) {
      this.logger.error('Failed to load tax config from DB, using env vars', error);
      this.cache = {
        taxRate: this.envTaxRate,
        taxName: this.envTaxName,
        enabled: this.envTaxRate > 0,
        fetchedAt: Date.now(),
      };
      return this.cache;
    }
  }

  async getRate(): Promise<{ taxRate: number; taxName: string; enabled: boolean }> {
    const config = await this.loadConfig();
    return { taxRate: config.taxRate, taxName: config.taxName, enabled: config.enabled };
  }

  async calculateTax(subtotal: number): Promise<TaxCalculation> {
    const config = await this.loadConfig();

    if (!config.enabled || config.taxRate === 0 || subtotal <= 0) {
      return { taxAmount: 0, taxRate: 0, taxName: config.taxName };
    }

    // Integer-cent math to avoid floating-point errors
    const subtotalCents = Math.round(subtotal * 100);
    const taxCents = Math.round(subtotalCents * config.taxRate);
    const taxAmount = taxCents / 100;

    return {
      taxAmount,
      taxRate: config.taxRate,
      taxName: config.taxName,
    };
  }

  /** Clear cached config (call after admin updates settings) */
  clearCache(): void {
    this.cache = null;
  }
}
