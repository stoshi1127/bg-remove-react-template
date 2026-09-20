import { toCanvasSafeImageUrl } from '@/lib/client/canvasImage';

export type BoundingBox = { x: number; y: number; width: number; height: number };

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (!url.startsWith('data:') && !url.startsWith('blob:')) image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('画像を読み込めませんでした。'));
    image.src = toCanvasSafeImageUrl(url);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(
    blob => blob ? resolve(blob) : reject(new Error('画像を生成できませんでした。')),
    'image/png',
  ));
}

export async function calculateAlphaBoundingBox(imageUrl: string): Promise<BoundingBox | undefined> {
  const image = await loadImage(imageUrl);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('画像を解析できませんでした。');
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let left = canvas.width;
  let top = canvas.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      if (pixels[(y * canvas.width + x) * 4 + 3] < 24) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  return right < left ? undefined : { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}

export async function composeRefinementOutput({
  transparentUrl,
  background,
  ratio,
  boundingBox,
  maxSide,
}: {
  transparentUrl: string;
  background: string | null;
  ratio: string;
  boundingBox?: BoundingBox;
  maxSide: number;
}): Promise<Blob> {
  const foreground = await loadImage(transparentUrl);
  const baseWidth = Math.min(1200, maxSide);
  let width = baseWidth;
  let height = baseWidth;
  if (ratio === 'original') {
    width = foreground.naturalWidth;
    height = foreground.naturalHeight;
  } else if (ratio === 'fit-subject' && boundingBox) {
    width = boundingBox.width;
    height = boundingBox.height;
  } else if (ratio === '16:9') {
    height = Math.round(width * 9 / 16);
  } else if (ratio === '4:3') {
    height = Math.round(width * 3 / 4);
  }
  const longest = Math.max(width, height);
  if (longest > maxSide) {
    const scale = maxSide / longest;
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('画像を生成できませんでした。');

  if (background?.startsWith('#')) {
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
  } else if (background) {
    const backgroundImage = await loadImage(background);
    const imageRatio = backgroundImage.naturalWidth / backgroundImage.naturalHeight;
    const canvasRatio = width / height;
    const sourceWidth = imageRatio > canvasRatio ? backgroundImage.naturalHeight * canvasRatio : backgroundImage.naturalWidth;
    const sourceHeight = imageRatio > canvasRatio ? backgroundImage.naturalHeight : backgroundImage.naturalWidth / canvasRatio;
    context.drawImage(
      backgroundImage,
      (backgroundImage.naturalWidth - sourceWidth) / 2,
      (backgroundImage.naturalHeight - sourceHeight) / 2,
      sourceWidth,
      sourceHeight,
      0,
      0,
      width,
      height,
    );
  }

  if (ratio === 'fit-subject' && boundingBox) {
    context.drawImage(foreground, boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height, 0, 0, width, height);
  } else {
    const padding = ratio === 'original' ? 0 : Math.min(100, Math.floor(Math.min(width, height) * 0.2));
    const scale = Math.min((width - padding) / foreground.naturalWidth, (height - padding) / foreground.naturalHeight);
    const drawWidth = foreground.naturalWidth * scale;
    const drawHeight = foreground.naturalHeight * scale;
    context.drawImage(foreground, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
  }
  return canvasToBlob(canvas);
}
