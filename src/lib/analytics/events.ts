type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

export const GA_MEASUREMENT_ID = 'G-YT0ZDBKL81' as const;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackAnalyticsEvent(name: string, payload: AnalyticsPayload = {}) {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', name, payload);
}

export function trackPageView(path: string, title?: string) {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag !== 'function') return;

  const url = new URL(path, window.location.origin);

  window.gtag('event', 'page_view', {
    // GA4's Landing page + query string dimension appends the query from
    // page_location. Keeping it out of page_path avoids duplicated values such
    // as /?buyPro=1?buyPro=1 while preserving the full URL for analysis.
    page_path: url.pathname,
    page_title: title,
    page_location: url.toString(),
    send_to: GA_MEASUREMENT_ID,
  });
}
