const IMAGE_PROXY_PATH = '/api/image-proxy';

function isSameOriginUrl(url: string): boolean {
  if (url.startsWith('/')) {
    return true;
  }

  try {
    return new URL(url, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

export function toCanvasSafeImageUrl(url: string): string {
  if (!url || typeof window === 'undefined') {
    return url;
  }

  if (url.startsWith('data:') || url.startsWith('blob:') || isSameOriginUrl(url)) {
    return url;
  }

  return `${IMAGE_PROXY_PATH}?url=${encodeURIComponent(url)}`;
}
