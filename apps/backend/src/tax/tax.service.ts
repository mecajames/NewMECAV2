import { Injectable } from '@nestjs/common';

export interface TaxCalculation {
  taxAmount: number;
  taxRate: number;
  taxName: string;
}

@Injectable()
export class TaxService {
  private readonly taxRate: number;
  private readonly taxName: string;

  constructor() {
    const ratePercent = parseFloat(process.env.TAX_RATE_PERCENT || '0');
    this.taxRate = isNaN(ratePercent) ? 0 : ratePercent / 100;
    this.taxName = process.env.TAX_NAME || 'KY Sales Tax';
  }

  getRate(): { taxRate: number; taxName: string } {
    return { taxRate: this.taxRate, taxName: this.taxName };
  }

  calculateTax(subtotal: number): TaxCalculation {
    if (this.taxRate === 0 || subtotal <= 0) {
      return { taxAmount: 0, taxRate: 0, taxName: this.taxName };
    }

    // Integer-cent math to avoid floating-point errors
    const subtotalCents = Math.round(subtotal * 100);
    const taxCents = Math.round(subtotalCents * this.taxRate);
    const taxAmount = taxCents / 100;

    return {
      taxAmount,
      taxRate: this.taxRate,
      taxName: this.taxName,
    };
  }
}
