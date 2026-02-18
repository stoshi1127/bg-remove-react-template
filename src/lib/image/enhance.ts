export type EnhanceTarget = '1k' | '2k' | '4k';

export function toEnhanceLongSide(target: EnhanceTarget): number {
  if (target === '1k') return 1024;
  if (target === '4k') return 3840;
  return 2048;
}

function clampLongSide(width: number, height: number, maxLongSide: number) {
  const longSide = Math.max(width, height);
  if (longSide <= maxLongSide) return { width, height, longSide };
  const ratio = maxLongSide / longSide;
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
    longSide: maxLongSide,
  };
}

async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('画像の読み込みに失敗しました。'));
    image.src = dataUrl;
  });
}

async function renderToDataUrl(dataUrl: string, width: number, height: number): Promise<string> {
  const image = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('画像処理の準備に失敗しました。');
  ctx.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL('image/png');
}

export async function normalizeDataUrlLongSide(dataUrl: string, maxLongSide: number): Promise<{
  dataUrl: string;
  width: number;
  height: number;
  longSide: number;
}> {
  const image = await loadImage(dataUrl);
  const next = clampLongSide(image.naturalWidth, image.naturalHeight, maxLongSide);
  if (next.width === image.naturalWidth && next.height === image.naturalHeight) {
    return {
      dataUrl,
      width: next.width,
      height: next.height,
      longSide: next.longSide,
    };
  }

  return {
    dataUrl: await renderToDataUrl(dataUrl, next.width, next.height),
    width: next.width,
    height: next.height,
    longSide: next.longSide,
  };
}

export async function resizeDataUrlLongSide(dataUrl: string, targetLongSide: number): Promise<string> {
  const image = await loadImage(dataUrl);
  const currentLongSide = Math.max(image.naturalWidth, image.naturalHeight);
  if (currentLongSide === targetLongSide) return dataUrl;

  const ratio = targetLongSide / currentLongSide;
  const width = Math.max(1, Math.round(image.naturalWidth * ratio));
  const height = Math.max(1, Math.round(image.naturalHeight * ratio));
  return renderToDataUrl(dataUrl, width, height);
}

export function pickEsrganScaleForTarget(currentLongSide: number, targetLongSide: number): 2 | 4 {
  if (currentLongSide <= 0) return 2;
  const ratio = targetLongSide / currentLongSide;
  return ratio > 2.6 ? 4 : 2;
}
