import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { ShopProduct } from './entities/shop-product.entity';
import { ShopAddress } from '@newmeca/shared';

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

@Injectable()
export class ShippingService {
  private readonly uspsUserId: string | undefined;

  constructor(
    @Inject('EntityManager')
    private readonly em: EntityManager,
  ) {
    this.uspsUserId = process.env.USPS_USER_ID;
  }

  async calculateRates(request: ShippingRateRequest): Promise<ShippingRate[]> {
    const em = this.em.fork();

    // Get products to calculate total weight
    const productIds = request.items.map((item) => item.productId);
    const products = await em.find(ShopProduct, { id: { $in: productIds } });

    // Calculate total weight in ounces
    let totalWeightOz = 0;
    for (const item of request.items) {
      const product = products.find((p) => p.id === item.productId);
      if (product?.weightOz) {
        totalWeightOz += Number(product.weightOz) * item.quantity;
      }
    }

    // Default minimum weight (8 oz) if no weights set
    if (totalWeightOz === 0) {
      totalWeightOz = 8;
    }

    // If USPS credentials are configured, use USPS API
    if (this.uspsUserId && request.destinationCountry === 'US') {
      try {
        return await this.getUspsRates(totalWeightOz, request.destinationZip);
      } catch (error) {
        console.error('USPS API error, falling back to calculated rates:', error);
      }
    }

    // Fall back to calculated rates
    return this.getCalculatedRates(totalWeightOz, request.destinationCountry);
  }

  private async getUspsRates(weightOz: number, destinationZip: string): Promise<ShippingRate[]> {
    // Convert ounces to pounds and ounces for USPS API
    const pounds = Math.floor(weightOz / 16);
    const ounces = weightOz % 16;

    // USPS Web Tools Rate Calculator V4 API
    const xml = `
      <RateV4Request USERID="${this.uspsUserId}">
        <Revision>2</Revision>
        <Package ID="1">
          <Service>PRIORITY</Service>
          <ZipOrigination>${ORIGIN_ZIP}</ZipOrigination>
          <ZipDestination>${destinationZip}</ZipDestination>
          <Pounds>${pounds}</Pounds>
          <Ounces>${ounces}</Ounces>
          <Container>VARIABLE</Container>
          <Width></Width>
          <Length></Length>
          <Height></Height>
          <Girth></Girth>
          <Machinable>true</Machinable>
        </Package>
        <Package ID="2">
          <Service>PARCEL SELECT GROUND</Service>
          <ZipOrigination>${ORIGIN_ZIP}</ZipOrigination>
          <ZipDestination>${destinationZip}</ZipDestination>
          <Pounds>${pounds}</Pounds>
          <Ounces>${ounces}</Ounces>
          <Container>VARIABLE</Container>
          <Width></Width>
          <Length></Length>
          <Height></Height>
          <Girth></Girth>
          <Machinable>true</Machinable>
        </Package>
      </RateV4Request>
    `.trim();

    const url = `https://secure.shippingapis.com/ShippingAPI.dll?API=RateV4&XML=${encodeURIComponent(xml)}`;

    const response = await fetch(url);
    const text = await response.text();

    // Parse USPS XML response
    const rates: ShippingRate[] = [];

    // Extract Priority Mail rate
    const priorityMatch = text.match(/<Package ID="1">[\s\S]*?<Rate>([\d.]+)<\/Rate>/);
    if (priorityMatch) {
      rates.push({
        method: 'priority',
        name: 'USPS Priority Mail',
        description: '1-3 business days',
        price: parseFloat(priorityMatch[1]),
        estimatedDays: '1-3 business days',
      });
    }

    // Extract Ground rate
    const groundMatch = text.match(/<Package ID="2">[\s\S]*?<Rate>([\d.]+)<\/Rate>/);
    if (groundMatch) {
      rates.push({
        method: 'standard',
        name: 'USPS Ground Advantage',
        description: '2-5 business days',
        price: parseFloat(groundMatch[1]),
        estimatedDays: '2-5 business days',
      });
    }

    // If we got rates from USPS, return them (standard first, then priority)
    if (rates.length > 0) {
      return rates.sort((a, b) => a.price - b.price);
    }

    // Fall back to calculated rates if USPS parsing failed
    return this.getCalculatedRates(weightOz, 'US');
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
