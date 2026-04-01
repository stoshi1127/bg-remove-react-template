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

  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title,
    page_location: new URL(path, window.location.origin).toString(),
    send_to: GA_MEASUREMENT_ID,
  });
}
