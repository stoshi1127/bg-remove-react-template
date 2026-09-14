import {
  getProcessingConcurrencyLimit,
  LARGE_BATCH_PROCESSING_CONCURRENCY,
} from '../concurrency';

describe('processing concurrency', () => {
  test('keeps the requested limit for ordinary batches', () => {
    expect(getProcessingConcurrencyLimit(20, 5)).toBe(5);
  });

  test('limits batches over 20 images before work starts', () => {
    expect(getProcessingConcurrencyLimit(21, 5)).toBe(LARGE_BATCH_PROCESSING_CONCURRENCY);
    expect(getProcessingConcurrencyLimit(30, 10)).toBe(LARGE_BATCH_PROCESSING_CONCURRENCY);
  });

  test('never raises or drops the limit below one', () => {
    expect(getProcessingConcurrencyLimit(30, 2)).toBe(2);
    expect(getProcessingConcurrencyLimit(1, 0)).toBe(1);
  });
});
