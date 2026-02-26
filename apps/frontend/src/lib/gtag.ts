declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA4_MEASUREMENT_ID as string | undefined;

export function initializeGA4(): void {
  if (!GA_MEASUREMENT_ID) return;

  // Load gtag.js script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  // Initialize dataLayer and gtag
  window.dataLayer = window.dataLayer || [];
  window.gtag = function (...args: unknown[]) {
    window.dataLayer.push(args);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    send_page_view: false, // We handle SPA page views manually
  });
}

export function trackPageView(path: string): void {
  if (!GA_MEASUREMENT_ID || !window.gtag) return;
  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: path,
  });
}

export function trackEvent(
  action: string,
  category: string,
  label?: string,
  value?: number,
): void {
  if (!GA_MEASUREMENT_ID || !window.gtag) return;
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value,
  });
}

// ===========================================================================
// GA4 Ecommerce Events
// https://developers.google.com/analytics/devguides/collection/ga4/ecommerce
// ===========================================================================

export interface EcommerceItem {
  item_id: string;
  item_name: string;
  price: number;
  quantity?: number;
  item_category?: string;
}

export function trackViewItemList(items: EcommerceItem[], listName: string): void {
  if (!GA_MEASUREMENT_ID || !window.gtag) return;
  window.gtag('event', 'view_item_list', {
    item_list_name: listName,
    items: items.map((item, i) => ({ ...item, index: i })),
  });
}

export function trackViewItem(item: EcommerceItem): void {
  if (!GA_MEASUREMENT_ID || !window.gtag) return;
  window.gtag('event', 'view_item', {
    currency: 'USD',
    value: item.price,
    items: [item],
  });
}

export function trackAddToCart(item: EcommerceItem): void {
  if (!GA_MEASUREMENT_ID || !window.gtag) return;
  window.gtag('event', 'add_to_cart', {
    currency: 'USD',
    value: item.price * (item.quantity || 1),
    items: [item],
  });
}

export function trackRemoveFromCart(item: EcommerceItem): void {
  if (!GA_MEASUREMENT_ID || !window.gtag) return;
  window.gtag('event', 'remove_from_cart', {
    currency: 'USD',
    value: item.price * (item.quantity || 1),
    items: [item],
  });
}

export function trackViewCart(items: EcommerceItem[], total: number): void {
  if (!GA_MEASUREMENT_ID || !window.gtag) return;
  window.gtag('event', 'view_cart', {
    currency: 'USD',
    value: total,
    items,
  });
}

export function trackBeginCheckout(items: EcommerceItem[], total: number): void {
  if (!GA_MEASUREMENT_ID || !window.gtag) return;
  window.gtag('event', 'begin_checkout', {
    currency: 'USD',
    value: total,
    items,
  });
}

export function trackAddShippingInfo(items: EcommerceItem[], total: number, shippingTier?: string): void {
  if (!GA_MEASUREMENT_ID || !window.gtag) return;
  window.gtag('event', 'add_shipping_info', {
    currency: 'USD',
    value: total,
    shipping_tier: shippingTier,
    items,
  });
}

export function trackPurchase(
  transactionId: string,
  items: EcommerceItem[],
  total: number,
  shipping?: number,
  tax?: number,
): void {
  if (!GA_MEASUREMENT_ID || !window.gtag) return;
  window.gtag('event', 'purchase', {
    transaction_id: transactionId,
    currency: 'USD',
    value: total,
    shipping: shipping || 0,
    tax: tax || 0,
    items,
  });
}
