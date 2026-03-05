import { Injectable, Logger } from '@nestjs/common';

interface GeocodeResult {
  latitude: number;
  longitude: number;
}

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);

  /**
   * Geocode an address using the Google Geocoding API.
   * Returns null on any failure so event creation is never blocked.
   */
  async geocodeAddress(
    address?: string,
    city?: string,
    state?: string,
    postalCode?: string,
    country?: string,
  ): Promise<GeocodeResult | null> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      this.logger.warn('GOOGLE_MAPS_API_KEY is not set — skipping geocoding');
      return null;
    }

    // Build full address string from components
    const parts = [address, city, state, postalCode, country].filter(Boolean);
    if (parts.length === 0) {
      return null;
    }
    const fullAddress = parts.join(', ');

    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        this.logger.warn(`Geocoding HTTP error ${response.status} for "${fullAddress}"`);
        return null;
      }

      const data: any = await response.json();

      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        this.logger.warn(`Geocoding returned status "${data.status}" for "${fullAddress}"`);
        return null;
      }

      const location = data.results[0].geometry.location;
      this.logger.log(`Geocoded "${fullAddress}" → ${location.lat}, ${location.lng}`);

      return {
        latitude: location.lat,
        longitude: location.lng,
      };
    } catch (error) {
      this.logger.error(`Geocoding failed for "${fullAddress}":`, error);
      return null;
    }
  }
}
