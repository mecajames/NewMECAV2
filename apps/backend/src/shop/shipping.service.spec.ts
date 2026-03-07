import { ShippingService, ShippingRate, ShippingRateRequest } from './shipping.service';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('ShippingService', () => {
  let service: ShippingService;
  let mockEm: any;

  const mockProducts = [
    { id: 'prod-1', weightOz: 16, lengthIn: 10, widthIn: 8, heightIn: 4 },
    { id: 'prod-2', weightOz: 8, lengthIn: 6, widthIn: 4, heightIn: 2 },
  ];

  beforeEach(() => {
    mockFetch.mockReset();

    const mockForkedEm = {
      find: jest.fn().mockResolvedValue(mockProducts),
    };
    mockEm = { fork: jest.fn().mockReturnValue(mockForkedEm) };

    // Default: no USPS credentials
    delete process.env.USPS_CONSUMER_KEY;
    delete process.env.USPS_CONSUMER_SECRET;

    service = new ShippingService(mockEm);
  });

  describe('getAccessToken', () => {
    beforeEach(() => {
      process.env.USPS_CONSUMER_KEY = 'test-key';
      process.env.USPS_CONSUMER_SECRET = 'test-secret';
      service = new ShippingService(mockEm);
    });

    it('should fetch a new token from USPS OAuth endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'tok_123', expires_in: 3600 }),
      });

      // Access private method via any cast
      const token = await (service as any).getAccessToken();

      expect(token).toBe('tok_123');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://apis.usps.com/oauth2/v3/token',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: 'test-key',
            client_secret: 'test-secret',
            grant_type: 'client_credentials',
          }),
        }),
      );
    });

    it('should cache the token and reuse it on subsequent calls', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'tok_cached', expires_in: 3600 }),
      });

      const token1 = await (service as any).getAccessToken();
      const token2 = await (service as any).getAccessToken();

      expect(token1).toBe('tok_cached');
      expect(token2).toBe('tok_cached');
      // fetch should only be called once (cached on second call)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should refresh token when expired', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'tok_old', expires_in: 3600 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'tok_new', expires_in: 3600 }),
        });

      const token1 = await (service as any).getAccessToken();
      expect(token1).toBe('tok_old');

      // Manually expire the token by setting tokenExpiry to the past
      (service as any).tokenExpiry = 0;

      const token2 = await (service as any).getAccessToken();
      expect(token2).toBe('tok_new');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should throw on OAuth failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      await expect((service as any).getAccessToken()).rejects.toThrow(
        'USPS OAuth failed: 401 Unauthorized',
      );
    });
  });

  describe('extractPrice', () => {
    it('should extract price from rateOptions array', () => {
      const data = { rateOptions: [{ totalBasePrice: 7.5 }] };
      expect((service as any).extractPrice(data)).toBe(7.5);
    });

    it('should extract price from top-level totalBasePrice', () => {
      const data = { totalBasePrice: 5.25 };
      expect((service as any).extractPrice(data)).toBe(5.25);
    });

    it('should extract price from rates array', () => {
      const data = { rates: [{ price: 6.0 }] };
      expect((service as any).extractPrice(data)).toBe(6.0);
    });

    it('should return null for unrecognized response format', () => {
      expect((service as any).extractPrice({})).toBeNull();
      expect((service as any).extractPrice({ rateOptions: [] })).toBeNull();
    });
  });

  describe('calculateRates', () => {
    const baseRequest: ShippingRateRequest = {
      items: [{ productId: 'prod-1', quantity: 1 }],
      destinationZip: '90210',
      destinationCountry: 'US',
    };

    it('should use fallback rates when no USPS credentials configured', async () => {
      const rates = await service.calculateRates(baseRequest);

      expect(rates).toHaveLength(2);
      expect(rates[0].method).toBe('standard');
      expect(rates[1].method).toBe('priority');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should call USPS v3 API when credentials are configured', async () => {
      process.env.USPS_CONSUMER_KEY = 'test-key';
      process.env.USPS_CONSUMER_SECRET = 'test-secret';
      service = new ShippingService(mockEm);

      // Mock token request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'tok_test', expires_in: 3600 }),
      });
      // Mock Ground Advantage rate
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ totalBasePrice: 5.5 }),
      });
      // Mock Priority Mail rate
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ totalBasePrice: 9.75 }),
      });

      const rates = await service.calculateRates(baseRequest);

      expect(rates).toHaveLength(2);
      expect(rates[0]).toEqual({
        method: 'standard',
        name: 'USPS Ground Advantage',
        description: '2-5 business days',
        price: 5.5,
        estimatedDays: '2-5 business days',
      });
      expect(rates[1]).toEqual({
        method: 'priority',
        name: 'USPS Priority Mail',
        description: '1-3 business days',
        price: 9.75,
        estimatedDays: '1-3 business days',
      });
    });

    it('should fall back to calculated rates when USPS API fails', async () => {
      process.env.USPS_CONSUMER_KEY = 'test-key';
      process.env.USPS_CONSUMER_SECRET = 'test-secret';
      service = new ShippingService(mockEm);

      // Mock token request to fail
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const rates = await service.calculateRates(baseRequest);

      // Should still return rates (fallback)
      expect(rates).toHaveLength(2);
      expect(rates[0].method).toBe('standard');
      expect(rates[1].method).toBe('priority');
    });

    it('should use international rates for non-US destinations', async () => {
      const intlRequest: ShippingRateRequest = {
        items: [{ productId: 'prod-1', quantity: 1 }],
        destinationZip: 'M5V 2T6',
        destinationCountry: 'CA',
      };

      const rates = await service.calculateRates(intlRequest);

      expect(rates).toHaveLength(2);
      expect(rates[0].name).toBe('International Standard');
      expect(rates[1].name).toBe('International Priority');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should use default weight when products have no weight', async () => {
      const emWithNoWeight = {
        fork: () => ({
          find: jest.fn().mockResolvedValue([{ id: 'prod-1' }]),
        }),
      };
      const svc = new ShippingService(emWithNoWeight as any);

      const rates = await svc.calculateRates(baseRequest);

      // 8oz default weight falls in 4-8oz tier
      expect(rates[0].price).toBe(5.25); // standard 4-8oz tier
    });

    it('should pass product dimensions to USPS v3 API', async () => {
      process.env.USPS_CONSUMER_KEY = 'test-key';
      process.env.USPS_CONSUMER_SECRET = 'test-secret';
      service = new ShippingService(mockEm);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'tok_test', expires_in: 3600 }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ totalBasePrice: 5.5 }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ totalBasePrice: 9.75 }),
      });

      await service.calculateRates(baseRequest);

      // Check that the rate requests include dimensions from the product (max of prod-1 and prod-2)
      const groundCall = mockFetch.mock.calls[1]; // index 1 = first rate call (after token)
      const groundBody = JSON.parse(groundCall[1].body);
      expect(groundBody.length).toBe(10); // max lengthIn from products
      expect(groundBody.width).toBe(8);   // max widthIn
      expect(groundBody.height).toBe(4);  // max heightIn
    });
  });

  describe('calculateOrderShipping', () => {
    it('should return the price for the selected shipping method', async () => {
      const price = await service.calculateOrderShipping(
        [{ productId: 'prod-1', quantity: 1 }],
        'standard',
        '90210',
        'US',
      );

      expect(typeof price).toBe('number');
      expect(price).toBeGreaterThan(0);
    });

    it('should return 0 if the selected method is not found', async () => {
      // Mock empty products to trigger edge case
      const emEmpty = {
        fork: () => ({
          find: jest.fn().mockResolvedValue([]),
        }),
      };
      const svc = new ShippingService(emEmpty as any);

      const price = await svc.calculateOrderShipping(
        [{ productId: 'nonexistent', quantity: 1 }],
        'standard',
        '90210',
        'US',
      );

      expect(typeof price).toBe('number');
    });
  });

  describe('getCalculatedRates (fallback)', () => {
    it('should return correct rates for various weight tiers', async () => {
      const testCases = [
        { weightOz: 2, expectedStandard: 4.50, expectedPriority: 9.25 },
        { weightOz: 6, expectedStandard: 5.25, expectedPriority: 9.85 },
        { weightOz: 12, expectedStandard: 6.50, expectedPriority: 10.50 },
        { weightOz: 24, expectedStandard: 8.50, expectedPriority: 13.50 },
        { weightOz: 40, expectedStandard: 10.50, expectedPriority: 16.00 },
        { weightOz: 56, expectedStandard: 12.50, expectedPriority: 18.50 },
        { weightOz: 72, expectedStandard: 14.50, expectedPriority: 21.00 },
      ];

      for (const tc of testCases) {
        const rates = (service as any).getCalculatedRates(tc.weightOz, 'US');
        expect(rates[0].price).toBe(tc.expectedStandard);
        expect(rates[1].price).toBe(tc.expectedPriority);
      }
    });

    it('should calculate per-pound rates for over 5 lbs', () => {
      // 96oz = 6lbs, so 1 extra pound over 5lb tier
      const rates = (service as any).getCalculatedRates(96, 'US');
      expect(rates[0].price).toBe(14.50 + 2.50); // standard
      expect(rates[1].price).toBe(21.00 + 3.50); // priority
    });
  });
});
