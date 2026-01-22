import { SITE_CONFIG } from '../seo.constants';
import type { EventSEOData } from '../seo.types';

/**
 * Generate JSON-LD Event schema for event detail pages
 */
export function generateEventSchema(event: EventSEOData) {
  const eventDate = new Date(event.date);

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description:
      event.description || `Car audio competition event at ${event.location.name}`,
    startDate: eventDate.toISOString(),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: event.location.name,
      address: {
        '@type': 'PostalAddress',
        streetAddress: event.location.address,
        addressLocality: event.location.city,
        addressRegion: event.location.state,
        addressCountry: event.location.country || 'US',
      },
    },
    image: event.image || SITE_CONFIG.defaultImage,
    organizer: {
      '@type': 'Organization',
      name: SITE_CONFIG.organizationName,
      url: SITE_CONFIG.siteUrl,
    },
    ...(event.price !== undefined &&
      event.price > 0 && {
        offers: {
          '@type': 'Offer',
          price: event.price,
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
          url: `${SITE_CONFIG.siteUrl}/events/${event.id}/register`,
        },
      }),
  };
}
