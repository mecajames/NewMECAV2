import { TaxService } from './tax.service';

describe('TaxService', () => {
  afterEach(() => {
    delete process.env.TAX_RATE_PERCENT;
    delete process.env.TAX_NAME;
  });

  describe('constructor', () => {
    it('should default to 0 rate when TAX_RATE_PERCENT is not set', () => {
      const service = new TaxService();
      const result = service.calculateTax(100);
      expect(result.taxAmount).toBe(0);
      expect(result.taxRate).toBe(0);
    });

    it('should parse TAX_RATE_PERCENT from env', () => {
      process.env.TAX_RATE_PERCENT = '6';
      const service = new TaxService();
      const result = service.calculateTax(100);
      expect(result.taxRate).toBe(0.06);
      expect(result.taxAmount).toBe(6);
    });

    it('should handle non-numeric TAX_RATE_PERCENT gracefully', () => {
      process.env.TAX_RATE_PERCENT = 'abc';
      const service = new TaxService();
      const result = service.calculateTax(100);
      expect(result.taxAmount).toBe(0);
      expect(result.taxRate).toBe(0);
    });

    it('should use custom TAX_NAME from env', () => {
      process.env.TAX_RATE_PERCENT = '6';
      process.env.TAX_NAME = 'Custom Tax';
      const service = new TaxService();
      const result = service.calculateTax(100);
      expect(result.taxName).toBe('Custom Tax');
    });

    it('should default taxName to KY Sales Tax', () => {
      process.env.TAX_RATE_PERCENT = '6';
      const service = new TaxService();
      const result = service.calculateTax(100);
      expect(result.taxName).toBe('KY Sales Tax');
    });
  });

  describe('calculateTax', () => {
    let service: TaxService;

    beforeEach(() => {
      process.env.TAX_RATE_PERCENT = '6';
      service = new TaxService();
    });

    it('should calculate 6% tax on $100', () => {
      const result = service.calculateTax(100);
      expect(result.taxAmount).toBe(6);
      expect(result.taxRate).toBe(0.06);
      expect(result.taxName).toBe('KY Sales Tax');
    });

    it('should calculate tax on $29.99', () => {
      const result = service.calculateTax(29.99);
      expect(result.taxAmount).toBe(1.80); // 29.99 * 0.06 = 1.7994, rounded to cents = 1.80
    });

    it('should calculate tax on $1.00', () => {
      const result = service.calculateTax(1.0);
      expect(result.taxAmount).toBe(0.06);
    });

    it('should return 0 tax for $0 subtotal', () => {
      const result = service.calculateTax(0);
      expect(result.taxAmount).toBe(0);
    });

    it('should return 0 tax for negative subtotal', () => {
      const result = service.calculateTax(-10);
      expect(result.taxAmount).toBe(0);
    });

    it('should avoid floating-point precision errors', () => {
      // 33.33 * 0.06 = 1.9998 in floating point, should round to 2.00
      const result = service.calculateTax(33.33);
      expect(result.taxAmount).toBe(2.0);
    });

    it('should handle small amounts correctly', () => {
      // 0.10 * 0.06 = 0.006, rounds to 0.01
      const result = service.calculateTax(0.10);
      expect(result.taxAmount).toBe(0.01);
    });

    it('should handle large amounts correctly', () => {
      const result = service.calculateTax(9999.99);
      expect(result.taxAmount).toBe(600.0); // 9999.99 * 0.06 = 599.9994, rounds to 600.00
    });

    it('should return 0 when tax rate is 0', () => {
      process.env.TAX_RATE_PERCENT = '0';
      const svc = new TaxService();
      const result = svc.calculateTax(100);
      expect(result.taxAmount).toBe(0);
      expect(result.taxRate).toBe(0);
    });
  });
});
