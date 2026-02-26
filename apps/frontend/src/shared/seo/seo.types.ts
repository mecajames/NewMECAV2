/**
 * SEO Types for the MECA Car Audio platform
 */

export interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  image?: string;
  type?: 'website' | 'article' | 'event' | 'product';
  noindex?: boolean;
  jsonLd?: object | object[];
  breadcrumbs?: { name: string; path: string }[];
}

export interface EventSEOData {
  id: string;
  title: string;
  description?: string;
  date: string;
  location: {
    name: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  image?: string;
  price?: number;
}

export interface ProductSEOData {
  id: string;
  name: string;
  description?: string;
  image?: string;
  price: number;
  sku?: string;
  inStock: boolean;
}

export interface ProfileSEOData {
  id: string;
  name: string;
  description?: string;
  image?: string;
  type: 'member' | 'team' | 'retailer' | 'manufacturer' | 'judge' | 'eventDirector';
}

export interface RetailerSEOData {
  id: string;
  name: string;
  description?: string;
  image?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  phone?: string;
  email?: string;
  website?: string;
}

export interface FAQPageSEOData {
  faqs: { question: string; answer: string }[];
}
