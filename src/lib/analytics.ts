export const META_PIXEL_ID_REGEX = /^\d{5,25}$/;
export const GA4_ID_REGEX = /^G-[A-Z0-9]{4,20}$/i;

export function isValidMetaPixelId(id?: string | null): boolean {
  if (!id) return false;
  return META_PIXEL_ID_REGEX.test(id.trim());
}

export function isValidGa4MeasurementId(id?: string | null): boolean {
  if (!id) return false;
  return GA4_ID_REGEX.test(id.trim());
}

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: any;
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
    __imperioMetaPixelId?: string;
    __imperioGa4Id?: string;
  }
}

export function initTrackingPixels(config?: {
  meta_pixel_id?: string | null;
  ga4_measurement_id?: string | null;
}) {
  if (typeof window === "undefined" || typeof document === "undefined" || !config) return;

  const metaId = (config.meta_pixel_id || "").trim();
  if (isValidMetaPixelId(metaId) && window.__imperioMetaPixelId !== metaId) {
    window.__imperioMetaPixelId = metaId;
    if (!window.fbq) {
      const fbqFn: any = function (...args: any[]) {
        if (fbqFn.callMethod) {
          fbqFn.callMethod(...args);
        } else {
          fbqFn.queue.push(args);
        }
      };
      fbqFn.push = fbqFn;
      fbqFn.loaded = true;
      fbqFn.version = "2.0";
      fbqFn.queue = [];
      window.fbq = fbqFn;
      window._fbq = fbqFn;

      const script = document.createElement("script");
      script.async = true;
      script.src = "https://connect.facebook.net/en_US/fbevents.js";
      document.head.appendChild(script);
    }
    window.fbq?.("init", metaId);
    window.fbq?.("track", "PageView");
  }

  const ga4Id = (config.ga4_measurement_id || "").trim().toUpperCase();
  if (isValidGa4MeasurementId(ga4Id) && window.__imperioGa4Id !== ga4Id) {
    window.__imperioGa4Id = ga4Id;
    window.dataLayer = window.dataLayer || [];
    if (!window.gtag) {
      window.gtag = function (...args: any[]) {
        window.dataLayer!.push(args);
      };
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4Id)}`;
      document.head.appendChild(script);
      window.gtag("js", new Date());
    }
    window.gtag?.("config", ga4Id);
  }
}

export function trackAddToCart(params: {
  id: string;
  name: string;
  price: number;
  quantity?: number;
}) {
  if (typeof window === "undefined") return;
  const qty = params.quantity ?? 1;
  const value = Number((params.price * qty).toFixed(2));
  try {
    window.fbq?.("track", "AddToCart", {
      content_ids: [params.id],
      content_name: params.name,
      content_type: "product",
      value,
      currency: "BRL",
    });
    window.gtag?.("event", "add_to_cart", {
      currency: "BRL",
      value,
      items: [{ item_id: params.id, item_name: params.name, price: params.price, quantity: qty }],
    });
  } catch {
    // Analytics must never break checkout
  }
}

export function trackInitiateCheckout(params: { total: number; numItems: number }) {
  if (typeof window === "undefined") return;
  try {
    window.fbq?.("track", "InitiateCheckout", {
      value: Number(params.total.toFixed(2)),
      num_items: params.numItems,
      currency: "BRL",
    });
    window.gtag?.("event", "begin_checkout", {
      currency: "BRL",
      value: Number(params.total.toFixed(2)),
    });
  } catch {
    // Non-blocking
  }
}

export function trackPurchase(params: {
  orderId: string;
  total: number;
  couponCode?: string | null;
  itemsCount: number;
}) {
  if (typeof window === "undefined") return;
  try {
    window.fbq?.("track", "Purchase", {
      value: Number(params.total.toFixed(2)),
      currency: "BRL",
      num_items: params.itemsCount,
      order_id: params.orderId,
    });
    window.gtag?.("event", "purchase", {
      transaction_id: params.orderId,
      value: Number(params.total.toFixed(2)),
      currency: "BRL",
      ...(params.couponCode ? { coupon: params.couponCode } : {}),
    });
  } catch {
    // Non-blocking
  }
}
