export const DEFAULT_PROCESSING_CONCURRENCY = 5;
export const LARGE_BATCH_PROCESSING_CONCURRENCY = 3;

export function getProcessingConcurrencyLimit(
  imageCount: number,
  requestedLimit = DEFAULT_PROCESSING_CONCURRENCY,
): number {
  const safeRequestedLimit = Math.max(1, Math.floor(requestedLimit));
  if (imageCount > 20) {
    return Math.min(LARGE_BATCH_PROCESSING_CONCURRENCY, safeRequestedLimit);
  }
  return safeRequestedLimit;
}
