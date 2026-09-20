import { composeRefinementOutput } from '../imageComposition';

test('recomputes an initial fit-subject crop from the transparent foreground', async () => {
  const originalImage = global.Image;
  class LoadedImage {
    naturalWidth = 100;
    naturalHeight = 100;
    onload: null | (() => void) = null;
    onerror: null | (() => void) = null;
    set src(_: string) { Promise.resolve().then(() => this.onload?.()); }
  }
  Object.defineProperty(global, 'Image', { configurable: true, value: LoadedImage });

  const pixels = new Uint8ClampedArray(100 * 100 * 4);
  for (let y = 20; y <= 80; y += 1) {
    for (let x = 60; x <= 90; x += 1) pixels[(y * 100 + x) * 4 + 3] = 255;
  }
  const drawImage = jest.fn();
  (HTMLCanvasElement.prototype.getContext as jest.Mock).mockReturnValue({
    drawImage,
    getImageData: jest.fn(() => ({ data: pixels })),
  });

  try {
    await composeRefinementOutput({
      transparentUrl: 'blob:foreground', background: null, ratio: 'fit-subject',
      boundingBox: { x: 0, y: 0, width: 30, height: 30 },
      recalculateBoundingBox: true, maxSide: 160,
    });
    const crop = drawImage.mock.calls.find(args => args.length === 9);
    expect(crop?.slice(1, 5)).toEqual([58, 18, 35, 65]);
  } finally {
    Object.defineProperty(global, 'Image', { configurable: true, value: originalImage });
  }
});
