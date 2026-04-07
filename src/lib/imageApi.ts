export const IMAGE_RESPONSE_MODE_HEADER = 'x-image-response-mode';

export type ImageResponseMode = 'url' | 'blob';

export type ImageSuccessResponse = {
  ok: true;
  outputUrl: string;
  contentType: string;
  processingMode?: string;
  premiumRemaining?: number;
};

export function getDefaultImageResponseMode(): ImageResponseMode {
  return process.env.NEXT_PUBLIC_IMAGE_API_MODE === 'blob' ? 'blob' : 'url';
}

export function getRequestedImageResponseMode(request: Request): ImageResponseMode {
  const requested = request.headers.get(IMAGE_RESPONSE_MODE_HEADER)?.toLowerCase();
  if (requested === 'blob' || requested === 'url') {
    return requested;
  }

  return getDefaultImageResponseMode();
}

