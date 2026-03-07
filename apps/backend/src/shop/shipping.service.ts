import { Injectable, Inject, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { ShopProduct } from './entities/shop-product.entity';

export interface ShippingRate {
  method: 'standard' | 'priority';
  name: string;
  description: string;
  price: number;
  estimatedDays: string;
}

export interface ShippingRateRequest {
  items: Array<{ productId: string; quantity: number }>;
  destinationZip: string;
  destinationCountry?: string;
}

// MECA HQ address (origin)
const ORIGIN_ZIP = '75006'; // Dallas, TX area - update with actual MECA HQ zip

// USPS v3 API endpoints
const USPS_TOKEN_URL = 'https://apis.usps.com/oauth2/v3/token';
const USPS_RATES_URL = 'https://apis.usps.com/prices/v3/base-rates/search';

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);
  private readonly uspsConsumerKey: string | undefined;
  private readonly uspsConsumerSecret: string | undefined;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {
    this.uspsConsumerKey = process.env.USPS_CONSUMER_KEY;
    this.uspsConsumerSecret = process.env.USPS_CONSUMER_SECRET;
  }

  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 60s buffer)
    if (this.accessToken && Date.now() < this.tokenExpiry - 60_000) {
      return this.accessToken;
    }

    const response = await fetch(USPS_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.uspsConsumerKey,
        client_secret: this.uspsConsumerSecret,
        grant_type: 'client_credentials',
      }),
    });

    if (!response.ok) {
      throw new Error(`USPS OAuth failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { access_token: string; expires_in?: number };
    this.accessToken = data.access_token;
    // Token typically expires in 3600s; use expires_in if provided
    this.tokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
    return this.accessToken!;
  }

  async calculateRates(request: ShippingRateRequest): Promise<ShippingRate[]> {
    const em = this.em.fork();

    // Get products to calculate total weight and dimensions
    const productIds = request.items.map((item) => item.productId);
    const products = await em.find(ShopProduct, { id: { $in: productIds } });

    // Calculate total weight in ounces and aggregate dimensions
    let totalWeightOz = 0;
    let maxLengthIn = 0;
    let maxWidthIn = 0;
    let maxHeightIn = 0;

    for (const item of request.items) {
      const product = products.find((p) => p.id === item.productId);
      if (product) {
        if (product.weightOz) {
          totalWeightOz += Number(product.weightOz) * item.quantity;
        }
        // Use the largest dimensions across all products
        if (product.lengthIn) maxLengthIn = Math.max(maxLengthIn, Number(product.lengthIn));
        if (product.widthIn) maxWidthIn = Math.max(maxWidthIn, Number(product.widthIn));
        if (product.heightIn) maxHeightIn = Math.max(maxHeightIn, Number(product.heightIn));
      }
    }

    // Default minimum weight (8 oz) if no weights set
    if (totalWeightOz === 0) {
      totalWeightOz = 8;
    }

    // If USPS credentials are configured, use USPS API for domestic
    if (this.uspsConsumerKey && this.uspsConsumerSecret && request.destinationCountry === 'US') {
      try {
        return await this.getUspsRates(totalWeightOz, request.destinationZip, {
          lengthIn: maxLengthIn,
          widthIn: maxWidthIn,
          heightIn: maxHeightIn,
        });
      } catch (error) {
        this.logger.error('USPS API error, falling back to calculated rates:', error);
      }
    }

    // Fall back to calculated rates
    return this.getCalculatedRates(totalWeightOz, request.destinationCountry);
  }

  private async getUspsRates(
    weightOz: number,
    destinationZip: string,
    dimensions: { lengthIn: number; widthIn: number; heightIn: number },
  ): Promise<ShippingRate[]> {
    const token = await this.getAccessToken();

    // Weight in pounds (decimal) for USPS v3 API
    const weightLbs = Math.round((weightOz / 16) * 100) / 100;

    // Use dimensions if available, otherwise use reasonable defaults
    const length = dimensions.lengthIn || 6;
    const width = dimensions.widthIn || 6;
    const height = dimensions.heightIn || 6;

    const today = new Date().toISOString().split('T')[0];

    // Build request body shared fields
    const baseBody = {
      originZIPCode: ORIGIN_ZIP,
      destinationZIPCode: destinationZip,
      weight: weightLbs,
      length,
      width,
      height,
      mailingDate: today,
      priceType: 'RETAIL',
    };

    // Fetch both Ground Advantage and Priority Mail rates in parallel
    const [groundResponse, priorityResponse] = await Promise.all([
      fetch(USPS_RATES_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...baseBody,
          mailClass: 'USPS_GROUND_ADVANTAGE',
        }),
      }),
      fetch(USPS_RATES_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...baseBody,
          mailClass: 'PRIORITY_MAIL',
        }),
      }),
    ]);

    const rates: ShippingRate[] = [];

    if (groundResponse.ok) {
      const groundData = await groundResponse.json();
      const groundPrice = this.extractPrice(groundData);
      if (groundPrice !== null) {
        rates.push({
          method: 'standard',
          name: 'USPS Ground Advantage',
          description: '2-5 business days',
          price: groundPrice,
          estimatedDays: '2-5 business days',
        });
      }
    } else {
      this.logger.warn(`USPS Ground Advantage rate request failed: ${groundResponse.status}`);
    }

    if (priorityResponse.ok) {
      const priorityData = await priorityResponse.json();
      const priorityPrice = this.extractPrice(priorityData);
      if (priorityPrice !== null) {
        rates.push({
          method: 'priority',
          name: 'USPS Priority Mail',
          description: '1-3 business days',
          price: priorityPrice,
          estimatedDays: '1-3 business days',
        });
      }
    } else {
      this.logger.warn(`USPS Priority Mail rate request failed: ${priorityResponse.status}`);
    }

    // If we got rates, return them sorted by price
    if (rates.length > 0) {
      return rates.sort((a, b) => a.price - b.price);
    }

    // Fall back to calculated rates if USPS returned no usable rates
    return this.getCalculatedRates(weightOz, 'US');
  }

  private extractPrice(responseData: any): number | null {
    try {
      // USPS v3 response structure: { rateOptions: [{ totalBasePrice: number }] }
      // or { totalBasePrice: number } at top level
      if (responseData.rateOptions?.length > 0) {
        return responseData.rateOptions[0].totalBasePrice;
      }
      if (typeof responseData.totalBasePrice === 'number') {
        return responseData.totalBasePrice;
      }
      // Try rates array format
      if (responseData.rates?.length > 0) {
        return responseData.rates[0].price ?? responseData.rates[0].totalBasePrice;
      }
      return null;
    } catch {
      return null;
    }
  }

  private getCalculatedRates(weightOz: number, destinationCountry?: string): ShippingRate[] {
    // Calculate rates based on weight
    // These are approximations based on typical USPS rates

    const isInternational = destinationCountry && destinationCountry !== 'US';

    if (isInternational) {
      // International shipping (Canada only for now)
      const baseRate = 15.99;
      const perOzRate = 0.15;
      const standardPrice = baseRate + Math.ceil(weightOz / 16) * perOzRate * 16;
      const priorityPrice = standardPrice * 1.75;

      return [
        {
          method: 'standard',
          name: 'International Standard',
          description: '10-15 business days',
          price: Math.round(standardPrice * 100) / 100,
          estimatedDays: '10-15 business days',
        },
        {
          method: 'priority',
          name: 'International Priority',
          description: '6-10 business days',
          price: Math.round(priorityPrice * 100) / 100,
          estimatedDays: '6-10 business days',
        },
      ];
    }

    // Domestic US shipping rates (based on weight tiers)
    let standardPrice: number;
    let priorityPrice: number;

    if (weightOz <= 4) {
      // First Class package (up to 4 oz)
      standardPrice = 4.50;
      priorityPrice = 9.25;
    } else if (weightOz <= 8) {
      // 4-8 oz
      standardPrice = 5.25;
      priorityPrice = 9.85;
    } else if (weightOz <= 16) {
      // 8 oz to 1 lb
      standardPrice = 6.50;
      priorityPrice = 10.50;
    } else if (weightOz <= 32) {
      // 1-2 lbs
      standardPrice = 8.50;
      priorityPrice = 13.50;
    } else if (weightOz <= 48) {
      // 2-3 lbs
      standardPrice = 10.50;
      priorityPrice = 16.00;
    } else if (weightOz <= 64) {
      // 3-4 lbs
      standardPrice = 12.50;
      priorityPrice = 18.50;
    } else if (weightOz <= 80) {
      // 4-5 lbs
      standardPrice = 14.50;
      priorityPrice = 21.00;
    } else {
      // Over 5 lbs - calculate per pound
      const extraPounds = Math.ceil((weightOz - 80) / 16);
      standardPrice = 14.50 + extraPounds * 2.50;
      priorityPrice = 21.00 + extraPounds * 3.50;
    }

    return [
      {
        method: 'standard',
        name: 'USPS Ground Advantage',
        description: '2-5 business days',
        price: standardPrice,
        estimatedDays: '2-5 business days',
      },
      {
        method: 'priority',
        name: 'USPS Priority Mail',
        description: '1-3 business days',
        price: priorityPrice,
        estimatedDays: '1-3 business days',
      },
    ];
  }

  // Calculate total shipping for an order with a specific method
  async calculateOrderShipping(
    items: Array<{ productId: string; quantity: number }>,
    method: 'standard' | 'priority',
    destinationZip: string,
    destinationCountry: string = 'US',
  ): Promise<number> {
    const rates = await this.calculateRates({
      items,
      destinationZip,
      destinationCountry,
    });

    const selectedRate = rates.find((r) => r.method === method);
    return selectedRate?.price || 0;
  }
}
